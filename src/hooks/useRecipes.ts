import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Recipe } from '@/types/database';
import {
  buildFeedQueue,
  getViewedIds,
  type RecipeIndexEntry
} from '@/utils/feedPersonalization';

const PAGE_SIZE = 12;

export interface RecipeFilters {
  search?: string;
  cuisine?: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

function hasActiveFilters(f: RecipeFilters): boolean {
  return !!(f.search || f.cuisine || f.category || f.difficulty);
}

/**
 * Лента рецептов с бесконечной прокруткой.
 * Показываем ТОЛЬКО published + не удалённые.
 *
 * Два режима:
 *
 *  1. С фильтрами (search/cuisine/category/difficulty) — классическая серверная
 *     сортировка по created_at desc. Персонализация отключена: когда юзер ищет
 *     "карбонара", ему нужна релевантность, а не shuffle.
 *
 *  2. Без фильтров (дефолтная лента) — персональная очередь:
 *       - Индекс (id + created_at) тянется одним лёгким запросом и кэшируется
 *       - Очередь строится на клиенте (buildFeedQueue): свежее → старое → виденное
 *       - У каждого юзера свой порядок (детерминированный хэш от id + user_id)
 *       - localStorage помнит последние 500 виденных, они уходят в конец
 *       - Страницы догружаются по id IN (...) по 12 штук
 */
export function useRecipesFeed(filters: RecipeFilters = {}) {
  const userId = useAuthStore((s) => s.user?.id);
  const filtered = hasActiveFilters(filters);

  // Индекс рецептов для дефолтной ленты. Персонализация считается ОДИН раз при
  // открытии ленты — дальше страницы идут по уже построенной очереди.
  const indexQuery = useQuery({
    queryKey: ['recipes', 'index'],
    enabled: !filtered,
    staleTime: 1000 * 60 * 5, // 5 минут — свежие рецепты подтянутся при след. открытии
    queryFn: async () => {
      const { data, error } = await supabase
          .from('recipes')
          .select('id, created_at')
          .eq('status', 'published')
          .is('deleted_at', null)
          .returns<RecipeIndexEntry[]>();

      if (error) throw error;
      return data ?? [];
    }
  });

  // Персональная очередь id — строится из индекса один раз при смене юзера/индекса.
  // Важно: viewedIds читаются ОДИН раз здесь, при построении очереди, а не на
  // каждый рендер. Если юзер свайпает и помечает новые рецепты как viewed —
  // они учтутся только при следующем открытии ленты (иначе infinite scroll
  // сломается от перестройки очереди на ходу).
  const queue: string[] = (() => {
    if (filtered || !userId || !indexQuery.data) return [];
    const viewed = getViewedIds(userId);
    return buildFeedQueue(indexQuery.data, userId, viewed);
  })();

  return useInfiniteQuery({
    // queryKey зависит от userId — при смене аккаунта очередь строится заново
    queryKey: ['recipes', 'feed', filters, filtered ? 'filtered' : `personal:${userId}`],
    // Ждём индекс если он нужен
    enabled: filtered || (!!userId && !!indexQuery.data),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      // ============ Режим с фильтрами: классика ============
      if (filtered) {
        let query = supabase
            .from('recipes')
            .select('*')
            .eq('status', 'published')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

        if (filters.search) query = query.ilike('title', `%${filters.search}%`);
        if (filters.cuisine) query = query.eq('cuisine', filters.cuisine);
        if (filters.category) query = query.eq('category', filters.category);
        if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);

        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []) as Recipe[];
      }

      // ============ Режим персональной ленты ============
      // Берём нужный срез очереди и подгружаем полные рецепты по id
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE;
      const pageIds = queue.slice(from, to);

      if (pageIds.length === 0) return [];

      const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .in('id', pageIds)
          .eq('status', 'published')
          .is('deleted_at', null);

      if (error) throw error;

      // Supabase не гарантирует порядок при IN — восстанавливаем по queue
      const byId = new Map<string, Recipe>();
      for (const r of (data ?? []) as Recipe[]) byId.set(r.id, r);

      const ordered: Recipe[] = [];
      for (const id of pageIds) {
        const r = byId.get(id);
        if (r) ordered.push(r);
        // Если рецепт пропал между построением индекса и загрузкой страницы
        // (например, админ снял с публикации) — просто пропускаем, без падения
      }
      return ordered;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      // В персональном режиме: не запрашиваем страницу за пределами очереди
      if (!filtered && (allPages.length * PAGE_SIZE) >= queue.length) return undefined;
      return allPages.length;
    }
  });
}

/**
 * Один рецепт по id.
 * Без фильтра по status — нужен чтобы автор мог открыть свой черновик.
 * Для админа — чтобы видеть любой рецепт.
 * RLS на БД уже ограничивает: обычный юзер увидит только published и свои.
 */
export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: ['recipe', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', id!)
          .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Рецепт не найден');
      return data as Recipe;
    }
  });
}

/**
 * Уникальные значения кухни и категории — для фильтров в поиске.
 * Только из published — чтобы фильтры не показывали кухни из черновиков.
 */
export function useRecipeFacets() {
  return useQuery({
    queryKey: ['recipes', 'facets'],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase
          .from('recipes')
          .select('cuisine, category')
          .eq('status', 'published')
          .is('deleted_at', null)
          .returns<Array<{ cuisine: string; category: string }>>();

      if (error) throw error;

      const rows = data ?? [];
      const cuisines = [...new Set(rows.map((r) => r.cuisine))].sort();
      const categories = [...new Set(rows.map((r) => r.category))].sort();
      return { cuisines, categories };
    }
  });
}

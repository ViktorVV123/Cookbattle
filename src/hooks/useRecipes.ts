import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import type { Recipe } from '@/types/database';

const PAGE_SIZE = 12;

export interface RecipeFilters {
  search?: string;
  cuisine?: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Лента рецептов с бесконечной прокруткой.
 * React Query сам кэширует страницы и умеет подгружать следующую.
 */
export function useRecipesFeed(filters: RecipeFilters = {}) {
  return useInfiniteQuery({
    queryKey: ['recipes', 'feed', filters],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let query = supabase
          .from('recipes')
          .select('*')
          .order('created_at', { ascending: false })
          .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (filters.search) {
        // ilike — регистронезависимый поиск по подстроке
        query = query.ilike('title', `%${filters.search}%`);
      }
      if (filters.cuisine) query = query.eq('cuisine', filters.cuisine);
      if (filters.category) query = query.eq('category', filters.category);
      if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Recipe[];
    },
    getNextPageParam: (lastPage, allPages) => {
      // Если последняя страница неполная — это конец
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length;
    }
  });
}

/**
 * Один рецепт по id.
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
 */
export function useRecipeFacets() {
  return useQuery({
    queryKey: ['recipes', 'facets'],
    staleTime: 1000 * 60 * 10, // 10 минут, эти данные редко меняются
    queryFn: async () => {
      const { data, error } = await supabase
          .from('recipes')
          .select('cuisine, category')
          .returns<Array<{ cuisine: string; category: string }>>();

      if (error) throw error;

      const rows = data ?? [];
      const cuisines = [...new Set(rows.map((r) => r.cuisine))].sort();
      const categories = [...new Set(rows.map((r) => r.category))].sort();
      return { cuisines, categories };
    }
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import type { CookSession, Recipe } from '@/types/database';

// Расширяем тип — добавляем связанный рецепт
export interface CookSessionWithRecipe extends CookSession {
  recipe: Pick<Recipe, 'id' | 'title' | 'image_url' | 'cuisine' | 'category'> | null;
}

/**
 * История приготовлений текущего юзера с присоединённой мета-инфой рецепта.
 * Для страницы профиля — вкладка "Приготовлено".
 */
export function useMyCookSessions() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['my_cook_sessions', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cook_sessions')
        .select('*, recipe:recipes(id, title, image_url, cuisine, category)')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .returns<CookSessionWithRecipe[]>();

      if (error) throw error;
      return data ?? [];
    }
  });
}

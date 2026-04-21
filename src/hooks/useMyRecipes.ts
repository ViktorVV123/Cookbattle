import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Recipe } from '@/types/database';

export interface MyRecipe extends Recipe {
  status: 'draft' | 'pending' | 'published' | 'rejected';
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
}

/**
 * Все рецепты текущего юзера, в любом статусе.
 * Для вкладки "Мои рецепты" в профиле.
 */
export function useMyRecipes() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['my_recipes', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('author_id', userId!)
        .order('created_at', { ascending: false })
        .returns<MyRecipe[]>();

      if (error) throw error;
      return data ?? [];
    }
  });
}

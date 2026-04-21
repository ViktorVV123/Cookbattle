import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Ingredient, RecipeStep, Difficulty } from '@/types/database';

export interface CreateRecipeInput {
  title: string;
  description: string;
  image_url: string | null;
  cuisine: string;
  category: string;
  difficulty: Difficulty;
  prep_time_min: number;
  cook_time_min: number;
  servings: number;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  tags: string[];
  ingredients: Ingredient[];
  steps: RecipeStep[];
}

/**
 * Создать черновик рецепта (статус 'draft').
 * Автор — текущий юзер.
 */
export function useCreateRecipe() {
  const userId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ input, submitForReview }: { input: CreateRecipeInput; submitForReview: boolean }) => {
      if (!userId) throw new Error('Не авторизован');

      const payload = {
        ...input,
        author_id: userId,
        status: submitForReview ? 'pending' : 'draft',
        submitted_at: submitForReview ? new Date().toISOString() : null,
        is_ai_generated: false
      };

      const { data, error } = await (supabase as any)
        .from('recipes')
        .insert(payload)
        .select('id')
        .single();

      if (error) throw new Error(error.message);
      return data.id as string;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipes', 'feed'] });
    }
  });
}

/**
 * Отправить уже существующий черновик на модерацию
 */
export function useSubmitForReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipeId: string) => {
      const { error } = await (supabase as any).rpc('submit_recipe_for_review', {
        p_recipe_id: recipeId
      });
      if (error) throw new Error(error.message);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_recipes'] });
    }
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/authStore';
import type { Recipe } from '@/types/database';

/**
 * Список id всех сохранённых рецептов текущего юзера.
 * Отдельно от полных данных, чтобы быстро проверять "сохранён ли этот рецепт".
 */
export function useSavedRecipeIds() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['saved_recipes', 'ids', userId],
    enabled: !!userId,
    staleTime: 1000 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_recipes')
        .select('recipe_id')
        .returns<Array<{ recipe_id: string }>>();

      if (error) throw error;
      return new Set((data ?? []).map((r) => r.recipe_id));
    }
  });
}

/**
 * Полные данные сохранённых рецептов — для страницы профиля.
 */
export function useSavedRecipes() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['saved_recipes', 'full', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_recipes')
        .select('recipe_id, created_at, recipes(*)')
        .order('created_at', { ascending: false })
        .returns<Array<{ recipe_id: string; created_at: string; recipes: Recipe }>>();

      if (error) throw error;
      return (data ?? []).map((r) => r.recipes);
    }
  });
}

/**
 * Toggle — если рецепт уже сохранён, удаляем. Иначе добавляем.
 * Используем optimistic update — UI реагирует мгновенно,
 * сетевой запрос идёт в фоне.
 */
export function useToggleSaved() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  return useMutation({
    mutationFn: async ({ recipeId, currentlySaved }: { recipeId: string; currentlySaved: boolean }) => {
      if (!userId) throw new Error('Не авторизован');

      if (currentlySaved) {
        const { error } = await supabase
          .from('saved_recipes')
          .delete()
          .eq('user_id', userId)
          .eq('recipe_id', recipeId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('saved_recipes')
          .insert({ user_id: userId, recipe_id: recipeId });
        if (error) throw error;
      }
      return { recipeId, nowSaved: !currentlySaved };
    },

    // Optimistic update — UI реагирует сразу, до ответа сервера
    onMutate: async ({ recipeId, currentlySaved }) => {
      await queryClient.cancelQueries({ queryKey: ['saved_recipes', 'ids', userId] });

      const previous = queryClient.getQueryData<Set<string>>(['saved_recipes', 'ids', userId]);

      queryClient.setQueryData<Set<string>>(['saved_recipes', 'ids', userId], (old) => {
        const next = new Set(old ?? []);
        if (currentlySaved) next.delete(recipeId);
        else next.add(recipeId);
        return next;
      });

      return { previous };
    },

    // Откат если запрос упал
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['saved_recipes', 'ids', userId], ctx.previous);
      }
    },

    // Инвалидируем полный список (для страницы профиля)
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['saved_recipes', 'full', userId] });
    }
  });
}

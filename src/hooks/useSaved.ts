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
 *
 * saved_recipes используется как лайк — счётчик likes_count на recipe
 * обновляется триггером sync_recipe_likes_count в БД (миграция 07).
 *
 * На клиенте делаем оптимистичный апдейт:
 *   1. Set savedIds — мгновенная реакция сердечка
 *   2. likes_count в кэше useRecipe(id) — мгновенная смена цифры
 *   3. feed-кэш не трогаем — счётчики подтянутся при инвалидации
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
            .insert({ user_id: userId, recipe_id: recipeId } as any);
        if (error) throw error;
      }
      return { recipeId, nowSaved: !currentlySaved };
    },

    // Optimistic update — UI реагирует сразу, до ответа сервера
    onMutate: async ({ recipeId, currentlySaved }) => {
      // 1. savedIds — для сердечка
      await queryClient.cancelQueries({ queryKey: ['saved_recipes', 'ids', userId] });
      const previousIds = queryClient.getQueryData<Set<string>>(['saved_recipes', 'ids', userId]);

      queryClient.setQueryData<Set<string>>(['saved_recipes', 'ids', userId], (old) => {
        const next = new Set(old ?? []);
        if (currentlySaved) next.delete(recipeId);
        else next.add(recipeId);
        return next;
      });

      // 2. likes_count на карточке рецепта (useRecipe)
      await queryClient.cancelQueries({ queryKey: ['recipe', recipeId] });
      const previousRecipe = queryClient.getQueryData<Recipe>(['recipe', recipeId]);

      if (previousRecipe) {
        queryClient.setQueryData<Recipe>(['recipe', recipeId], {
          ...previousRecipe,
          likes_count: Math.max(0, previousRecipe.likes_count + (currentlySaved ? -1 : 1))
        });
      }

      // 3. likes_count в ленте — проходимся по всем кэшам ленты и патчим
      //    рецепт inside pages. Это оптимально, чтобы цифра не прыгала до
      //    инвалидации.
      queryClient.setQueriesData<{ pages: Recipe[][]; pageParams: unknown[] } | undefined>(
          { queryKey: ['recipes', 'feed'] },
          (data) => {
            if (!data) return data;
            return {
              ...data,
              pages: data.pages.map((page) =>
                  page.map((r) =>
                      r.id === recipeId
                          ? { ...r, likes_count: Math.max(0, r.likes_count + (currentlySaved ? -1 : 1)) }
                          : r
                  )
              )
            };
          }
      );

      return { previousIds, previousRecipe };
    },

    // Откат если запрос упал
    onError: (_err, vars, ctx) => {
      if (ctx?.previousIds) {
        queryClient.setQueryData(['saved_recipes', 'ids', userId], ctx.previousIds);
      }
      if (ctx?.previousRecipe) {
        queryClient.setQueryData(['recipe', vars.recipeId], ctx.previousRecipe);
      }
      // Откатываем счётчики в ленте — проще всего инвалидировать
      queryClient.invalidateQueries({ queryKey: ['recipes', 'feed'] });
    },

    // Инвалидируем полный список (для страницы профиля)
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['saved_recipes', 'full', userId] });
    }
  });
}

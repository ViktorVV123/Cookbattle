import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import type { CookSession, Profile, Recipe } from '@/types/database';

export interface PublicProfile extends Pick<
    Profile,
    | 'id'
    | 'username'
    | 'display_name'
    | 'avatar_url'
    | 'level'
    | 'total_xp'
    | 'current_streak'
    | 'longest_streak'
    | 'dishes_cooked'
    | 'avg_ai_score'
    | 'created_at'
> {}

export interface PublicCookSession extends CookSession {
    recipe: Pick<Recipe, 'id' | 'title' | 'image_url' | 'cuisine' | 'category'> | null;
}

/**
 * Публичный профиль по username. Используется для /profile/:username.
 * Не тянем чувствительные поля (plan, is_admin, is_blocked).
 * RLS (profiles_select_all) разрешает чтение любому authenticated юзеру.
 */
export function usePublicProfile(username: string | undefined) {
    return useQuery({
        queryKey: ['public_profile', username],
        enabled: !!username,
        staleTime: 1000 * 60, // 1 мин — стрики/XP меняются, но не ежесекундно
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select(
                    'id, username, display_name, avatar_url, level, total_xp, current_streak, longest_streak, dishes_cooked, avg_ai_score, created_at'
                )
                .eq('username', username!)
                .maybeSingle<PublicProfile>();

            if (error) throw error;
            return data;
        }
    });
}

/**
 * История приготовлений юзера — для вкладки «Приготовлено» на публичном профиле.
 * Показываем только те где рецепт сейчас published (если автор снял рецепт с
 * публикации, старые сессии скрываем — такие правила бы для приватности).
 */
export function usePublicCookSessions(userId: string | undefined) {
    return useQuery({
        queryKey: ['public_cook_sessions', userId],
        enabled: !!userId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cook_sessions')
                .select('*, recipe:recipes!inner(id, title, image_url, cuisine, category, status, deleted_at)')
                .eq('user_id', userId!)
                .eq('recipe.status', 'published')
                .is('recipe.deleted_at', null)
                .order('created_at', { ascending: false })
                .returns<PublicCookSession[]>();

            if (error) throw error;
            return data ?? [];
        }
    });
}

/**
 * Рецепты, созданные этим юзером — только published.
 * Черновики/pending/rejected — приватные, их видит только автор и админы.
 */
export function usePublicRecipes(userId: string | undefined) {
    return useQuery({
        queryKey: ['public_recipes', userId],
        enabled: !!userId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('recipes')
                .select('*')
                .eq('author_id', userId!)
                .eq('status', 'published')
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .returns<Recipe[]>();

            if (error) throw error;
            return data ?? [];
        }
    });
}

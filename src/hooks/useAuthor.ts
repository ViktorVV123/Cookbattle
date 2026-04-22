import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import type { Profile } from '@/types/database';

/**
 * Публичные поля автора, которые мы показываем в UI.
 * Не тянем email, plan, is_admin — для авторства нужно только отображение.
 */
export type AuthorPreview = Pick<
    Profile,
    'id' | 'username' | 'display_name' | 'avatar_url' | 'level' | 'total_xp' | 'dishes_cooked'
>;

/**
 * Загружает профиль автора рецепта по id.
 * Кэшируется надолго (5 мин) — профили меняются редко, один автор может
 * светиться в ленте десятки раз, пере-фетчить смысла нет.
 *
 * Возвращает null если authorId = null (для засиженных рецептов без автора)
 * — запрос не отправляется.
 *
 * RLS на profiles: profiles_select_all даёт SELECT всем authenticated юзерам,
 * так что любой залогиненный может прочитать любой профиль.
 */
export function useAuthor(authorId: string | null | undefined) {
    return useQuery({
        queryKey: ['author', authorId],
        enabled: !!authorId,
        staleTime: 1000 * 60 * 5,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url, level, total_xp, dishes_cooked')
                .eq('id', authorId!)
                .maybeSingle<AuthorPreview>();

            if (error) throw error;
            return data;
        }
    });
}

/**
 * Загружает всех авторов пачкой по списку id. Для ленты эффективнее чем
 * отдельные запросы на каждый рецепт — один IN-запрос вместо 12 параллельных.
 *
 * Пока не используется — FeedCard вызывает useAuthor на каждую карточку
 * (их 12 в странице), React Query дедуплицирует повторные id автоматически.
 * Если авторы начнут повторяться редко — можно переключиться на этот хук.
 */
export function useAuthorsBatch(authorIds: string[]) {
    const uniqueIds = [...new Set(authorIds.filter(Boolean))];

    return useQuery({
        queryKey: ['authors_batch', [...uniqueIds].sort()],
        enabled: uniqueIds.length > 0,
        staleTime: 1000 * 60 * 5,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url, level, total_xp, dishes_cooked')
                .in('id', uniqueIds)
                .returns<AuthorPreview[]>();

            if (error) throw error;

            // Возвращаем Map id → author для удобного доступа
            const map = new Map<string, AuthorPreview>();
            for (const a of data ?? []) map.set(a.id, a);
            return map;
        }
    });
}

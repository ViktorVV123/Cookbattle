-- ==========================================================
-- CookBattle — 02_rls_policies
-- Row Level Security: кто что видит и может менять.
-- ==========================================================

alter table profiles enable row level security;
alter table recipes enable row level security;
alter table cook_sessions enable row level security;
alter table achievements enable row level security;
alter table user_achievements enable row level security;
alter table challenges enable row level security;
alter table user_challenges enable row level security;
alter table friendships enable row level security;
alter table feed_likes enable row level security;
alter table feed_comments enable row level security;
alter table saved_recipes enable row level security;

-- ========== PROFILES ==========
-- Читать — все залогиненные (нужно для ленты друзей, профилей, leaderboard).
-- Обновлять — только свой.
create policy "profiles_select_all"
  on profiles for select
  using (auth.role() = 'authenticated');

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- insert делается триггером handle_new_user под security definer — политика не нужна.

-- ========== RECIPES ==========
-- Читать — все залогиненные.
-- Создавать — залогиненный юзер (author_id = self, либо null для AI-сида — но сид идёт через service role, игнорит RLS).
-- Обновлять/удалять — только автор.
create policy "recipes_select_all"
  on recipes for select
  using (auth.role() = 'authenticated');

create policy "recipes_insert_self"
  on recipes for insert
  with check (auth.uid() = author_id);

create policy "recipes_update_own"
  on recipes for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "recipes_delete_own"
  on recipes for delete
  using (auth.uid() = author_id);

-- ========== COOK SESSIONS ==========
-- Видны: свои + сессии друзей (accepted) + публичные (пока все accepted = публичные в рамках приложения).
-- Для MVP упрощаем: видны свои + любых юзеров (лента = глобальная с фильтром friends на фронте).
-- Когда социалка разрастётся, добавим приватность.
create policy "cook_sessions_select_all"
  on cook_sessions for select
  using (auth.role() = 'authenticated');

create policy "cook_sessions_insert_self"
  on cook_sessions for insert
  with check (auth.uid() = user_id);

create policy "cook_sessions_update_own"
  on cook_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "cook_sessions_delete_own"
  on cook_sessions for delete
  using (auth.uid() = user_id);

-- ========== ACHIEVEMENTS (справочник) ==========
-- Читать все, писать только через service role.
create policy "achievements_select_all"
  on achievements for select
  using (auth.role() = 'authenticated');

-- ========== USER ACHIEVEMENTS ==========
-- Читать все (для показа в чужих профилях).
-- Вставка идёт через Edge Function под service role — клиент напрямую не пишет.
create policy "user_achievements_select_all"
  on user_achievements for select
  using (auth.role() = 'authenticated');

-- ========== CHALLENGES ==========
create policy "challenges_select_all"
  on challenges for select
  using (auth.role() = 'authenticated');

-- ========== USER CHALLENGES ==========
create policy "user_challenges_select_own"
  on user_challenges for select
  using (auth.uid() = user_id);

-- Запись — через Edge Function под service role.

-- ========== FRIENDSHIPS ==========
-- Видит обе стороны. Инициирует — только от своего имени.
create policy "friendships_select_both_sides"
  on friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "friendships_insert_self"
  on friendships for insert
  with check (auth.uid() = user_id);

-- Принять/отклонить может только получатель; отменить — инициатор.
create policy "friendships_update_friend"
  on friendships for update
  using (auth.uid() = friend_id)
  with check (auth.uid() = friend_id);

create policy "friendships_delete_either"
  on friendships for delete
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- ========== FEED LIKES ==========
create policy "feed_likes_select_all"
  on feed_likes for select
  using (auth.role() = 'authenticated');

create policy "feed_likes_insert_self"
  on feed_likes for insert
  with check (auth.uid() = user_id);

create policy "feed_likes_delete_own"
  on feed_likes for delete
  using (auth.uid() = user_id);

-- ========== FEED COMMENTS ==========
create policy "feed_comments_select_all"
  on feed_comments for select
  using (auth.role() = 'authenticated');

create policy "feed_comments_insert_self"
  on feed_comments for insert
  with check (auth.uid() = user_id);

create policy "feed_comments_delete_own"
  on feed_comments for delete
  using (auth.uid() = user_id);

-- ========== SAVED RECIPES ==========
create policy "saved_recipes_select_own"
  on saved_recipes for select
  using (auth.uid() = user_id);

create policy "saved_recipes_insert_self"
  on saved_recipes for insert
  with check (auth.uid() = user_id);

create policy "saved_recipes_delete_own"
  on saved_recipes for delete
  using (auth.uid() = user_id);

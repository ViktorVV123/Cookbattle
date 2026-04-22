-- ============================================================
-- CookBattle Migration 06 — Admin panel
-- Добавляем:
--  - soft delete для recipes (deleted_at)
--  - is_blocked для profiles
--  - RPC: admin_delete_recipe, admin_unpublish_recipe, admin_restore_recipe
--  - RPC: admin_block_user, admin_unblock_user, admin_toggle_admin
--  - View: admin_users_stats (юзеры с агрегированной статистикой)
--  - View: admin_dashboard_stats (общая статистика)
-- ============================================================

-- ========== 1. Soft delete на recipes ==========
alter table recipes
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references profiles(id) on delete set null;

create index if not exists idx_recipes_not_deleted on recipes(deleted_at) where deleted_at is null;

-- ========== 2. Блокировка юзеров ==========
alter table profiles
  add column if not exists is_blocked boolean not null default false,
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_by uuid references profiles(id) on delete set null,
  add column if not exists block_reason text;

-- ========== 3. Обновляем RLS: скрываем deleted рецепты ==========
drop policy if exists "recipes_select_policy" on recipes;

create policy "recipes_select_policy" on recipes
  for select using (
    -- published и не удалённые — видят все
    (status = 'published' and deleted_at is null)
    -- свои в любом статусе — видит автор
    or author_id = auth.uid()
    -- админ видит ВСЁ (включая удалённые)
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- ========== 4. RPC: удалить рецепт (soft) ==========
create or replace function admin_delete_recipe(p_recipe_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Только админ
  if not exists (select 1 from profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Только админ';
  end if;

  update recipes
  set deleted_at = now(),
      deleted_by = auth.uid()
  where id = p_recipe_id;
end;
$$;

-- ========== 5. RPC: восстановить рецепт ==========
create or replace function admin_restore_recipe(p_recipe_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Только админ';
  end if;

  update recipes
  set deleted_at = null,
      deleted_by = null
  where id = p_recipe_id;
end;
$$;

-- ========== 6. RPC: снять с публикации (published → rejected) ==========
create or replace function admin_unpublish_recipe(p_recipe_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Только админ';
  end if;

  if p_reason is null or trim(p_reason) = '' then
    raise exception 'Нужна причина';
  end if;

  update recipes
  set status = 'rejected',
      rejection_reason = p_reason,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = p_recipe_id and status = 'published';

  if not found then
    raise exception 'Рецепт не в статусе published';
  end if;
end;
$$;

-- ========== 7. RPC: заблокировать юзера ==========
create or replace function admin_block_user(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Только админ';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Нельзя заблокировать самого себя';
  end if;

  -- Блокируем юзера
  update profiles
  set is_blocked = true,
      blocked_at = now(),
      blocked_by = auth.uid(),
      block_reason = coalesce(p_reason, 'Нарушение правил')
  where id = p_user_id;

  -- Снимаем все его published рецепты
  update recipes
  set status = 'rejected',
      rejection_reason = 'Автор заблокирован',
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where author_id = p_user_id and status in ('published', 'pending');
end;
$$;

-- ========== 8. RPC: разблокировать ==========
create or replace function admin_unblock_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Только админ';
  end if;

  update profiles
  set is_blocked = false,
      blocked_at = null,
      blocked_by = null,
      block_reason = null
  where id = p_user_id;
end;
$$;

-- ========== 9. RPC: дать/убрать права админа ==========
create or replace function admin_toggle_admin(p_user_id uuid, p_is_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Только админ';
  end if;

  if p_user_id = auth.uid() and p_is_admin = false then
    raise exception 'Нельзя убрать права у самого себя';
  end if;

  update profiles set is_admin = p_is_admin where id = p_user_id;
end;
$$;

-- ========== 10. View: юзеры с почтой и статистикой ==========
-- Из profiles + auth.users получаем email.
-- Access: только админ (проверяется в RPC ниже).
create or replace view admin_users_view as
select
  p.id,
  p.username,
  p.display_name,
  p.avatar_url,
  p.level,
  p.total_xp,
  p.current_streak,
  p.longest_streak,
  p.dishes_cooked,
  p.avg_ai_score,
  p.is_admin,
  p.is_blocked,
  p.blocked_at,
  p.block_reason,
  p.created_at,
  u.email,
  u.last_sign_in_at,
  (select count(*) from recipes where author_id = p.id and deleted_at is null) as recipes_count,
  (select count(*) from cook_sessions where user_id = p.id) as cook_sessions_count
from profiles p
join auth.users u on u.id = p.id;

-- RPC чтобы админ мог получить данные из view
create or replace function admin_list_users()
returns setof admin_users_view
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Только админ';
  end if;

  return query select * from admin_users_view order by created_at desc;
end;
$$;

-- ========== 11. RPC для дашборда ==========
create or replace function admin_dashboard_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Только админ';
  end if;

  select json_build_object(
    'users_total', (select count(*) from profiles),
    'users_blocked', (select count(*) from profiles where is_blocked),
    'users_admins', (select count(*) from profiles where is_admin),
    'users_active_24h', (select count(distinct user_id) from cook_sessions where created_at > now() - interval '24 hours'),
    'users_new_7d', (select count(*) from profiles where created_at > now() - interval '7 days'),

    'recipes_total', (select count(*) from recipes where deleted_at is null),
    'recipes_published', (select count(*) from recipes where status = 'published' and deleted_at is null),
    'recipes_pending', (select count(*) from recipes where status = 'pending' and deleted_at is null),
    'recipes_rejected', (select count(*) from recipes where status = 'rejected' and deleted_at is null),
    'recipes_ugc', (select count(*) from recipes where status = 'published' and deleted_at is null and author_id is not null),
    'recipes_deleted', (select count(*) from recipes where deleted_at is not null),

    'sessions_total', (select count(*) from cook_sessions),
    'sessions_24h', (select count(*) from cook_sessions where created_at > now() - interval '24 hours'),
    'sessions_7d', (select count(*) from cook_sessions where created_at > now() - interval '7 days'),
    'avg_score', (select round(avg(ai_score)::numeric, 2) from cook_sessions),

    'registrations_chart', (
      select json_agg(json_build_object('date', date, 'count', count) order by date)
      from (
        select date_trunc('day', created_at)::date as date, count(*)::int as count
        from profiles
        where created_at > now() - interval '30 days'
        group by 1
      ) t
    ),
    'sessions_chart', (
      select json_agg(json_build_object('date', date, 'count', count) order by date)
      from (
        select date_trunc('day', created_at)::date as date, count(*)::int as count
        from cook_sessions
        where created_at > now() - interval '30 days'
        group by 1
      ) t
    )
  ) into result;

  return result;
end;
$$;

-- ========== 12. Триггер: при входе проверяем что не blocked ==========
-- Из Supabase нельзя напрямую блокировать логин на уровне БД,
-- но RLS не даст заблокированному юзеру ничего делать:
-- добавим политику "can_use_app" на всё что проверяет блокировку
-- (сделаем через refetch profile — если is_blocked=true, клиент force logout).
-- Реализуем на клиенте через authStore.

-- ========== 13. Проверка ==========
select
  'recipes' as table_name,
  count(*) as total,
  count(*) filter (where deleted_at is null) as active,
  count(*) filter (where deleted_at is not null) as deleted
from recipes
union all
select
  'profiles' as table_name,
  count(*) as total,
  count(*) filter (where is_blocked = false) as active,
  count(*) filter (where is_blocked = true) as blocked
from profiles;

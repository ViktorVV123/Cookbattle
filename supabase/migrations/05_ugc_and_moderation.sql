-- ============================================================
-- CookBattle Migration 05 — UGC & Moderation
-- Добавляем:
--  - status у recipes (draft | pending | published | rejected)
--  - fields для модерации
--  - is_admin у profiles
--  - RLS-политики: в общую ленту попадают только published
-- ============================================================

-- ========== 1. Status + moderation fields ==========
alter table recipes
  add column if not exists status text not null default 'published'
    check (status in ('draft', 'pending', 'published', 'rejected')),
  add column if not exists rejection_reason text,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references profiles(id) on delete set null;

-- Существующие рецепты (которые мы сидили) — уже published, default сработает
-- Но на всякий случай убедимся:
update recipes set status = 'published' where status is null;

-- Индекс для быстрой выборки published (основной case)
create index if not exists idx_recipes_status on recipes(status);
create index if not exists idx_recipes_pending on recipes(submitted_at) where status = 'pending';

-- ========== 2. Admin role ==========
alter table profiles
  add column if not exists is_admin boolean not null default false;

-- ========== 3. RLS политики ==========

-- Сначала удаляем старые политики select на recipes чтобы переписать
drop policy if exists "Recipes are viewable by everyone" on recipes;
drop policy if exists "recipes_select_all" on recipes;
drop policy if exists "recipes_public_select" on recipes;

-- Новая политика: published видны всем, свои видишь в любом статусе, админ видит всё
create policy "recipes_select_policy" on recipes
  for select using (
    status = 'published'
    or author_id = auth.uid()
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- Insert: залогиненные юзеры могут создавать свои рецепты (только как draft или pending)
drop policy if exists "Recipes can be inserted by authenticated" on recipes;
drop policy if exists "recipes_insert_own" on recipes;

create policy "recipes_insert_own" on recipes
  for insert with check (
    auth.uid() = author_id
    and status in ('draft', 'pending')
  );

-- Update: автор может обновлять свои draft/pending (но не после одобрения/отклонения), админ — любой
drop policy if exists "Recipes can be updated by author" on recipes;
drop policy if exists "recipes_update_own" on recipes;

create policy "recipes_update_policy" on recipes
  for update using (
    (author_id = auth.uid() and status in ('draft', 'pending'))
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- Delete: автор может удалять свои рецепты пока они не published, админ — любые
drop policy if exists "Recipes can be deleted by author" on recipes;
drop policy if exists "recipes_delete_own" on recipes;

create policy "recipes_delete_policy" on recipes
  for delete using (
    (author_id = auth.uid() and status in ('draft', 'pending', 'rejected'))
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- ========== 4. Storage bucket для фото UGC ==========
-- Используем отдельный bucket 'recipes' для обложек и фото шагов рецептов
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values (
  'recipes',
  'recipes',
  true,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif'],
  5 * 1024 * 1024  -- 5MB макс на файл
)
on conflict (id) do update set
  allowed_mime_types = excluded.allowed_mime_types,
  file_size_limit = excluded.file_size_limit;

-- RLS для recipes bucket
drop policy if exists "Recipe images are public" on storage.objects;
drop policy if exists "Users can upload to their recipe folder" on storage.objects;
drop policy if exists "Users can delete own recipe images" on storage.objects;

create policy "Recipe images are public"
  on storage.objects for select
  using (bucket_id = 'recipes');

create policy "Users can upload to their recipe folder"
  on storage.objects for insert
  with check (
    bucket_id = 'recipes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own recipe images"
  on storage.objects for delete
  using (
    bucket_id = 'recipes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ========== 5. Функция: отправить на модерацию ==========
-- Вызывается юзером через RPC. Меняет статус draft → pending + проставляет submitted_at.
create or replace function submit_recipe_for_review(p_recipe_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipe recipes;
begin
  select * into v_recipe from recipes where id = p_recipe_id;

  if not found then
    raise exception 'Рецепт не найден';
  end if;

  if v_recipe.author_id != auth.uid() then
    raise exception 'Это не твой рецепт';
  end if;

  if v_recipe.status != 'draft' then
    raise exception 'Можно отправить только черновик';
  end if;

  update recipes
  set status = 'pending',
      submitted_at = now()
  where id = p_recipe_id;
end;
$$;

-- ========== 6. Функция для админа: одобрить ==========
create or replace function approve_recipe(p_recipe_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Только админ может одобрять';
  end if;

  update recipes
  set status = 'published',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      rejection_reason = null
  where id = p_recipe_id and status = 'pending';

  if not found then
    raise exception 'Рецепт не в статусе pending';
  end if;
end;
$$;

-- ========== 7. Функция для админа: отклонить ==========
create or replace function reject_recipe(p_recipe_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Только админ может отклонять';
  end if;

  if p_reason is null or trim(p_reason) = '' then
    raise exception 'Нужна причина отклонения';
  end if;

  update recipes
  set status = 'rejected',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      rejection_reason = p_reason
  where id = p_recipe_id and status = 'pending';

  if not found then
    raise exception 'Рецепт не в статусе pending';
  end if;
end;
$$;

-- ========== 8. Сделаем тебя админом ==========
-- ПРИМЕЧАНИЕ: замени 'viasjukviktr@gmail.com' на свой email если другой
update profiles
set is_admin = true
where id in (
  select id from auth.users where email = 'viasjukviktr@gmail.com'
);

-- Проверка
select email, is_admin from profiles
join auth.users on auth.users.id = profiles.id
where is_admin = true;

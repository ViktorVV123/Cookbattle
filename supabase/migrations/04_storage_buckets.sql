-- ==========================================================
-- CookBattle — 04_storage_buckets
-- Buckets для фото блюд и аватаров.
-- ==========================================================

-- Bucket для фото приготовленных блюд
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dishes',
  'dishes',
  true, -- публичный, чтобы легко рендерить без signed URL
  5 * 1024 * 1024, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- Bucket для аватаров
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2 * 1024 * 1024, -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Bucket для фото рецептов (используется при загрузке своих рецептов — v2)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recipes',
  'recipes',
  true,
  5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Политики Storage:
-- dishes/{user_id}/{filename} — пишет только владелец папки.
create policy "dishes_upload_own_folder"
  on storage.objects for insert
  with check (
    bucket_id = 'dishes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "dishes_read_all"
  on storage.objects for select
  using (bucket_id = 'dishes');

create policy "dishes_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'dishes'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- avatars/{user_id}/avatar.*
create policy "avatars_upload_own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_update_own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "avatars_read_all"
  on storage.objects for select
  using (bucket_id = 'avatars');

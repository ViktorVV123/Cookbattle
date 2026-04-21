-- ==========================================================
-- CookBattle — 01_init_schema
-- Базовая схема БД. Все таблицы + RLS + триггеры.
-- ==========================================================

-- ========== ENUMS ==========
create type user_level as enum ('novice', 'amateur', 'advanced', 'chef', 'master_chef');
create type difficulty as enum ('easy', 'medium', 'hard');
create type plan_type as enum ('free', 'pro', 'family');
create type friendship_status as enum ('pending', 'accepted');

-- ========== PROFILES ==========
-- Расширение auth.users. id = auth.users.id
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  level user_level not null default 'novice',
  total_xp int not null default 0,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_cooked_at timestamptz,
  dishes_cooked int not null default 0,
  avg_ai_score float,
  plan plan_type not null default 'free',
  created_at timestamptz not null default now()
);

create index idx_profiles_username on profiles(username);
create index idx_profiles_xp on profiles(total_xp desc);

-- Автосоздание profile при регистрации юзера
-- username генерим из email-части до @, с суффиксом если коллизия
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  counter int := 0;
begin
  base_username := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '', 'g'));
  if length(base_username) < 3 then
    base_username := 'chef_' || substr(new.id::text, 1, 6);
  end if;
  final_username := base_username;

  while exists (select 1 from profiles where username = final_username) loop
    counter := counter + 1;
    final_username := base_username || counter::text;
  end loop;

  insert into profiles (id, username, display_name)
  values (new.id, final_username, coalesce(new.raw_user_meta_data->>'display_name', final_username));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ========== RECIPES ==========
create table recipes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id) on delete set null,
  title text not null,
  description text not null default '',
  image_url text,
  cuisine text not null,
  category text not null,
  difficulty difficulty not null,
  prep_time_min int not null default 0,
  cook_time_min int not null default 0,
  servings int not null default 2,
  calories int,
  protein float,
  fat float,
  carbs float,
  tags text[] not null default '{}',
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  is_ai_generated boolean not null default false,
  likes_count int not null default 0,
  cooked_count int not null default 0,
  avg_presentation_score float,
  created_at timestamptz not null default now()
);

create index idx_recipes_cuisine on recipes(cuisine);
create index idx_recipes_category on recipes(category);
create index idx_recipes_difficulty on recipes(difficulty);
create index idx_recipes_created on recipes(created_at desc);
create index idx_recipes_tags on recipes using gin(tags);

-- ========== COOK SESSIONS ==========
create table cook_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  photo_url text not null,
  ai_score int not null check (ai_score between 1 and 10),
  ai_comment text not null,
  xp_earned int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_cook_sessions_user on cook_sessions(user_id, created_at desc);
create index idx_cook_sessions_recipe on cook_sessions(recipe_id);
create index idx_cook_sessions_created on cook_sessions(created_at desc);

-- ========== ACHIEVEMENTS (справочник) ==========
create table achievements (
  id text primary key,
  title text not null,
  description text not null,
  icon text not null default '🏆',
  xp_reward int not null default 50,
  condition jsonb not null
);

create table user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  achievement_id text not null references achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create index idx_user_achievements_user on user_achievements(user_id);

-- ========== CHALLENGES ==========
create table challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  start_date date not null,
  end_date date not null,
  condition jsonb not null,
  xp_reward int not null default 200,
  is_active boolean not null default true
);

create table user_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  challenge_id uuid not null references challenges(id) on delete cascade,
  progress int not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (user_id, challenge_id)
);

create index idx_user_challenges_user on user_challenges(user_id);

-- ========== FRIENDSHIPS ==========
create table friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  friend_id uuid not null references profiles(id) on delete cascade,
  status friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  check (user_id <> friend_id),
  unique (user_id, friend_id)
);

create index idx_friendships_user on friendships(user_id, status);
create index idx_friendships_friend on friendships(friend_id, status);

-- ========== SOCIAL ==========
create table feed_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  cook_session_id uuid not null references cook_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, cook_session_id)
);

create index idx_feed_likes_session on feed_likes(cook_session_id);

create table feed_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  cook_session_id uuid not null references cook_sessions(id) on delete cascade,
  text text not null check (length(text) between 1 and 500),
  created_at timestamptz not null default now()
);

create index idx_feed_comments_session on feed_comments(cook_session_id, created_at desc);

-- ========== SAVED RECIPES ==========
create table saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

create index idx_saved_recipes_user on saved_recipes(user_id, created_at desc);

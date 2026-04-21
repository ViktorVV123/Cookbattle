-- ==========================================================
-- CookBattle — 03_functions_and_triggers
-- Бизнес-логика в БД: XP, streak, уровни, ачивки, счётчики.
-- ==========================================================

-- ========== Обновление уровня по XP ==========
create or replace function calc_level(xp int)
returns user_level
language sql
immutable
as $$
  select case
    when xp < 100 then 'novice'::user_level
    when xp < 500 then 'amateur'::user_level
    when xp < 2000 then 'advanced'::user_level
    when xp < 5000 then 'chef'::user_level
    else 'master_chef'::user_level
  end;
$$;

-- ========== XP за рецепт по сложности + бонус за AI-score ==========
create or replace function calc_xp_reward(p_difficulty difficulty, p_ai_score int)
returns int
language sql
immutable
as $$
  select
    case p_difficulty
      when 'easy' then 10
      when 'medium' then 25
      when 'hard' then 50
    end
    + case
        when p_ai_score >= 9 then 20
        when p_ai_score >= 7 then 10
        when p_ai_score >= 5 then 5
        else 0
      end;
$$;

-- ========== Главная RPC: запись сессии приготовления ==========
-- Одной транзакцией: вставляет cook_session, обновляет profile (XP, streak, level,
-- dishes_cooked, avg_ai_score, last_cooked_at), проверяет ачивки.
-- Возвращает JSON с новыми XP, ачивками, уровнем для фронта.
create or replace function record_cook_session(
  p_recipe_id uuid,
  p_photo_url text,
  p_ai_score int,
  p_ai_comment text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_recipe recipes%rowtype;
  v_profile profiles%rowtype;
  v_xp_reward int;
  v_new_streak int;
  v_prev_level user_level;
  v_new_level user_level;
  v_session_id uuid;
  v_new_achievements jsonb := '[]'::jsonb;
  v_ach record;
begin
  if v_user_id is null then
    raise exception 'Не авторизован';
  end if;

  select * into v_recipe from recipes where id = p_recipe_id;
  if not found then
    raise exception 'Рецепт не найден';
  end if;

  select * into v_profile from profiles where id = v_user_id for update;

  -- XP
  v_xp_reward := calc_xp_reward(v_recipe.difficulty, p_ai_score);

  -- Streak: если last_cooked_at был вчера — +1, сегодня — не трогаем, иначе — сброс на 1
  if v_profile.last_cooked_at is null
     or v_profile.last_cooked_at::date < current_date - 1 then
    v_new_streak := 1;
  elsif v_profile.last_cooked_at::date = current_date - 1 then
    v_new_streak := v_profile.current_streak + 1;
  else
    v_new_streak := v_profile.current_streak; -- уже готовили сегодня
  end if;

  v_prev_level := v_profile.level;
  v_new_level := calc_level(v_profile.total_xp + v_xp_reward);

  -- Пишем сессию
  insert into cook_sessions (user_id, recipe_id, photo_url, ai_score, ai_comment, xp_earned)
  values (v_user_id, p_recipe_id, p_photo_url, p_ai_score, p_ai_comment, v_xp_reward)
  returning id into v_session_id;

  -- Обновляем профиль
  update profiles set
    total_xp = total_xp + v_xp_reward,
    level = v_new_level,
    current_streak = v_new_streak,
    longest_streak = greatest(longest_streak, v_new_streak),
    last_cooked_at = now(),
    dishes_cooked = dishes_cooked + 1,
    avg_ai_score = (
      select avg(ai_score)::float from cook_sessions where user_id = v_user_id
    )
  where id = v_user_id;

  -- Проверяем ачивки
  for v_ach in
    select a.id, a.xp_reward from achievements a
    where not exists (
      select 1 from user_achievements ua
      where ua.user_id = v_user_id and ua.achievement_id = a.id
    )
    and check_achievement_condition(v_user_id, a.condition)
  loop
    insert into user_achievements (user_id, achievement_id)
    values (v_user_id, v_ach.id);

    update profiles set total_xp = total_xp + v_ach.xp_reward where id = v_user_id;

    v_new_achievements := v_new_achievements || jsonb_build_object('id', v_ach.id, 'xp', v_ach.xp_reward);
  end loop;

  -- Обновляем cooked_count рецепта и avg_presentation_score
  update recipes set
    cooked_count = cooked_count + 1,
    avg_presentation_score = (
      select avg(ai_score)::float from cook_sessions where recipe_id = p_recipe_id
    )
  where id = p_recipe_id;

  return jsonb_build_object(
    'session_id', v_session_id,
    'xp_earned', v_xp_reward,
    'new_streak', v_new_streak,
    'level_up', v_prev_level <> v_new_level,
    'new_level', v_new_level,
    'new_achievements', v_new_achievements
  );
end;
$$;

-- ========== Проверка условия ачивки ==========
-- condition формат: {"type": "dishes_cooked", "value": 10}
--                   {"type": "streak", "value": 7}
--                   {"type": "cuisines", "value": 5}       -- сколько разных кухонь
--                   {"type": "high_score", "value": 9}     -- получил score >= N хотя бы раз
--                   {"type": "categories", "value": 3}     -- N разных категорий
create or replace function check_achievement_condition(
  p_user_id uuid,
  p_condition jsonb
)
returns boolean
language plpgsql
stable
as $$
declare
  v_type text := p_condition->>'type';
  v_value int := (p_condition->>'value')::int;
  v_profile profiles%rowtype;
begin
  select * into v_profile from profiles where id = p_user_id;

  case v_type
    when 'dishes_cooked' then
      return v_profile.dishes_cooked >= v_value;
    when 'streak' then
      return v_profile.longest_streak >= v_value;
    when 'high_score' then
      return exists (
        select 1 from cook_sessions
        where user_id = p_user_id and ai_score >= v_value
      );
    when 'cuisines' then
      return (
        select count(distinct r.cuisine)
        from cook_sessions cs join recipes r on r.id = cs.recipe_id
        where cs.user_id = p_user_id
      ) >= v_value;
    when 'categories' then
      return (
        select count(distinct r.category)
        from cook_sessions cs join recipes r on r.id = cs.recipe_id
        where cs.user_id = p_user_id
      ) >= v_value;
    else
      return false;
  end case;
end;
$$;

-- ========== Счётчики лайков через триггеры ==========
create or replace function bump_likes_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update cook_sessions set -- используем отдельную таблицу likes_count? нет, на сессии нет такого поля
    -- ok, для MVP лайки считаем в select с count(). Если будет горячо — добавим колонку.
    -- оставляю триггер-заглушку как reminder.
    id = id where id = new.cook_session_id;
  end if;
  return null;
end;
$$;
-- реальный триггер не вешаем — решили считать лайки on-the-fly. Упростили.

-- ========== Сид ачивок ==========
insert into achievements (id, title, description, icon, xp_reward, condition) values
  ('first_dish', 'Первый блин', 'Приготовил первое блюдо', '🥞', 25, '{"type":"dishes_cooked","value":1}'),
  ('dishes_10', 'Разогрелся', 'Приготовил 10 блюд', '🔥', 100, '{"type":"dishes_cooked","value":10}'),
  ('dishes_50', 'Готовишь серьёзно', '50 блюд позади', '👨‍🍳', 300, '{"type":"dishes_cooked","value":50}'),
  ('streak_3', 'Три дня подряд', 'Готовишь 3 дня подряд', '📅', 50, '{"type":"streak","value":3}'),
  ('streak_7', 'Неделя в деле', 'Streak 7 дней', '⚡', 150, '{"type":"streak","value":7}'),
  ('streak_30', 'Режим шефа', 'Streak 30 дней', '💎', 500, '{"type":"streak","value":30}'),
  ('perfect_10', 'Идеальная подача', 'Получил оценку 10 от AI', '✨', 200, '{"type":"high_score","value":10}'),
  ('cuisines_5', 'Гурман', '5 разных кухонь мира', '🌍', 150, '{"type":"cuisines","value":5}'),
  ('cuisines_10', 'Космополит', '10 разных кухонь мира', '🧭', 400, '{"type":"cuisines","value":10}'),
  ('categories_5', 'Универсал', '5 разных категорий блюд', '🍽️', 150, '{"type":"categories","value":5}')
on conflict (id) do nothing;

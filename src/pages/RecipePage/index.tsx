import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import styles from './RecipePage.module.scss';
import {useRecipe} from "@/hooks/useRecipes.ts";
import { AuthorLine } from '@/components/recipe/AuthorLine';
import { useSavedRecipeIds, useToggleSaved } from '@/hooks/useSaved';
import { HeartIcon, HeartFilledIcon } from '@/components/icons/ActionIcons';
import { formatCount } from '@/utils/formatCount';

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Легко',
  medium: 'Средне',
  hard: 'Сложно'
};

export function RecipePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: recipe, isLoading, isError } = useRecipe(id);

  const { data: savedIds } = useSavedRecipeIds();
  const toggleSaved = useToggleSaved();
  const isSaved = recipe ? (savedIds?.has(recipe.id) ?? false) : false;

  // Текущее количество порций. Базовое — recipe.servings. Юзер может крутить +/-.
  const [servings, setServings] = useState<number | null>(null);

  if (isLoading) {
    return (
        <div className={styles.loading}>
          <div className={styles.spinner} />
        </div>
    );
  }

  if (isError || !recipe) {
    return (
        <div className={styles.error}>
          <h2>Рецепт не найден</h2>
          <button onClick={() => navigate('/')} className={styles.primaryBtn}>
            ← На главную
          </button>
        </div>
    );
  }

  // Инициализируем servings из рецепта при первом рендере
  const currentServings = servings ?? recipe.servings;
  const scale = currentServings / recipe.servings;
  const totalTime = recipe.prep_time_min + recipe.cook_time_min;

  const handleLikeToggle = () => {
    toggleSaved.mutate({ recipeId: recipe.id, currentlySaved: isSaved });
  };

  // Форматируем число: убираем лишние нули, округляем до десятых
  const formatAmount = (n: number): string => {
    const rounded = Math.round(n * 10) / 10;
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
  };

  return (
      <div className={styles.root}>
        {/* Hero: фото + overlay назад + лайк */}
        <div className={styles.hero}>
          {recipe.image_url ? (
              <img src={recipe.image_url} alt={recipe.title} className={styles.heroImage} />
          ) : (
              <div className={styles.heroPlaceholder}>🍴</div>
          )}
          <div className={styles.heroGradient} />
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            ←
          </button>
          <button
              className={`${styles.heroLikeBtn} ${isSaved ? styles.heroLikeBtnActive : ''}`}
              onClick={handleLikeToggle}
              disabled={toggleSaved.isPending}
              aria-label={isSaved ? 'Убрать лайк' : 'Нравится'}
          >
            {isSaved ? <HeartFilledIcon size={22} /> : <HeartIcon size={22} />}
            {recipe.likes_count > 0 && (
                <span className={styles.heroLikeCount}>{formatCount(recipe.likes_count)}</span>
            )}
          </button>
        </div>

        <div className={styles.content}>
          {/* Заголовок и мета */}
          <div className={styles.header}>
            <span className={styles.cuisineTag}>{recipe.cuisine}</span>
            <h1 className={styles.title}>{recipe.title}</h1>
            {recipe.description && <p className={styles.description}>{recipe.description}</p>}
          </div>

          {/* Автор — только для UGC-рецептов */}
          {recipe.author_id && (
              <div className={styles.authorSection}>
                <AuthorLine authorId={recipe.author_id} size="md" variant="light" />
              </div>
          )}

          {/* Плашки: время, сложность, порции */}
          <div className={styles.statsRow}>
            <div className={styles.statBox}>
              <div className={styles.statValue}>⏱ {totalTime}</div>
              <div className={styles.statLabel}>минут</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statValue}>{DIFFICULTY_LABEL[recipe.difficulty]}</div>
              <div className={styles.statLabel}>сложность</div>
            </div>
            {recipe.calories != null && (
                <div className={styles.statBox}>
                  <div className={styles.statValue}>{Math.round(recipe.calories * scale / currentServings * recipe.servings)}</div>
                  <div className={styles.statLabel}>ккал / порция</div>
                </div>
            )}
          </div>

          {/* КБЖУ, если есть */}
          {(recipe.protein != null || recipe.fat != null || recipe.carbs != null) && (
              <div className={styles.macros}>
                {recipe.protein != null && (
                    <div className={styles.macroItem}>
                      <span className={styles.macroLabel}>Белки</span>
                      <span className={styles.macroValue}>{formatAmount(recipe.protein)} г</span>
                    </div>
                )}
                {recipe.fat != null && (
                    <div className={styles.macroItem}>
                      <span className={styles.macroLabel}>Жиры</span>
                      <span className={styles.macroValue}>{formatAmount(recipe.fat)} г</span>
                    </div>
                )}
                {recipe.carbs != null && (
                    <div className={styles.macroItem}>
                      <span className={styles.macroLabel}>Углеводы</span>
                      <span className={styles.macroValue}>{formatAmount(recipe.carbs)} г</span>
                    </div>
                )}
              </div>
          )}

          {/* Управление порциями */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Ингредиенты</h2>
              <div className={styles.servingsControl}>
                <button
                    type="button"
                    className={styles.servingsBtn}
                    onClick={() => setServings(Math.max(1, currentServings - 1))}
                    disabled={currentServings <= 1}
                >
                  −
                </button>
                <span className={styles.servingsValue}>
                {currentServings} {currentServings === 1 ? 'порция' : currentServings < 5 ? 'порции' : 'порций'}
              </span>
                <button
                    type="button"
                    className={styles.servingsBtn}
                    onClick={() => setServings(Math.min(20, currentServings + 1))}
                    disabled={currentServings >= 20}
                >
                  +
                </button>
              </div>
            </div>

            <ul className={styles.ingredients}>
              {recipe.ingredients.map((ing, i) => (
                  <li key={i} className={styles.ingredient}>
                    <span className={styles.ingredientName}>{ing.name}</span>
                    <span className={styles.ingredientAmount}>
                  {formatAmount(ing.amount * scale)} {ing.unit}
                </span>
                  </li>
              ))}
            </ul>
          </section>

          {/* Шаги */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Приготовление</h2>
            <ol className={styles.steps}>
              {recipe.steps.map((step, i) => (
                  <li key={i} className={styles.step}>
                    <div className={styles.stepNumber}>{step.order ?? i + 1}</div>
                    <div className={styles.stepContent}>
                      <p className={styles.stepText}>{step.text}</p>
                      {step.timer_seconds != null && step.timer_seconds > 0 && (
                          <span className={styles.stepTimer}>
                      ⏱ {Math.round(step.timer_seconds / 60)} мин
                    </span>
                      )}
                    </div>
                  </li>
              ))}
            </ol>
          </section>

          {/* Теги */}
          {recipe.tags.length > 0 && (
              <div className={styles.tags}>
                {recipe.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>#{tag}</span>
                ))}
              </div>
          )}
        </div>

        {/* Fixed CTA внизу */}
        <div className={styles.ctaBar}>
          <button
              className={styles.ctaButton}
              onClick={() => navigate(`/cook/${recipe.id}`)}
          >
            🍳 Готовлю!
          </button>
        </div>
      </div>
  );
}

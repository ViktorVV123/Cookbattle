import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Recipe } from '@/types/database';
import { HeartIcon, HeartFilledIcon, BookIcon, ShareIcon } from '@/components/icons/ActionIcons';
import { AuthorLine } from '@/components/recipe/AuthorLine';
import { formatCount } from '@/utils/formatCount';

import styles from './FeedCard.module.scss';
import {useSavedRecipeIds, useToggleSaved} from "@/hooks/useSaved.ts";

const CATEGORY_EMOJI: Record<string, string> = {
  завтрак: '🍳',
  обед: '🍽️',
  ужин: '🍝',
  десерт: '🍰',
  салат: '🥗',
  суп: '🍲'
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Легко',
  medium: 'Средне',
  hard: 'Сложно'
};

interface Props {
  recipe: Recipe;
  index: number;
  isActive: boolean;
}

export function FeedCard({ recipe, index, isActive }: Props) {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);

  const { data: savedIds } = useSavedRecipeIds();
  const toggleSaved = useToggleSaved();

  const isSaved = savedIds?.has(recipe.id) ?? false;

  const emoji = CATEGORY_EMOJI[recipe.category] ?? '🍴';
  const totalTime = recipe.prep_time_min + recipe.cook_time_min;

  const handleSaveToggle = () => {
    toggleSaved.mutate({ recipeId: recipe.id, currentlySaved: isSaved });
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/recipe/${recipe.id}`;
    const text = `Смотри какой рецепт я нашёл в CookBattle: ${recipe.title}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: recipe.title, text, url });
      } catch {
        // отмена шаринга — ок
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert('Ссылка скопирована');
    }
  };

  return (
      <div className={styles.card} data-feed-item data-index={index}>
        {/* Фон: картинка или эмодзи-заглушка */}
        <div className={styles.imageLayer}>
          {recipe.image_url ? (
              <>
                <img
                    src={recipe.image_url}
                    alt={recipe.title}
                    className={`${styles.image} ${imageLoaded ? styles.imageLoaded : ''}`}
                    onLoad={() => setImageLoaded(true)}
                    loading={isActive || index < 3 ? 'eager' : 'lazy'}
                />
                {!imageLoaded && <div className={styles.imageBlur} />}
              </>
          ) : (
              <div className={styles.placeholder}>
                <div className={styles.placeholderEmoji}>{emoji}</div>
              </div>
          )}

          <div className={styles.gradient} />
        </div>

        {/* Правые действия — TikTok-стиль: иконка сверху, цифра снизу */}
        <div className={styles.actions}>
          <button
              className={`${styles.actionBtn} ${isSaved ? styles.actionLiked : ''}`}
              onClick={handleSaveToggle}
              aria-label={isSaved ? 'Убрать лайк' : 'Лайк'}
              disabled={toggleSaved.isPending}
          >
          <span className={styles.actionIcon}>
            {isSaved ? <HeartFilledIcon size={32} /> : <HeartIcon size={32} />}
          </span>
            <span className={styles.actionCount}>
            {recipe.likes_count > 0 ? formatCount(recipe.likes_count) : ''}
          </span>
          </button>

          <button
              className={styles.actionBtn}
              onClick={() => navigate(`/recipe/${recipe.id}`)}
              aria-label="Подробнее"
          >
          <span className={styles.actionIcon}>
            <BookIcon size={32} />
          </span>
            <span className={styles.actionLabel}>Рецепт</span>
          </button>

          <button
              className={styles.actionBtn}
              onClick={handleShare}
              aria-label="Поделиться"
          >
          <span className={styles.actionIcon}>
            <ShareIcon size={32} />
          </span>
            <span className={styles.actionLabel}>Шарить</span>
          </button>
        </div>

        {/* Контент снизу */}
        <div className={styles.content}>
          {/* Автор — только для UGC (author_id != null). Засиженные без автора. */}
          {recipe.author_id && (
              <div className={styles.authorWrap}>
                <AuthorLine authorId={recipe.author_id} size="sm" variant="dark" />
              </div>
          )}

          <div className={styles.badges}>
            <span className={styles.badge}>{recipe.cuisine}</span>
            <span className={styles.badge}>⏱ {totalTime} мин</span>
            <span className={styles.badge}>{DIFFICULTY_LABEL[recipe.difficulty]}</span>
          </div>

          <h2 className={styles.title}>{recipe.title}</h2>

          {recipe.description && (
              <p className={styles.description}>{recipe.description}</p>
          )}

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

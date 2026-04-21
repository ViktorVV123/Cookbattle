import { Link } from 'react-router-dom';
import type { Recipe } from '@/types/database';
import styles from './RecipeCard.module.scss';

// Эмодзи-заглушки для категорий, если фото ещё не подгрузилось
const CATEGORY_EMOJI: Record<string, string> = {
  завтрак: '🍳',
  обед: '🍽️',
  ужин: '🍝',
  десерт: '🍰',
  салат: '🥗',
  суп: '🍲',
  закуска: '🥟'
};

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Легко',
  medium: 'Средне',
  hard: 'Сложно'
};

interface Props {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: Props) {
  const totalTime = recipe.prep_time_min + recipe.cook_time_min;
  const emoji = CATEGORY_EMOJI[recipe.category] ?? '🍴';

  return (
    <Link to={`/recipe/${recipe.id}`} className={styles.card}>
      <div className={styles.imageWrap}>
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            loading="lazy"
            className={styles.image}
          />
        ) : (
          <div className={styles.placeholder}>
            <span className={styles.placeholderEmoji}>{emoji}</span>
          </div>
        )}
        <div className={styles.overlayTop}>
          <span className={styles.badge}>{recipe.cuisine}</span>
        </div>
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{recipe.title}</h3>
        <div className={styles.meta}>
          <span className={styles.metaItem}>⏱ {totalTime} мин</span>
          <span className={styles.metaDot}>·</span>
          <span className={styles.metaItem}>{DIFFICULTY_LABEL[recipe.difficulty]}</span>
          {recipe.calories != null && (
            <>
              <span className={styles.metaDot}>·</span>
              <span className={styles.metaItem}>{recipe.calories} ккал</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

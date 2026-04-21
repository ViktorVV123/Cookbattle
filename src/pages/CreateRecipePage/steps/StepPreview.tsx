import type { CreateRecipeInput } from '@/hooks/useCreateRecipe';
import styles from '../CreateRecipePage.module.scss';

interface Props {
  input: CreateRecipeInput;
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Легко',
  medium: 'Средне',
  hard: 'Сложно'
};

export function StepPreview({ input }: Props) {
  const totalTime = input.prep_time_min + input.cook_time_min;

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>Как это будет выглядеть</h2>
      <p className={styles.stepDescription}>
        Проверь что всё в порядке, и выбери: сохранить черновиком или отправить на модерацию.
        После одобрения рецепт появится в общей ленте.
      </p>

      {/* Превью карточки */}
      <div className={styles.previewCard}>
        {input.image_url && (
          <div className={styles.previewImage}>
            <img src={input.image_url} alt={input.title} />
          </div>
        )}

        <div className={styles.previewBody}>
          <div className={styles.previewBadges}>
            <span className={styles.previewBadge}>{input.cuisine}</span>
            <span className={styles.previewBadge}>⏱ {totalTime} мин</span>
            <span className={styles.previewBadge}>{DIFFICULTY_LABEL[input.difficulty]}</span>
          </div>
          <h3 className={styles.previewTitle}>{input.title}</h3>
          <p className={styles.previewDesc}>{input.description}</p>

          {(input.calories || input.protein) && (
            <div className={styles.previewNutrition}>
              {input.calories && <span>🔥 {input.calories} ккал</span>}
              {input.protein && <span>🥩 {input.protein}г белка</span>}
            </div>
          )}
        </div>
      </div>

      {/* Ингредиенты */}
      <div className={styles.previewSection}>
        <h4 className={styles.previewSectionTitle}>Ингредиенты ({input.ingredients.length})</h4>
        <ul className={styles.previewList}>
          {input.ingredients.map((ing, i) => (
            <li key={i}>
              <span>{ing.name}</span>
              <span style={{ color: 'var(--color-text-dim)' }}>
                {ing.amount > 0 ? `${ing.amount} ${ing.unit}` : ing.unit}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Шаги */}
      <div className={styles.previewSection}>
        <h4 className={styles.previewSectionTitle}>Шаги ({input.steps.length})</h4>
        {input.steps.map((s, i) => (
          <div key={i} className={styles.previewStep}>
            <div className={styles.previewStepNumber}>{i + 1}</div>
            <div className={styles.previewStepContent}>
              <p>{s.text}</p>
              {s.timer_seconds != null && s.timer_seconds > 0 && (
                <span className={styles.previewStepMeta}>⏱ {Math.round(s.timer_seconds / 60)} мин</span>
              )}
              {s.image_url && (
                <img src={s.image_url} alt={`Step ${i + 1}`} className={styles.previewStepImage} />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.previewHint}>
        💡 Модерация обычно занимает до суток. После одобрения рецепт появится в общей ленте.
      </div>
    </div>
  );
}

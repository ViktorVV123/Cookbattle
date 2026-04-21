import type { CreateRecipeInput } from '@/hooks/useCreateRecipe';
import styles from '../CreateRecipePage.module.scss';

interface Props {
  input: CreateRecipeInput;
  onChange: (next: CreateRecipeInput) => void;
}

export function StepTiming({ input, onChange }: Props) {
  const setField = <K extends keyof CreateRecipeInput>(k: K, v: CreateRecipeInput[K]) => {
    onChange({ ...input, [k]: v });
  };

  // Число с парсингом пустой строки как null/0
  const parseNum = (s: string, nullable = false): number | null => {
    if (s === '' || s === '-') return nullable ? null : 0;
    const n = parseInt(s, 10);
    return isNaN(n) ? (nullable ? null : 0) : n;
  };

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>Сколько времени займёт?</h2>

      <div className={styles.twoCol}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Подготовка (мин)</span>
          <input
            type="number"
            min="0"
            max="600"
            value={input.prep_time_min || ''}
            onChange={(e) => setField('prep_time_min', parseNum(e.target.value) as number)}
            placeholder="10"
            className={styles.input}
          />
          <span className={styles.hint}>Нарезка, мариновка, замес теста</span>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Готовка (мин) <span className={styles.required}>*</span></span>
          <input
            type="number"
            min="0"
            max="600"
            value={input.cook_time_min || ''}
            onChange={(e) => setField('cook_time_min', parseNum(e.target.value) as number)}
            placeholder="30"
            className={styles.input}
          />
          <span className={styles.hint}>Жарка, варка, запекание</span>
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Порций <span className={styles.required}>*</span></span>
        <input
          type="number"
          min="1"
          max="20"
          value={input.servings}
          onChange={(e) => setField('servings', Math.max(1, parseNum(e.target.value) as number))}
          className={styles.input}
        />
        <span className={styles.hint}>На сколько человек рассчитан рецепт</span>
      </label>

      <div className={styles.sectionDivider}>
        Пищевая ценность <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(на порцию, необязательно)</span>
      </div>

      <div className={styles.twoCol}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Калории</span>
          <input
            type="number"
            min="0"
            max="3000"
            value={input.calories ?? ''}
            onChange={(e) => setField('calories', parseNum(e.target.value, true))}
            placeholder="—"
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Белки (г)</span>
          <input
            type="number"
            min="0"
            value={input.protein ?? ''}
            onChange={(e) => setField('protein', parseNum(e.target.value, true))}
            placeholder="—"
            className={styles.input}
          />
        </label>
      </div>

      <div className={styles.twoCol}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Жиры (г)</span>
          <input
            type="number"
            min="0"
            value={input.fat ?? ''}
            onChange={(e) => setField('fat', parseNum(e.target.value, true))}
            placeholder="—"
            className={styles.input}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Углеводы (г)</span>
          <input
            type="number"
            min="0"
            value={input.carbs ?? ''}
            onChange={(e) => setField('carbs', parseNum(e.target.value, true))}
            placeholder="—"
            className={styles.input}
          />
        </label>
      </div>
    </div>
  );
}

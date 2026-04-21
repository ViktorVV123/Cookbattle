import { useState } from 'react';
import type { CreateRecipeInput } from '@/hooks/useCreateRecipe';
import type { Ingredient } from '@/types/database';
import styles from '../CreateRecipePage.module.scss';

interface Props {
  input: CreateRecipeInput;
  onChange: (next: CreateRecipeInput) => void;
}

const UNITS = ['г', 'кг', 'мл', 'л', 'шт', 'ст.л', 'ч.л', 'зубчик', 'пучок', 'по вкусу'];

export function StepIngredients({ input, onChange }: Props) {
  const [draft, setDraft] = useState<Ingredient>({ name: '', amount: 0, unit: 'г' });

  const add = () => {
    if (!draft.name.trim()) return;
    onChange({ ...input, ingredients: [...input.ingredients, { ...draft, name: draft.name.trim() }] });
    setDraft({ name: '', amount: 0, unit: 'г' });
  };

  const remove = (idx: number) => {
    onChange({ ...input, ingredients: input.ingredients.filter((_, i) => i !== idx) });
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...input.ingredients];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ ...input, ingredients: next });
  };

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>Что нужно для готовки</h2>
      <p className={styles.stepDescription}>
        Добавь все ингредиенты. Укажи количество на {input.servings} порций.
      </p>

      {/* Список добавленных */}
      {input.ingredients.length > 0 && (
        <div className={styles.list}>
          {input.ingredients.map((ing, idx) => (
            <div key={idx} className={styles.listItem}>
              <div className={styles.listItemContent}>
                <div className={styles.listItemTitle}>{ing.name}</div>
                <div className={styles.listItemMeta}>
                  {ing.amount > 0 ? `${ing.amount} ${ing.unit}` : ing.unit}
                </div>
              </div>
              <div className={styles.listActions}>
                <button onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Вверх">↑</button>
                <button onClick={() => move(idx, 1)} disabled={idx === input.ingredients.length - 1} aria-label="Вниз">↓</button>
                <button onClick={() => remove(idx)} className={styles.btnDelete} aria-label="Удалить">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Форма добавления */}
      <div className={styles.addForm}>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Название (помидоры, мука…)"
          className={styles.input}
        />

        <div className={styles.twoCol}>
          <input
            type="number"
            min="0"
            step="0.1"
            value={draft.amount || ''}
            onChange={(e) => setDraft({ ...draft, amount: parseFloat(e.target.value) || 0 })}
            placeholder="Кол-во"
            className={styles.input}
          />
          <select
            value={draft.unit}
            onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
            className={styles.input}
          >
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        <button
          onClick={add}
          disabled={!draft.name.trim()}
          className={styles.btnAdd}
        >
          + Добавить ингредиент
        </button>
      </div>

      {input.ingredients.length < 2 && (
        <p className={styles.hint}>
          Минимум 2 ингредиента. Сейчас: {input.ingredients.length}
        </p>
      )}
    </div>
  );
}

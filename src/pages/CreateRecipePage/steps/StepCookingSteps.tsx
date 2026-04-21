import { useState } from 'react';
import type { CreateRecipeInput } from '@/hooks/useCreateRecipe';
import type { RecipeStep } from '@/types/database';

import styles from '../CreateRecipePage.module.scss';
import {uploadRecipeImage} from "@/services/uploadRecipeImage.ts";

interface Props {
  input: CreateRecipeInput;
  onChange: (next: CreateRecipeInput) => void;
}

export function StepCookingSteps({ input, onChange }: Props) {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const addStep = () => {
    const nextOrder = input.steps.length + 1;
    onChange({
      ...input,
      steps: [...input.steps, { order: nextOrder, text: '' }]
    });
  };

  const updateStep = (idx: number, patch: Partial<RecipeStep>) => {
    const next = [...input.steps];
    next[idx] = { ...next[idx], ...patch };
    onChange({ ...input, steps: next });
  };

  const removeStep = (idx: number) => {
    const next = input.steps
      .filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, order: i + 1 })); // перенумеровать
    onChange({ ...input, steps: next });
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= input.steps.length) return;
    const next = [...input.steps];
    [next[idx], next[target]] = [next[target], next[idx]];
    // перенумеровать после свапа
    next.forEach((s, i) => (s.order = i + 1));
    onChange({ ...input, steps: next });
  };

  const handleStepPhoto = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIdx(idx);
    try {
      const url = await uploadRecipeImage(file);
      updateStep(idx, { image_url: url });
    } catch (err: any) {
      alert(err.message ?? 'Не удалось загрузить фото');
    } finally {
      setUploadingIdx(null);
      e.target.value = '';
    }
  };

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>Шаги приготовления</h2>
      <p className={styles.stepDescription}>
        Опиши по шагам что делать. К каждому можно добавить таймер (если шаг с ожиданием) и фото.
      </p>

      {input.steps.map((step, idx) => (
        <div key={idx} className={styles.cookingStep}>
          <div className={styles.cookingStepHeader}>
            <div className={styles.cookingStepNumber}>{idx + 1}</div>
            <div className={styles.listActions}>
              <button onClick={() => moveStep(idx, -1)} disabled={idx === 0} aria-label="Вверх">↑</button>
              <button onClick={() => moveStep(idx, 1)} disabled={idx === input.steps.length - 1} aria-label="Вниз">↓</button>
              <button onClick={() => removeStep(idx)} className={styles.btnDelete} aria-label="Удалить">✕</button>
            </div>
          </div>

          <textarea
            value={step.text}
            onChange={(e) => updateStep(idx, { text: e.target.value })}
            placeholder="Например: обжарь лук до золотистости на среднем огне..."
            rows={3}
            className={styles.textarea}
          />

          <div className={styles.stepExtras}>
            {/* Таймер */}
            <div className={styles.stepExtra}>
              <span className={styles.fieldLabel}>⏱ Таймер (сек)</span>
              <input
                type="number"
                min="0"
                step="30"
                value={step.timer_seconds ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  updateStep(idx, {
                    timer_seconds: val === '' ? undefined : parseInt(val, 10) || 0
                  });
                }}
                placeholder="Без таймера"
                className={styles.input}
              />
            </div>

            {/* Фото шага */}
            <div className={styles.stepExtra}>
              <span className={styles.fieldLabel}>📷 Фото</span>
              {step.image_url ? (
                <div className={styles.stepPhoto}>
                  <img src={step.image_url} alt={`Step ${idx + 1}`} />
                  <button
                    onClick={() => updateStep(idx, { image_url: undefined })}
                    className={styles.stepPhotoRemove}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className={styles.stepPhotoUpload}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleStepPhoto(idx, e)}
                    disabled={uploadingIdx === idx}
                    className={styles.hiddenInput}
                  />
                  {uploadingIdx === idx ? (
                    <span className={styles.spinner} />
                  ) : (
                    <>+ Добавить</>
                  )}
                </label>
              )}
            </div>
          </div>
        </div>
      ))}

      <button onClick={addStep} className={styles.btnAdd}>
        + Добавить шаг
      </button>

      {input.steps.length < 2 && (
        <p className={styles.hint}>Минимум 2 шага. Сейчас: {input.steps.length}</p>
      )}
    </div>
  );
}

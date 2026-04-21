import { useState } from 'react';
import type { CreateRecipeInput } from '@/hooks/useCreateRecipe';

import type { Difficulty } from '@/types/database';
import styles from '../CreateRecipePage.module.scss';
import {uploadRecipeImage} from "@/services/uploadRecipeImage.ts";

interface Props {
  input: CreateRecipeInput;
  onChange: (next: CreateRecipeInput) => void;
}

const CUISINES = [
  'русская', 'итальянская', 'французская', 'азиатская',
  'грузинская', 'мексиканская', 'американская',
  'средиземноморская', 'европейская', 'другая'
];

const CATEGORIES = [
  { value: 'завтрак', label: '🍳 Завтрак' },
  { value: 'обед', label: '🍽️ Обед' },
  { value: 'ужин', label: '🍝 Ужин' },
  { value: 'десерт', label: '🍰 Десерт' },
  { value: 'салат', label: '🥗 Салат' },
  { value: 'суп', label: '🍲 Суп' }
];

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Легко' },
  { value: 'medium', label: 'Средне' },
  { value: 'hard', label: 'Сложно' }
];

export function StepBasics({ input, onChange }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadRecipeImage(file);
      onChange({ ...input, image_url: url });
    } catch (err: any) {
      alert(err.message ?? 'Не удалось загрузить фото');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>Расскажи про блюдо</h2>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Название <span className={styles.required}>*</span></span>
        <input
          type="text"
          value={input.title}
          onChange={(e) => onChange({ ...input, title: e.target.value })}
          placeholder="Борщ мамин"
          maxLength={80}
          className={styles.input}
        />
        <span className={styles.hint}>{input.title.length}/80</span>
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Короткое описание <span className={styles.required}>*</span></span>
        <textarea
          value={input.description}
          onChange={(e) => onChange({ ...input, description: e.target.value })}
          placeholder="Наваристый, с говяжьим бульоном. Делается 2 часа, но оно того стоит."
          maxLength={240}
          rows={3}
          className={styles.textarea}
        />
        <span className={styles.hint}>{input.description.length}/240 · минимум 10 символов</span>
      </label>

      {/* Обложка */}
      <div className={styles.field}>
        <span className={styles.fieldLabel}>Обложка</span>
        {input.image_url ? (
          <div className={styles.coverPreview}>
            <img src={input.image_url} alt="Cover" />
            <button
              className={styles.coverRemove}
              onClick={() => onChange({ ...input, image_url: null })}
            >
              ✕ Удалить
            </button>
          </div>
        ) : (
          <label className={styles.coverUpload}>
            <input
              type="file"
              accept="image/*"
              onChange={handleCover}
              disabled={uploading}
              className={styles.hiddenInput}
            />
            {uploading ? (
              <>
                <span className={styles.spinner} />
                <span>Загружаем…</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: 40 }}>📷</span>
                <span>Загрузить обложку</span>
                <span className={styles.hint}>Квадратное фото, до 5 МБ</span>
              </>
            )}
          </label>
        )}
      </div>

      {/* Кухня */}
      <div className={styles.field}>
        <span className={styles.fieldLabel}>Кухня <span className={styles.required}>*</span></span>
        <div className={styles.chipsGrid}>
          {CUISINES.map((c) => (
            <button
              key={c}
              type="button"
              className={`${styles.chip} ${input.cuisine === c ? styles.chipActive : ''}`}
              onClick={() => onChange({ ...input, cuisine: c })}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Категория */}
      <div className={styles.field}>
        <span className={styles.fieldLabel}>Категория <span className={styles.required}>*</span></span>
        <div className={styles.chipsGrid}>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`${styles.chip} ${input.category === c.value ? styles.chipActive : ''}`}
              onClick={() => onChange({ ...input, category: c.value })}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Сложность */}
      <div className={styles.field}>
        <span className={styles.fieldLabel}>Сложность</span>
        <div className={styles.chipsGrid}>
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              type="button"
              className={`${styles.chip} ${input.difficulty === d.value ? styles.chipActive : ''}`}
              onClick={() => onChange({ ...input, difficulty: d.value })}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

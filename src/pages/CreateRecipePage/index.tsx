import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateRecipe, type CreateRecipeInput } from '@/hooks/useCreateRecipe';
import { StepBasics } from './steps/StepBasics';
import { StepTiming } from './steps/StepTiming';
import { StepIngredients } from './steps/StepIngredients';
import { StepCookingSteps } from './steps/StepCookingSteps';
import { StepPreview } from './steps/StepPreview';
import styles from './CreateRecipePage.module.scss';

type StepNum = 1 | 2 | 3 | 4 | 5;

const STEPS = [
  { n: 1, label: 'Основное' },
  { n: 2, label: 'Тайминг' },
  { n: 3, label: 'Ингредиенты' },
  { n: 4, label: 'Шаги' },
  { n: 5, label: 'Готово' }
];

function emptyInput(): CreateRecipeInput {
  return {
    title: '',
    description: '',
    image_url: null,
    cuisine: '',
    category: '',
    difficulty: 'easy',
    prep_time_min: 0,
    cook_time_min: 0,
    servings: 2,
    calories: null,
    protein: null,
    fat: null,
    carbs: null,
    tags: [],
    ingredients: [],
    steps: []
  };
}

/**
 * Возвращает null если шаг валиден, иначе — текст что не так.
 */
function validateStep(step: StepNum, input: CreateRecipeInput): string | null {
  switch (step) {
    case 1:
      if (input.title.trim().length < 3) return 'Название слишком короткое (минимум 3 символа)';
      if (input.description.trim().length < 10) return 'Описание слишком короткое (минимум 10 символов)';
      if (!input.cuisine) return 'Выбери кухню';
      if (!input.category) return 'Выбери категорию';
      return null;

    case 2:
      if (input.prep_time_min + input.cook_time_min <= 0) return 'Укажи время готовки (хотя бы один из двух таймеров больше 0)';
      if (input.servings < 1) return 'Укажи хотя бы 1 порцию';
      return null;

    case 3:
      if (input.ingredients.length < 2) return `Добавь минимум 2 ингредиента (сейчас ${input.ingredients.length})`;
      return null;

    case 4: {
      if (input.steps.length < 2) return `Добавь минимум 2 шага (сейчас ${input.steps.length})`;
      const shortSteps = input.steps
          .map((s, i) => ({ i: i + 1, len: s.text.trim().length }))
          .filter((s) => s.len < 5);
      if (shortSteps.length > 0) {
        const nums = shortSteps.map((s) => s.i).join(', ');
        return `Опиши подробнее шаг ${nums} (минимум 5 символов)`;
      }
      return null;
    }

    case 5:
      return null;
  }
}

export function CreateRecipePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<StepNum>(1);
  const [input, setInput] = useState<CreateRecipeInput>(emptyInput);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateRecipe();

  const validationError = validateStep(step, input);
  const canGoNext = validationError === null;

  const next = () => {
    if (!canGoNext) return;
    if (step < 5) setStep((step + 1) as StepNum);
  };
  const prev = () => {
    if (step > 1) setStep((step - 1) as StepNum);
  };

  const handleSubmit = async (submitForReview: boolean) => {
    setSubmitting(true);
    setError(null);
    try {
      await createMutation.mutateAsync({ input, submitForReview });
      navigate('/profile?tab=my');
    } catch (e: any) {
      setError(e.message ?? 'Не удалось сохранить');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = (step / 5) * 100;

  return (
      <div className={styles.root}>
        {/* Header */}
        <header className={styles.header}>
          <button className={styles.closeBtn} onClick={() => navigate(-1)}>✕</button>
          <div className={styles.headerTitle}>
            <div className={styles.headerMain}>Новый рецепт</div>
            <div className={styles.headerSub}>
              Шаг {step} из 5 · {STEPS[step - 1].label}
            </div>
          </div>
          <div className={styles.headerSpacer} />
        </header>

        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>

        {/* Content */}
        <main className={styles.content}>
          {step === 1 && <StepBasics input={input} onChange={setInput} />}
          {step === 2 && <StepTiming input={input} onChange={setInput} />}
          {step === 3 && <StepIngredients input={input} onChange={setInput} />}
          {step === 4 && <StepCookingSteps input={input} onChange={setInput} />}
          {step === 5 && <StepPreview input={input} />}

          {error && <div className={styles.error}>{error}</div>}
        </main>

        {/* Footer */}
        <footer className={styles.footer}>
          {/* Подсказка что заполнить */}
          {step < 5 && validationError && (
              <div className={styles.validationHint}>
                ⚠️ {validationError}
              </div>
          )}

          <div className={styles.footerButtons}>
            <button onClick={prev} disabled={step === 1} className={styles.btnSecondary}>
              ← Назад
            </button>

            {step < 5 ? (
                <button onClick={next} disabled={!canGoNext} className={styles.btnPrimary}>
                  Дальше →
                </button>
            ) : (
                <div className={styles.finalButtons}>
                  <button
                      onClick={() => handleSubmit(false)}
                      disabled={submitting}
                      className={styles.btnSecondary}
                  >
                    {submitting ? '…' : '💾 В черновики'}
                  </button>
                  <button
                      onClick={() => handleSubmit(true)}
                      disabled={submitting}
                      className={styles.btnPublish}
                  >
                    {submitting ? 'Отправляем…' : '📤 На модерацию'}
                  </button>
                </div>
            )}
          </div>
        </footer>
      </div>
  );
}

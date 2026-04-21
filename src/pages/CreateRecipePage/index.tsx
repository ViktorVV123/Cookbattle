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

export function CreateRecipePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<StepNum>(1);
  const [input, setInput] = useState<CreateRecipeInput>(emptyInput);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateRecipe();

  // Валидация по шагам
  const canGoNext = (): boolean => {
    switch (step) {
      case 1:
        return input.title.trim().length >= 3
            && input.description.trim().length >= 10
            && !!input.cuisine
            && !!input.category;
      case 2:
        return input.prep_time_min >= 0
            && input.cook_time_min >= 0
            && (input.prep_time_min + input.cook_time_min) > 0
            && input.servings >= 1;
      case 3:
        return input.ingredients.length >= 2;
      case 4:
        return input.steps.length >= 2 && input.steps.every((s) => s.text.trim().length >= 5);
      case 5:
        return true;
    }
  };

  const next = () => {
    if (!canGoNext()) return;
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
          <button onClick={prev} disabled={step === 1} className={styles.btnSecondary}>
            ← Назад
          </button>

          {step < 5 ? (
              <button onClick={next} disabled={!canGoNext()} className={styles.btnPrimary}>
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
        </footer>
      </div>
  );
}

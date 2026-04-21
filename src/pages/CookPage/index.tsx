import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/store/authStore';
import { submitCookSession, type CookSessionResult } from '@/services/cookSession';
import { StepTimer } from './components/StepTimer';
import { PhotoCapture } from './components/PhotoCapture';
import { ResultModal } from './components/ResultModal';
import styles from './CookPage.module.scss';
import {useRecipe} from "@/hooks/useRecipes.ts";

type Phase = 'cooking' | 'photo' | 'uploading' | 'done';

export function CookPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const { data: recipe, isLoading } = useRecipe(id);

  const [stepIdx, setStepIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('cooking');
  const [result, setResult] = useState<CookSessionResult | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Сброс при смене рецепта
  useEffect(() => {
    setStepIdx(0);
    setPhase('cooking');
    setResult(null);
    setError(null);
  }, [id]);

  // Свайпы на мобиле (влево/вправо между шагами)
  useEffect(() => {
    if (phase !== 'cooking') return;

    let startX = 0;
    const onTouchStart = (e: TouchEvent) => { startX = e.touches[0].clientX; };
    const onTouchEnd = (e: TouchEvent) => {
      const deltaX = e.changedTouches[0].clientX - startX;
      if (Math.abs(deltaX) < 50) return; // маленькое движение — не свайп
      if (deltaX > 0) prev();
      else next();
    };

    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [phase, stepIdx, recipe]);

  if (isLoading) {
    return <div className={styles.loading}><div className={styles.spinner} /></div>;
  }

  if (!recipe) {
    return (
      <div className={styles.error}>
        <h2>Рецепт не найден</h2>
        <button onClick={() => navigate('/')} className={styles.btn}>← На главную</button>
      </div>
    );
  }

  const steps = recipe.steps;
  const currentStep = steps[stepIdx];
  const isLastStep = stepIdx === steps.length - 1;
  const progress = ((stepIdx + 1) / steps.length) * 100;

  const next = () => {
    if (stepIdx < steps.length - 1) setStepIdx(stepIdx + 1);
  };
  const prev = () => {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  };

  const handlePhotoConfirm = async (blob: Blob) => {
    setError(null);
    setPhase('uploading');
    setPhotoPreview(URL.createObjectURL(blob));

    try {
      const res = await submitCookSession({
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        recipeDescription: recipe.description,
        photoBlob: blob
      });

      setResult(res);
      setPhase('done');
      // Обновляем профиль чтобы XP/streak в ленте обновились
      await refreshProfile();
      // И инвалидируем кэш ленты рецептов — cooked_count у рецепта обновился
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    } catch (e: any) {
      setPhase('photo');
      if (e.code === 'NOT_FOOD') {
        setError(e.message || 'На фото не видно готового блюда. Попробуй ещё раз.');
      } else {
        setError(e.message ?? 'Что-то пошло не так');
      }
    }
  };

  // ============ Экран "готовим" ============
  if (phase === 'cooking') {
    return (
      <div className={styles.root}>
        {/* Header с прогрессом */}
        <header className={styles.header}>
          <button onClick={() => navigate(-1)} className={styles.closeBtn}>
            ✕
          </button>
          <div className={styles.headerCenter}>
            <div className={styles.recipeTitle}>{recipe.title}</div>
            <div className={styles.stepCounter}>
              Шаг {stepIdx + 1} из {steps.length}
            </div>
          </div>
          <div className={styles.headerSpacer} />
        </header>

        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>

        {/* Контент шага */}
        <main className={styles.stepContent}>
          <div className={styles.stepNumber}>{currentStep.order ?? stepIdx + 1}</div>
          <p className={styles.stepText}>{currentStep.text}</p>

          {currentStep.timer_seconds != null && currentStep.timer_seconds > 0 && (
            <StepTimer key={`${stepIdx}-${currentStep.timer_seconds}`} seconds={currentStep.timer_seconds} />
          )}
        </main>

        {/* Нижние кнопки навигации */}
        <footer className={styles.footer}>
          <button
            onClick={prev}
            disabled={stepIdx === 0}
            className={`${styles.navBtn} ${styles.navBtnSecondary}`}
          >
            ← Назад
          </button>

          {isLastStep ? (
            <button
              onClick={() => setPhase('photo')}
              className={`${styles.navBtn} ${styles.navBtnFinish}`}
            >
              📸 Готово! Сфоткать
            </button>
          ) : (
            <button onClick={next} className={`${styles.navBtn} ${styles.navBtnPrimary}`}>
              Дальше →
            </button>
          )}
        </footer>
      </div>
    );
  }

  // ============ Экран "фотографируем" ============
  if (phase === 'photo') {
    return (
      <div className={styles.photoPhaseRoot}>
        <header className={styles.photoHeader}>
          <button onClick={() => setPhase('cooking')} className={styles.backBtn}>
            ←
          </button>
          <h1 className={styles.photoTitle}>Покажи результат</h1>
        </header>

        <div className={styles.photoContent}>
          <p className={styles.photoDescription}>
            Сфоткай блюдо — AI оценит подачу и даст совет.
          </p>

          {error && <div className={styles.errorMsg}>{error}</div>}

          <PhotoCapture onConfirm={handlePhotoConfirm} />
        </div>
      </div>
    );
  }

  // ============ Экран "загрузка и AI думает" ============
  if (phase === 'uploading') {
    return (
      <div className={styles.uploadRoot}>
        {photoPreview && (
          <img src={photoPreview} alt="Твоё блюдо" className={styles.uploadPhoto} />
        )}
        <div className={styles.uploadSpinner} />
        <div className={styles.uploadTitle}>AI анализирует подачу…</div>
        <div className={styles.uploadHint}>Это занимает 5-10 секунд</div>
      </div>
    );
  }

  // ============ Экран результата ============
  if (phase === 'done' && result && photoPreview) {
    return (
      <ResultModal
        result={result}
        photoUrl={photoPreview}
        recipeId={recipe.id}
        onClose={() => navigate(`/recipe/${recipe.id}`)}
      />
    );
  }

  return null;
}

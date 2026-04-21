import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CookSessionResult } from '@/services/cookSession';
import styles from './ResultModal.module.scss';
import {useRecipe} from "@/hooks/useRecipes.ts";
import {generateShareCard, shareBlob} from "@/utils/shareCard.ts";

interface Props {
  result: CookSessionResult;
  photoUrl: string;
  recipeId: string;
  onClose: () => void;
}

const LEVEL_LABEL: Record<string, string> = {
  novice: 'Новичок',
  amateur: 'Любитель',
  advanced: 'Продвинутый',
  chef: 'Шеф',
  master_chef: 'Мастер-шеф'
};

const REVEAL_DELAYS = {
  score: 300,
  comment: 1500,
  xp: 2200,
  achievements: 2800,
  actions: 3400
};

export function ResultModal({ result, photoUrl, recipeId, onClose }: Props) {
  const navigate = useNavigate();
  const [animatedScore, setAnimatedScore] = useState(0);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [sharing, setSharing] = useState(false);

  // Нужно название рецепта для шарящей карточки
  const { data: recipe } = useRecipe(recipeId);

  useEffect(() => {
    const timeouts: number[] = [];

    timeouts.push(window.setTimeout(() => setRevealed((r) => ({ ...r, score: true })), REVEAL_DELAYS.score));
    timeouts.push(window.setTimeout(() => setRevealed((r) => ({ ...r, comment: true })), REVEAL_DELAYS.comment));
    timeouts.push(window.setTimeout(() => setRevealed((r) => ({ ...r, xp: true })), REVEAL_DELAYS.xp));
    timeouts.push(window.setTimeout(() => setRevealed((r) => ({ ...r, achievements: true })), REVEAL_DELAYS.achievements));
    timeouts.push(window.setTimeout(() => setRevealed((r) => ({ ...r, actions: true })), REVEAL_DELAYS.actions));

    const startScoreAt = REVEAL_DELAYS.score + 200;
    const scoreDuration = 1200;
    timeouts.push(
      window.setTimeout(() => {
        const startTime = Date.now();
        const tick = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(1, elapsed / scoreDuration);
          const eased = 1 - Math.pow(1 - progress, 3);
          setAnimatedScore(Math.round(result.grading.score * eased));
          if (progress < 1) requestAnimationFrame(tick);
        };
        tick();
      }, startScoreAt)
    );

    return () => timeouts.forEach((t) => clearTimeout(t));
  }, [result.grading.score]);

  const scoreColor =
    result.grading.score >= 9 ? 'var(--color-success)' :
    result.grading.score >= 7 ? 'var(--color-gold)' :
    'var(--color-primary)';

  const handleShare = async () => {
    if (!recipe || sharing) return;
    setSharing(true);
    try {
      const blob = await generateShareCard({
        photoUrl,
        score: result.grading.score,
        comment: result.grading.comment,
        recipeTitle: recipe.title,
        cuisine: recipe.cuisine
      });

      const filename = `cookbattle-${recipe.title.toLowerCase().replace(/[^a-zа-я0-9]+/gi, '-')}.png`;
      const text = `Мой "${recipe.title}" получил ${result.grading.score}/10 в CookBattle 🔥`;

      await shareBlob(blob, filename, text);
    } catch (e: any) {
      console.error('Share failed:', e);
      alert('Не удалось создать карточку. Попробуй ещё раз.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.container}>
        {/* Фото результата */}
        <div className={styles.photoWrap}>
          <img src={photoUrl} alt="Результат" className={styles.photo} />
          <div className={styles.photoGradient} />
        </div>

        {/* Score */}
        <div className={`${styles.scoreBlock} ${revealed.score ? styles.scoreRevealed : ''}`}>
          <div className={styles.scoreCircle} style={{ borderColor: scoreColor, color: scoreColor }}>
            <div className={styles.scoreValue}>{animatedScore}</div>
            <div className={styles.scoreMax}>из 10</div>
          </div>
          <div className={styles.scoreLabel}>Оценка AI</div>
        </div>

        {/* Комментарий AI */}
        {revealed.comment && (
          <div className={styles.commentBlock}>
            <div className={styles.commentLabel}>💬 Claude говорит:</div>
            <p className={styles.commentText}>{result.grading.comment}</p>
          </div>
        )}

        {/* XP */}
        {revealed.xp && (
          <div className={styles.xpBlock}>
            <div className={styles.xpRow}>
              <span className={styles.xpLabel}>⚡ Получено XP</span>
              <span className={styles.xpValue}>+{result.xp_earned}</span>
            </div>
            {result.new_streak > 1 && (
              <div className={styles.xpRow}>
                <span className={styles.xpLabel}>🔥 Streak</span>
                <span className={styles.xpValue}>{result.new_streak} дней</span>
              </div>
            )}
            {result.level_up && (
              <div className={styles.levelUp}>
                🎉 Новый уровень: <b>{LEVEL_LABEL[result.new_level] ?? result.new_level}</b>!
              </div>
            )}
          </div>
        )}

        {/* Ачивки */}
        {revealed.achievements && result.new_achievements.length > 0 && (
          <div className={styles.achievementsBlock}>
            <div className={styles.achievementsLabel}>🏆 Разблокировано</div>
            {result.new_achievements.map((ach) => (
              <div key={ach.id} className={styles.achievement}>
                <span className={styles.achievementId}>{ach.id}</span>
                <span className={styles.achievementXp}>+{ach.xp} XP</span>
              </div>
            ))}
          </div>
        )}

        {/* Кнопки */}
        {revealed.actions && (
          <>
            {/* Главная виральная кнопка — отдельно и заметно */}
            <button
              className={styles.shareButton}
              onClick={handleShare}
              disabled={sharing || !recipe}
            >
              {sharing ? (
                <>
                  <span className={styles.miniSpinner} />
                  Создаём карточку…
                </>
              ) : (
                <>📤 Поделиться результатом</>
              )}
            </button>

            <div className={styles.actions}>
              <button className={styles.btnSecondary} onClick={onClose}>
                Закрыть
              </button>
              <button className={styles.btnPrimary} onClick={() => navigate('/')}>
                На главную
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

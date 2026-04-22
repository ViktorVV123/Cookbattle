import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CookSessionWithRecipe } from '@/hooks/useCookSessions';
import { generateShareCard, shareBlob } from '@/utils/shareCard';
import styles from './CookSessionModal.module.scss';

interface Props {
    session: CookSessionWithRecipe;
    onClose: () => void;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return `${diffDays} дней назад`;

    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export function CookSessionModal({ session, onClose }: Props) {
    const navigate = useNavigate();
    const [sharing, setSharing] = useState(false);

    // Блокируем скролл body пока модалка открыта
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    // Закрытие по Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const scoreColor =
        session.ai_score >= 9 ? 'var(--color-success)' :
            session.ai_score >= 7 ? 'var(--color-gold)' :
                'var(--color-primary)';

    const handleShare = async () => {
        if (!session.recipe || sharing) return;
        setSharing(true);
        try {
            const blob = await generateShareCard({
                photoUrl: session.photo_url,
                score: session.ai_score,
                comment: session.ai_comment,
                recipeTitle: session.recipe.title,
                cuisine: session.recipe.cuisine
            });

            const filename = `cookbattle-${session.recipe.title.toLowerCase().replace(/[^a-zа-я0-9]+/gi, '-')}.png`;
            const text = `Мой "${session.recipe.title}" получил ${session.ai_score}/10 в CookBattle 🔥`;

            await shareBlob(blob, filename, text);
        } catch (e) {
            console.error('Share failed:', e);
            alert('Не удалось создать карточку. Попробуй ещё раз.');
        } finally {
            setSharing(false);
        }
    };

    const handleOpenRecipe = () => {
        if (!session.recipe) return;
        navigate(`/recipe/${session.recipe.id}`);
    };

    return (
        <div className={styles.root} onClick={onClose}>
            <div
                className={styles.container}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
                    ✕
                </button>

                {/* Фото блюда с бейджем кухни */}
                <div className={styles.photoWrap}>
                    <img src={session.photo_url} alt={session.recipe?.title ?? 'Результат'} className={styles.photo} />
                    {session.recipe?.cuisine && (
                        <div className={styles.cuisineBadge}>{session.recipe.cuisine}</div>
                    )}
                    <div className={styles.photoGradient} />
                </div>

                {/* Score circle */}
                <div className={styles.scoreBlock}>
                    <div
                        className={styles.scoreCircle}
                        style={{ borderColor: scoreColor, color: scoreColor, boxShadow: `0 0 40px ${scoreColor}40` }}
                    >
                        <div className={styles.scoreValue}>{session.ai_score}</div>
                        <div className={styles.scoreMax}>из 10</div>
                    </div>
                    <div className={styles.scoreLabel}>ОЦЕНКА AI</div>
                </div>

                {/* Название + дата */}
                <div className={styles.titleBlock}>
                    <h2 className={styles.title}>{session.recipe?.title ?? 'Рецепт недоступен'}</h2>
                    <div className={styles.date}>Приготовлено {formatDate(session.created_at)}</div>
                </div>

                {/* Комментарий AI */}
                <div className={styles.commentBlock}>
                    <div className={styles.commentLabel}>💬 AI говорит:</div>
                    <p className={styles.commentText}>{session.ai_comment}</p>
                </div>

                {/* Плашка с XP */}
                {session.xp_earned > 0 && (
                    <div className={styles.xpBlock}>
                        <div className={styles.xpLabel}>
                            <span className={styles.xpIcon}>⚡</span>
                            Получено XP
                        </div>
                        <div className={styles.xpValue}>+{session.xp_earned}</div>
                    </div>
                )}

                {/* Кнопки */}
                <button
                    type="button"
                    className={styles.shareButton}
                    onClick={handleShare}
                    disabled={sharing || !session.recipe}
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

                {session.recipe && (
                    <button type="button" className={styles.recipeButton} onClick={handleOpenRecipe}>
                        Открыть рецепт
                    </button>
                )}
            </div>
        </div>
    );
}

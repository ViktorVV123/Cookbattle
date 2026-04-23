import { useEffect, useState } from 'react';
import type { Recipe } from '@/types/database';
import styles from './IngredientsSheet.module.scss';

interface Props {
    recipe: Recipe;
    /**
     * Начальное количество порций — обычно recipe.servings, но если юзер
     * уже крутил на RecipePage, можно передать текущее (TODO: на будущее,
     * пока стартуем с base).
     */
    initialServings?: number;
    open: boolean;
    onClose: () => void;
}

/**
 * Боттом-шит со списком ингредиентов. Открывается из CookPage во время
 * готовки, чтобы юзер не забывал сколько чего класть — см. пост-мортем
 * "хочу посмотреть сколько дрожжей, а надо переключаться на рецепт".
 *
 * Внутри — регулировка порций +/− как на RecipePage. Если юзер крутит
 * порции — цифры пересчитываются здесь же.
 */
export function IngredientsSheet({ recipe, initialServings, open, onClose }: Props) {
    const [servings, setServings] = useState<number>(initialServings ?? recipe.servings);

    // Блокируем скролл body пока шит открыт
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    // Закрытие по Escape
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    const scale = servings / recipe.servings;

    // Форматируем число: убираем лишние нули, округляем до десятых
    const formatAmount = (n: number): string => {
        const rounded = Math.round(n * 10) / 10;
        return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
    };

    const servingsLabel =
        servings === 1 ? 'порция' : servings < 5 ? 'порции' : 'порций';

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div
                className={styles.sheet}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Ингредиенты"
            >
                <div className={styles.handle} />

                <div className={styles.header}>
                    <h2 className={styles.title}>Ингредиенты</h2>
                    <button
                        type="button"
                        className={styles.closeBtn}
                        onClick={onClose}
                        aria-label="Закрыть"
                    >
                        ✕
                    </button>
                </div>

                {/* Регулировка порций */}
                <div className={styles.servingsRow}>
                    <span className={styles.servingsLabel}>Порции</span>
                    <div className={styles.servingsControl}>
                        <button
                            type="button"
                            className={styles.servingsBtn}
                            onClick={() => setServings(Math.max(1, servings - 1))}
                            disabled={servings <= 1}
                            aria-label="Меньше порций"
                        >
                            −
                        </button>
                        <span className={styles.servingsValue}>
              {servings} {servingsLabel}
            </span>
                        <button
                            type="button"
                            className={styles.servingsBtn}
                            onClick={() => setServings(Math.min(20, servings + 1))}
                            disabled={servings >= 20}
                            aria-label="Больше порций"
                        >
                            +
                        </button>
                    </div>
                </div>

                {/* Список */}
                <ul className={styles.list}>
                    {recipe.ingredients.map((ing, i) => (
                        <li key={i} className={styles.item}>
                            <span className={styles.itemName}>{ing.name}</span>
                            <span className={styles.itemAmount}>
                {formatAmount(ing.amount * scale)} {ing.unit}
              </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

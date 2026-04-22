import { useEffect } from 'react';
import styles from './SwipeHint.module.scss';

interface Props {
    onDismiss: () => void;
}

export function SwipeHint({ onDismiss }: Props) {
    useEffect(() => {
        const t = setTimeout(onDismiss, 6000);
        return () => clearTimeout(t);
    }, [onDismiss]);

    return (
        <div className={styles.root} aria-hidden="true">
            <div className={styles.content}>
                <div className={styles.arrow}>👆</div>
                <div className={styles.text}>Свайпай вверх</div>
                <div className={styles.sub}>чтобы увидеть следующий рецепт</div>

                <button
                    type="button"
                    className={styles.closeBtn}
                    onClick={onDismiss}
                    aria-label="Закрыть подсказку"
                >
                    Понятно
                </button>
            </div>
        </div>
    );
}

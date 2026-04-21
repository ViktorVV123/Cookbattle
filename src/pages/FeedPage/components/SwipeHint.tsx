import styles from './SwipeHint.module.scss';

interface Props {
  onDismiss: () => void;
}

export function SwipeHint({ onDismiss }: Props) {
  return (
    <div className={styles.root} onClick={onDismiss}>
      <div className={styles.content}>
        <div className={styles.arrow}>👆</div>
        <div className={styles.text}>Свайпай вверх</div>
        <div className={styles.sub}>чтобы увидеть следующий рецепт</div>
      </div>
    </div>
  );
}

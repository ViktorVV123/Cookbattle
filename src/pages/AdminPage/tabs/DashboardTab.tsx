import styles from '../AdminPage.module.scss';

export function DashboardTab() {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>🚧</div>
      <h2>Скоро</h2>
      <p>Дашборд с метриками и графиками — в следующем обновлении.</p>
    </div>
  );
}

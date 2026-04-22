import styles from '../AdminPage.module.scss';

export function UsersTab() {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon}>🚧</div>
      <h2>Скоро</h2>
      <p>Управление пользователями будет готово в следующем обновлении.</p>
    </div>
  );
}

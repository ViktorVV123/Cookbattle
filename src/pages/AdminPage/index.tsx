import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useIsAdmin, usePendingRecipes } from '@/hooks/useAdmin';
import { useAuthStore } from '@/store/authStore';
import styles from './AdminPage.module.scss';

const TABS = [
  { path: 'moderation', label: 'Модерация', icon: '🛡' },
  { path: 'recipes', label: 'Рецепты', icon: '📖' },
  { path: 'users', label: 'Юзеры', icon: '👥' },
  { path: 'dashboard', label: 'Дашборд', icon: '📊' }
];

export function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useAuthStore((s) => s.profile);
  const isAdmin = useIsAdmin();

  // Счётчик pending для бейджа на вкладке "Модерация"
  const { data: pending } = usePendingRecipes();
  const pendingCount = pending?.length ?? 0;

  // Если зашёл на /admin без подпути — редиректим на /admin/moderation
  useEffect(() => {
    if (location.pathname === '/admin' || location.pathname === '/admin/') {
      navigate('/admin/moderation', { replace: true });
    }
  }, [location.pathname, navigate]);

  if (profile && !isAdmin) {
    return (
      <div className={styles.forbidden}>
        <div className={styles.forbiddenIcon}>🚫</div>
        <h2>Доступ запрещён</h2>
        <p>Эта страница только для админов.</p>
        <button onClick={() => navigate('/')} className={styles.btn}>На главную</button>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <button className={styles.closeBtn} onClick={() => navigate('/profile')}>✕</button>
        <div className={styles.headerTitle}>
          <div className={styles.headerMain}>Админка CookBattle</div>
          <div className={styles.headerSub}>Панель управления</div>
        </div>
        <div className={styles.headerSpacer} />
      </header>

      {/* Табы */}
      <nav className={styles.tabs}>
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={`/admin/${tab.path}`}
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ''}`}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
            {tab.path === 'moderation' && pendingCount > 0 && (
              <span className={styles.tabBadge}>{pendingCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Контент активной вкладки */}
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}

import { NavLink, Outlet, useLocation } from 'react-router-dom';
import styles from './AppLayout.module.scss';

const NAV = [
  { to: '/', label: 'Лента', icon: '🏠' },
  { to: '/search', label: 'Поиск', icon: '🔍' },
  { to: '/profile', label: 'Я', icon: '👤' }
];

// На этих путях (пошаговый режим) прячем навигацию полностью
const HIDE_NAV_PATTERNS = [/^\/cook\//];

// На этих путях навигация плавает поверх контента (TikTok-feed, RecipePage)
const OVERLAY_NAV_PATTERNS = [/^\/$/, /^\/recipe\//];

export function AppLayout() {
  const { pathname } = useLocation();
  const hideNav = HIDE_NAV_PATTERNS.some((r) => r.test(pathname));
  const overlayNav = OVERLAY_NAV_PATTERNS.some((r) => r.test(pathname));

  return (
    <div className={styles.root}>
      <main className={`${styles.main} ${overlayNav ? styles.mainFullscreen : ''}`}>
        <Outlet />
      </main>

      {!hideNav && (
        <nav className={`${styles.nav} ${overlayNav ? styles.navOverlay : ''}`}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.label}>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}

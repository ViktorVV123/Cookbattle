import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { FeedCard } from './components/FeedCard';
import { FeedHeader } from './components/FeedHeader';
import { SwipeHint } from './components/SwipeHint';
import { markAsViewed } from '@/utils/feedPersonalization';
import styles from './FeedPage.module.scss';
import {useRecipesFeed} from "@/hooks/useRecipes.ts";

const HINT_SEEN_KEY = 'cb_swipe_hint_seen';
// sessionStorage-ключ запомненной позиции в ленте (recipe.id активной карточки).
// Именно sessionStorage, а не localStorage: держим контекст только в пределах
// открытой вкладки браузера. Закрыл вкладку / перезапустил PWA — порядок и
// позиция обнуляются (это норм для TikTok-подобной ленты).
const FEED_POSITION_KEY = 'cb_feed_active_recipe_id';

export function FeedPage() {
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.user?.id);
  const navigate = useNavigate();

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useRecipesFeed();

  const recipes = data?.pages.flat() ?? [];
  const containerRef = useRef<HTMLDivElement>(null);

  // Активный индекс рецепта в ленте
  const [activeIndex, setActiveIndex] = useState(0);

  // Флаг: мы уже восстановили позицию после монтирования? Нужен чтобы не делать
  // это дважды (StrictMode в dev) и чтобы observer не сохранял activeIndex до
  // того, как восстановление отработало.
  const restoredRef = useRef(false);

  // Hint про свайп — показываем только первый раз
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem(HINT_SEEN_KEY) && recipes.length > 1) {
      setShowHint(true);
    }
  }, [recipes.length]);

  const dismissHint = () => {
    setShowHint(false);
    localStorage.setItem(HINT_SEEN_KEY, '1');
  };

  // Восстановление позиции при монтировании/смене данных.
  // Срабатывает один раз, когда recipes уже загружены.
  useEffect(() => {
    if (restoredRef.current) return;
    if (recipes.length === 0) return;

    const savedId = sessionStorage.getItem(FEED_POSITION_KEY);
    if (!savedId) {
      restoredRef.current = true;
      return;
    }

    const idx = recipes.findIndex((r) => r.id === savedId);
    if (idx < 0) {
      // Карточка не найдена в текущей загруженной странице — просто
      // остаёмся на 0-й. Не дозагружаем страницы ради восстановления,
      // это пограничный кейс (юзер закрыл вкладку / чат сессию).
      restoredRef.current = true;
      return;
    }

    // Скроллим к карточке после того, как DOM отрендерит все <FeedCard>.
    // requestAnimationFrame гарантирует что элементы уже в DOM.
    requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      const target = container.querySelector(
          `[data-feed-item][data-index="${idx}"]`
      ) as HTMLElement | null;
      if (target) {
        // instant — мгновенно, без анимации скролла (не нужен при возврате)
        target.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
        setActiveIndex(idx);
      }
      restoredRef.current = true;
    });
  }, [recipes.length]);

  // Помечаем первую видимую карточку как увиденную сразу при загрузке ленты —
  // без этого юзер, который открыл ленту и сразу ушёл, завтра увидит ровно
  // ту же самую первую карточку (shuffle детерминирован).
  useEffect(() => {
    if (!userId || recipes.length === 0) return;
    markAsViewed(userId, recipes[0].id);
  }, [userId, recipes.length > 0 ? recipes[0].id : null]);

  // IntersectionObserver: трекаем какая карточка видна, подгружаем страницы,
  // помечаем увиденное в localStorage, запоминаем позицию в sessionStorage.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
              const idx = Number((entry.target as HTMLElement).dataset.index);
              setActiveIndex(idx);

              // Сохраняем позицию — по id, не по индексу (данные могут измениться)
              const recipe = recipes[idx];
              if (recipe) {
                sessionStorage.setItem(FEED_POSITION_KEY, recipe.id);
                // Помечаем как виденное (идемпотентно)
                if (userId) markAsViewed(userId, recipe.id);
              }

              // Скрыть hint при первом свайпе
              if (idx > 0) dismissHint();
              // Если долистали до предпоследнего — грузим следующую страницу
              if (idx >= recipes.length - 3 && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }
          });
        },
        {
          root: container,
          threshold: [0.6]
        }
    );

    container.querySelectorAll('[data-feed-item]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [recipes.length, hasNextPage, isFetchingNextPage, fetchNextPage, userId]);

  if (isLoading) {
    return (
        <div className={styles.centered}>
          <div className={styles.spinner} />
        </div>
    );
  }

  if (isError) {
    return (
        <div className={styles.centered}>
          <p className={styles.errorText}>⚠️ Не удалось загрузить ленту</p>
        </div>
    );
  }

  if (recipes.length === 0) {
    return (
        <div className={styles.centered}>
          <div className={styles.emptyIcon}>🥘</div>
          <h2 className={styles.emptyTitle}>Пока пусто</h2>
          <p className={styles.emptyText}>Рецепты скоро появятся.</p>
        </div>
    );
  }

  return (
      <div className={styles.root}>
        {/* Header поверх ленты */}
        <FeedHeader profile={profile} onAvatarClick={() => navigate('/profile')} />

        {/* Hint про свайп */}
        {showHint && <SwipeHint onDismiss={dismissHint} />}

        {/* Контейнер со scroll-snap */}
        <div ref={containerRef} className={styles.feed}>
          {recipes.map((recipe, idx) => (
              <FeedCard
                  key={recipe.id}
                  recipe={recipe}
                  index={idx}
                  isActive={idx === activeIndex}
              />
          ))}

          {/* Индикатор подгрузки */}
          {isFetchingNextPage && (
              <div className={styles.loadingMore}>
                <div className={styles.spinner} />
              </div>
          )}

          {/* Конец ленты */}
          {!hasNextPage && recipes.length > 0 && (
              <div className={styles.endOfFeed}>
                <div className={styles.endIcon}>🎉</div>
                <p>Ты долистал до конца!</p>
                <p className={styles.endSub}>Больше рецептов будет добавлено.</p>
              </div>
          )}
        </div>
      </div>
  );
}

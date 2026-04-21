import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { FeedCard } from './components/FeedCard';
import { FeedHeader } from './components/FeedHeader';
import { SwipeHint } from './components/SwipeHint';
import styles from './FeedPage.module.scss';
import {useRecipesFeed} from "@/hook/useRecipes.ts";

const HINT_SEEN_KEY = 'cb_swipe_hint_seen';

export function FeedPage() {
  const profile = useAuthStore((s) => s.profile);
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

  // Активный индекс рецепта в ленте — для prefetch следующих
  const [activeIndex, setActiveIndex] = useState(0);

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

  // IntersectionObserver: трекаем какая карточка видна, подгружаем страницы
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            setActiveIndex(idx);
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
  }, [recipes.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

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

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useMyCookSessions, type CookSessionWithRecipe } from '@/hooks/useCookSessions';
import { useSavedRecipes } from '@/hooks/useSaved';
import { useMyRecipes } from '@/hooks/useMyRecipes';
import { CookSessionModal } from './components/CookSessionModal';
import styles from './ProfilePage.module.scss';

const LEVEL_LABEL: Record<string, string> = {
  novice: 'Новичок',
  amateur: 'Любитель',
  advanced: 'Продвинутый',
  chef: 'Шеф',
  master_chef: 'Мастер-шеф'
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Черновик',
  pending: 'На модерации',
  published: 'Опубликован',
  rejected: 'Отклонён'
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'var(--color-text-muted)',
  pending: 'var(--color-gold)',
  published: 'var(--color-success)',
  rejected: '#ff6b6b'
};

type Tab = 'cooked' | 'saved' | 'my';

export function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, user, signOut } = useAuthStore();

  const initialTab = (searchParams.get('tab') as Tab) || 'cooked';
  const [tab, setTab] = useState<Tab>(initialTab);

  // Выбранная сессия для показа в модалке. null = модалка закрыта.
  const [selectedSession, setSelectedSession] = useState<CookSessionWithRecipe | null>(null);

  const changeTab = (t: Tab) => {
    setTab(t);
    setSearchParams({ tab: t });
  };

  const { data: cookSessions, isLoading: sessionsLoading } = useMyCookSessions();
  const { data: savedRecipes, isLoading: savedLoading } = useSavedRecipes();
  const { data: myRecipes, isLoading: myLoading } = useMyRecipes();

  if (!profile) return null;

  return (
      <div className={styles.root}>
        {/* Header */}
        <section className={styles.header}>
          <div className={styles.avatar}>
            {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name} />
            ) : (
                <div className={styles.avatarPlaceholder}>
                  {profile.display_name.charAt(0).toUpperCase()}
                </div>
            )}
          </div>

          <h1 className={styles.displayName}>{profile.display_name}</h1>
          <p className={styles.username}>@{profile.username}</p>
          <div className={styles.levelBadge}>{LEVEL_LABEL[profile.level]}</div>

          {/* Кнопки действий — создать и (для админов) модерация */}
          <div className={styles.actionButtons}>
            <button className={styles.createBtn} onClick={() => navigate('/create')}>
              ➕ Создать рецепт
            </button>
            {profile.is_admin && (
                <button className={styles.adminBtn} onClick={() => navigate('/admin')}>
                  🛡 Админка
                </button>
            )}
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statValue}>{profile.total_xp}</div>
              <div className={styles.statLabel}>XP</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>{profile.dishes_cooked}</div>
              <div className={styles.statLabel}>блюд</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>
                {profile.current_streak}
                {profile.current_streak > 0 && <span style={{ marginLeft: 4 }}>🔥</span>}
              </div>
              <div className={styles.statLabel}>streak</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>
                {profile.avg_ai_score?.toFixed(1) ?? '—'}
              </div>
              <div className={styles.statLabel}>ср. оценка</div>
            </div>
          </div>
        </section>

        {/* Табы */}
        <div className={styles.tabs}>
          <button
              className={`${styles.tab} ${tab === 'cooked' ? styles.tabActive : ''}`}
              onClick={() => changeTab('cooked')}
          >
            🍳 Приготовлено
            {cookSessions && cookSessions.length > 0 && (
                <span className={styles.tabCount}>{cookSessions.length}</span>
            )}
          </button>
          <button
              className={`${styles.tab} ${tab === 'saved' ? styles.tabActive : ''}`}
              onClick={() => changeTab('saved')}
          >
            ❤️ Сохранено
            {savedRecipes && savedRecipes.length > 0 && (
                <span className={styles.tabCount}>{savedRecipes.length}</span>
            )}
          </button>
          <button
              className={`${styles.tab} ${tab === 'my' ? styles.tabActive : ''}`}
              onClick={() => changeTab('my')}
          >
            📝 Мои
            {myRecipes && myRecipes.length > 0 && (
                <span className={styles.tabCount}>{myRecipes.length}</span>
            )}
          </button>
        </div>

        {/* Контент таба */}
        <div className={styles.content}>
          {tab === 'cooked' && (
              <>
                {sessionsLoading ? (
                    <div className={styles.loading}><div className={styles.spinner} /></div>
                ) : !cookSessions || cookSessions.length === 0 ? (
                    <div className={styles.empty}>
                      <div className={styles.emptyIcon}>🍳</div>
                      <p className={styles.emptyTitle}>Ты ещё ничего не готовил</p>
                      <p className={styles.emptyText}>Приготовь первое блюдо — и оно появится здесь с оценкой AI.</p>
                      <button className={styles.emptyBtn} onClick={() => navigate('/')}>
                        Выбрать рецепт
                      </button>
                    </div>
                ) : (
                    <div className={styles.grid}>
                      {cookSessions.map((session) => (
                          <button
                              key={session.id}
                              className={styles.cookItem}
                              onClick={() => setSelectedSession(session)}
                          >
                            <div className={styles.cookImageWrap}>
                              <img
                                  src={session.photo_url}
                                  alt={session.recipe?.title ?? ''}
                                  className={styles.cookImage}
                                  loading="lazy"
                              />
                              <div className={styles.scoreBadge}>{session.ai_score}</div>
                            </div>
                            {session.recipe && (
                                <div className={styles.cookTitle}>{session.recipe.title}</div>
                            )}
                          </button>
                      ))}
                    </div>
                )}
              </>
          )}

          {tab === 'saved' && (
              <>
                {savedLoading ? (
                    <div className={styles.loading}><div className={styles.spinner} /></div>
                ) : !savedRecipes || savedRecipes.length === 0 ? (
                    <div className={styles.empty}>
                      <div className={styles.emptyIcon}>❤️</div>
                      <p className={styles.emptyTitle}>Нет сохранённых рецептов</p>
                      <p className={styles.emptyText}>Жми на сердечко в ленте, чтобы сохранить рецепт на будущее.</p>
                      <button className={styles.emptyBtn} onClick={() => navigate('/')}>
                        В ленту
                      </button>
                    </div>
                ) : (
                    <div className={styles.grid}>
                      {savedRecipes.map((recipe) => (
                          <button
                              key={recipe.id}
                              className={styles.cookItem}
                              onClick={() => navigate(`/recipe/${recipe.id}`)}
                          >
                            <div className={styles.cookImageWrap}>
                              {recipe.image_url ? (
                                  <img
                                      src={recipe.image_url}
                                      alt={recipe.title}
                                      className={styles.cookImage}
                                      loading="lazy"
                                  />
                              ) : (
                                  <div className={styles.cookImagePlaceholder}>🍴</div>
                              )}
                            </div>
                            <div className={styles.cookTitle}>{recipe.title}</div>
                          </button>
                      ))}
                    </div>
                )}
              </>
          )}

          {tab === 'my' && (
              <>
                {myLoading ? (
                    <div className={styles.loading}><div className={styles.spinner} /></div>
                ) : !myRecipes || myRecipes.length === 0 ? (
                    <div className={styles.empty}>
                      <div className={styles.emptyIcon}>📝</div>
                      <p className={styles.emptyTitle}>Ещё нет своих рецептов</p>
                      <p className={styles.emptyText}>Поделись своим любимым блюдом — после модерации оно появится в общей ленте.</p>
                      <button className={styles.emptyBtn} onClick={() => navigate('/create')}>
                        ➕ Создать рецепт
                      </button>
                    </div>
                ) : (
                    <div className={styles.myList}>
                      {myRecipes.map((recipe) => (
                          <button
                              key={recipe.id}
                              className={styles.myItem}
                              onClick={() => navigate(`/recipe/${recipe.id}`)}
                          >
                            <div className={styles.myImageWrap}>
                              {recipe.image_url ? (
                                  <img src={recipe.image_url} alt={recipe.title} loading="lazy" />
                              ) : (
                                  <div className={styles.cookImagePlaceholder}>🍴</div>
                              )}
                            </div>
                            <div className={styles.myContent}>
                              <div className={styles.myTitle}>{recipe.title}</div>
                              <div
                                  className={styles.myStatus}
                                  style={{ color: STATUS_COLOR[recipe.status] }}
                              >
                                {STATUS_LABEL[recipe.status]}
                                {recipe.status === 'rejected' && recipe.rejection_reason && (
                                    <span className={styles.myReason}> — {recipe.rejection_reason}</span>
                                )}
                              </div>
                            </div>
                          </button>
                      ))}
                    </div>
                )}
              </>
          )}
        </div>

        {/* Инфо и выход */}
        <div className={styles.footer}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Email</span>
            <span className={styles.infoValue}>{user?.email}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Тариф</span>
            <span className={styles.infoValue}>
            {profile.plan === 'free' ? 'Free' : profile.plan === 'pro' ? '⭐ Pro' : '👨‍👩‍👧 Family'}
          </span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Рекорд streak</span>
            <span className={styles.infoValue}>{profile.longest_streak} дней</span>
          </div>

          <button onClick={signOut} className={styles.signOutBtn}>
            Выйти
          </button>
        </div>

        {/* Модалка просмотра результата AI */}
        {selectedSession && (
            <CookSessionModal
                session={selectedSession}
                onClose={() => setSelectedSession(null)}
            />
        )}
      </div>
  );
}

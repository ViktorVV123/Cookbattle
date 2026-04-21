import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import styles from './ProfilePage.module.scss';
import {useMyCookSessions} from "@/hook/useCookSessions.ts";
import {useSavedRecipes} from "@/hook/useSaved.ts";

const LEVEL_LABEL: Record<string, string> = {
  novice: 'Новичок',
  amateur: 'Любитель',
  advanced: 'Продвинутый',
  chef: 'Шеф',
  master_chef: 'Мастер-шеф'
};

type Tab = 'cooked' | 'saved';

export function ProfilePage() {
  const navigate = useNavigate();
  const { profile, user, signOut } = useAuthStore();
  const [tab, setTab] = useState<Tab>('cooked');

  const { data: cookSessions, isLoading: sessionsLoading } = useMyCookSessions();
  const { data: savedRecipes, isLoading: savedLoading } = useSavedRecipes();

  if (!profile) return null;

  return (
    <div className={styles.root}>
      {/* Шапка профиля */}
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
          onClick={() => setTab('cooked')}
        >
          🍳 Приготовлено
          {cookSessions && cookSessions.length > 0 && (
            <span className={styles.tabCount}>{cookSessions.length}</span>
          )}
        </button>
        <button
          className={`${styles.tab} ${tab === 'saved' ? styles.tabActive : ''}`}
          onClick={() => setTab('saved')}
        >
          ❤️ Сохранено
          {savedRecipes && savedRecipes.length > 0 && (
            <span className={styles.tabCount}>{savedRecipes.length}</span>
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
                    onClick={() => session.recipe && navigate(`/recipe/${session.recipe.id}`)}
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
    </div>
  );
}

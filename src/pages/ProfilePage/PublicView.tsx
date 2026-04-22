import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    usePublicProfile,
    usePublicCookSessions,
    usePublicRecipes,
    type PublicCookSession
} from '@/hooks/usePublicProfile';
import { CookSessionModal } from './components/CookSessionModal';
import styles from './ProfilePage.module.scss';
import type { CookSessionWithRecipe } from '@/hooks/useCookSessions';

const LEVEL_LABEL: Record<string, string> = {
    novice: 'Новичок',
    amateur: 'Любитель',
    advanced: 'Продвинутый',
    chef: 'Шеф',
    master_chef: 'Мастер-шеф'
};

type Tab = 'cooked' | 'recipes';

interface Props {
    username: string;
}

export function PublicView({ username }: Props) {
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('cooked');
    // Для модалки AI-результата. На публичном профиле показывать её можно,
    // но без кнопки "Поделиться" (это же чужое блюдо), только просмотр.
    const [selectedSession, setSelectedSession] = useState<PublicCookSession | null>(null);

    const { data: profile, isLoading: profileLoading, isError } = usePublicProfile(username);
    const { data: cookSessions, isLoading: sessionsLoading } = usePublicCookSessions(profile?.id);
    const { data: recipes, isLoading: recipesLoading } = usePublicRecipes(profile?.id);

    if (profileLoading) {
        return (
            <div className={styles.root}>
                <div className={styles.loading}><div className={styles.spinner} /></div>
            </div>
        );
    }

    if (isError || !profile) {
        return (
            <div className={styles.root}>
                <div className={styles.empty}>
                    <div className={styles.emptyIcon}>🤷</div>
                    <p className={styles.emptyTitle}>Пользователь не найден</p>
                    <p className={styles.emptyText}>Возможно, этот аккаунт удалён или имя написано неверно.</p>
                    <button className={styles.emptyBtn} onClick={() => navigate('/')}>
                        В ленту
                    </button>
                </div>
            </div>
        );
    }

    // Адаптер — CookSessionModal ждёт CookSessionWithRecipe, а у нас
    // PublicCookSession (она совместима по форме, только recipe чуть толще)
    const adaptedSession = (s: PublicCookSession | null): CookSessionWithRecipe | null => {
        if (!s) return null;
        return {
            ...s,
            recipe: s.recipe
                ? {
                    id: s.recipe.id,
                    title: s.recipe.title,
                    image_url: s.recipe.image_url,
                    cuisine: s.recipe.cuisine,
                    category: s.recipe.category
                }
                : null
        };
    };

    return (
        <div className={styles.root}>
            {/* Навигация назад */}
            <div className={styles.publicBackBar}>
                <button
                    type="button"
                    className={styles.publicBackBtn}
                    onClick={() => navigate(-1)}
                    aria-label="Назад"
                >
                    ← Назад
                </button>
            </div>

            {/* Header — публичный, без кнопок действий */}
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

            {/* Табы — только 2 (нет "Сохранённое", это приватное) */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${tab === 'cooked' ? styles.tabActive : ''}`}
                    onClick={() => setTab('cooked')}
                >
                    🍳 Готовил
                    {cookSessions && cookSessions.length > 0 && (
                        <span className={styles.tabCount}>{cookSessions.length}</span>
                    )}
                </button>
                <button
                    className={`${styles.tab} ${tab === 'recipes' ? styles.tabActive : ''}`}
                    onClick={() => setTab('recipes')}
                >
                    📝 Рецепты
                    {recipes && recipes.length > 0 && (
                        <span className={styles.tabCount}>{recipes.length}</span>
                    )}
                </button>
            </div>

            {/* Контент */}
            <div className={styles.content}>
                {tab === 'cooked' && (
                    <>
                        {sessionsLoading ? (
                            <div className={styles.loading}><div className={styles.spinner} /></div>
                        ) : !cookSessions || cookSessions.length === 0 ? (
                            <div className={styles.empty}>
                                <div className={styles.emptyIcon}>🍳</div>
                                <p className={styles.emptyTitle}>Ещё ничего не готовил</p>
                                <p className={styles.emptyText}>Когда {profile.display_name} приготовит первое блюдо — оно появится здесь.</p>
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

                {tab === 'recipes' && (
                    <>
                        {recipesLoading ? (
                            <div className={styles.loading}><div className={styles.spinner} /></div>
                        ) : !recipes || recipes.length === 0 ? (
                            <div className={styles.empty}>
                                <div className={styles.emptyIcon}>📝</div>
                                <p className={styles.emptyTitle}>Нет опубликованных рецептов</p>
                                <p className={styles.emptyText}>Когда {profile.display_name} поделится рецептом — он появится здесь.</p>
                            </div>
                        ) : (
                            <div className={styles.grid}>
                                {recipes.map((recipe) => (
                                    <button
                                        key={recipe.id}
                                        className={styles.cookItem}
                                        onClick={() => navigate(`/recipe/${recipe.id}`)}
                                    >
                                        <div className={styles.cookImageWrap}>
                                            {recipe.image_url ? (
                                                <img src={recipe.image_url} alt={recipe.title} className={styles.cookImage} loading="lazy" />
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

            {/* Модалка AI-результата — та же что в OwnerView */}
            {selectedSession && adaptedSession(selectedSession) && (
                <CookSessionModal
                    session={adaptedSession(selectedSession)!}
                    onClose={() => setSelectedSession(null)}
                />
            )}
        </div>
    );
}

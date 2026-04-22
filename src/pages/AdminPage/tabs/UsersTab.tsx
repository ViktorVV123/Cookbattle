import { useState, useMemo } from 'react';
import {
    useAllUsers,
    useBlockUser,
    useUnblockUser,
    useToggleAdmin,
    type AdminUser
} from '@/hooks/useAdmin';
import { useAuthStore } from '@/store/authStore';
import styles from '../AdminPage.module.scss';

type UserFilter = 'all' | 'admins' | 'blocked' | 'active';

export function UsersTab() {
    const currentUserId = useAuthStore((s) => s.user?.id);
    const { data: users, isLoading } = useAllUsers();

    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<UserFilter>('all');
    const [blockingUser, setBlockingUser] = useState<AdminUser | null>(null);
    const [blockReason, setBlockReason] = useState('');

    const blockMutation = useBlockUser();
    const unblockMutation = useUnblockUser();
    const toggleAdminMutation = useToggleAdmin();

    const filtered = useMemo(() => {
        if (!users) return [];

        let result = users;

        if (filter === 'admins') result = result.filter((u) => u.is_admin);
        else if (filter === 'blocked') result = result.filter((u) => u.is_blocked);
        else if (filter === 'active') result = result.filter((u) => !u.is_blocked);

        if (search.trim()) {
            const q = search.toLowerCase().trim();
            result = result.filter(
                (u) =>
                    u.display_name.toLowerCase().includes(q) ||
                    u.username.toLowerCase().includes(q) ||
                    u.email?.toLowerCase().includes(q)
            );
        }

        return result;
    }, [users, filter, search]);

    const handleBlock = async () => {
        if (!blockingUser || !blockReason.trim()) return;
        try {
            await blockMutation.mutateAsync({
                userId: blockingUser.id,
                reason: blockReason.trim()
            });
            setBlockingUser(null);
            setBlockReason('');
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleUnblock = async (user: AdminUser) => {
        if (!confirm(`Разблокировать ${user.display_name}?`)) return;
        try {
            await unblockMutation.mutateAsync(user.id);
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleToggleAdmin = async (user: AdminUser) => {
        const action = user.is_admin ? 'убрать права админа у' : 'сделать админом';
        if (!confirm(`Точно ${action} ${user.display_name}?`)) return;
        try {
            await toggleAdminMutation.mutateAsync({
                userId: user.id,
                isAdmin: !user.is_admin
            });
        } catch (e: any) {
            alert(e.message);
        }
    };

    return (
        <div className={styles.recipesTab}>
            {/* Фильтры */}
            <div className={styles.filtersBar}>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="🔍 Поиск по имени, username или email"
                    className={styles.searchInput}
                />

                <div className={styles.filterChips}>
                    <button
                        className={`${styles.filterChip} ${filter === 'all' ? styles.filterChipActive : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        Все
                    </button>
                    <button
                        className={`${styles.filterChip} ${filter === 'active' ? styles.filterChipActive : ''}`}
                        onClick={() => setFilter('active')}
                    >
                        Активные
                    </button>
                    <button
                        className={`${styles.filterChip} ${filter === 'blocked' ? styles.filterChipActive : ''}`}
                        onClick={() => setFilter('blocked')}
                    >
                        🚫 Заблокированные
                    </button>
                    <button
                        className={`${styles.filterChip} ${filter === 'admins' ? styles.filterChipActive : ''}`}
                        onClick={() => setFilter('admins')}
                    >
                        🛡 Админы
                    </button>
                </div>

                {users && (
                    <div className={styles.summary}>
                        Всего: <b>{users.length}</b> · Активных: {users.filter((u) => !u.is_blocked).length} ·
                        Заблокированных: {users.filter((u) => u.is_blocked).length} ·
                        Админов: {users.filter((u) => u.is_admin).length}
                    </div>
                )}
            </div>

            {/* Block modal */}
            {blockingUser && (
                <div className={styles.modalOverlay} onClick={() => setBlockingUser(null)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Заблокировать {blockingUser.display_name}?</h3>
                        <p className={styles.modalText}>
                            После блокировки:
                        </p>
                        <ul className={styles.modalList}>
                            <li>Юзер не сможет войти в приложение</li>
                            <li>Все его опубликованные рецепты снимаются с ленты</li>
                            <li>Рецепты на модерации автоматически отклоняются</li>
                        </ul>
                        <textarea
                            value={blockReason}
                            onChange={(e) => setBlockReason(e.target.value)}
                            placeholder="Причина блокировки (для истории)..."
                            rows={2}
                            className={styles.rejectTextarea}
                        />
                        <div className={styles.modalActions}>
                            <button
                                className={styles.btnSecondary}
                                onClick={() => { setBlockingUser(null); setBlockReason(''); }}
                            >
                                Отмена
                            </button>
                            <button
                                className={styles.btnReject}
                                onClick={handleBlock}
                                disabled={!blockReason.trim() || blockMutation.isPending}
                            >
                                {blockMutation.isPending ? 'Блокируем…' : '🚫 Заблокировать'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Список */}
            {isLoading ? (
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                </div>
            ) : filtered.length === 0 ? (
                <div className={styles.empty}>
                    <div className={styles.emptyIcon}>🙈</div>
                    <p>Никого не нашли под эти фильтры</p>
                </div>
            ) : (
                <div className={styles.usersList}>
                    {filtered.map((user) => (
                        <UserCard
                            key={user.id}
                            user={user}
                            isSelf={user.id === currentUserId}
                            onBlock={() => { setBlockingUser(user); setBlockReason(''); }}
                            onUnblock={() => handleUnblock(user)}
                            onToggleAdmin={() => handleToggleAdmin(user)}
                            busy={blockMutation.isPending || unblockMutation.isPending || toggleAdminMutation.isPending}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================================
// User card
// ============================================================

function UserCard({
                      user,
                      isSelf,
                      onBlock,
                      onUnblock,
                      onToggleAdmin,
                      busy
                  }: {
    user: AdminUser;
    isSelf: boolean;
    onBlock: () => void;
    onUnblock: () => void;
    onToggleAdmin: () => void;
    busy: boolean;
}) {
    const daysSinceJoin = Math.floor(
        (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    const lastSeen = user.last_sign_in_at
        ? formatRelative(user.last_sign_in_at)
        : 'никогда';

    return (
        <div className={`${styles.userCard} ${user.is_blocked ? styles.userCardBlocked : ''}`}>
            <div className={styles.userAvatar}>
                {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.display_name} />
                ) : (
                    <div className={styles.userAvatarPh}>
                        {user.display_name.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            <div className={styles.userBody}>
                <div className={styles.userHeader}>
                    <div className={styles.userName}>
                        {user.display_name}
                        {isSelf && <span className={styles.userSelfBadge}> (это ты)</span>}
                    </div>
                    <div className={styles.userBadges}>
                        {user.is_admin && <span className={styles.userBadgeAdmin}>🛡 Админ</span>}
                        {user.is_blocked && <span className={styles.userBadgeBlocked}>🚫 Заблокирован</span>}
                    </div>
                </div>

                <div className={styles.userMeta}>
                    <span>@{user.username}</span>
                    <span>·</span>
                    <span>{user.email}</span>
                </div>

                <div className={styles.userStats}>
                    <span title="Дней с регистрации">📅 {daysSinceJoin}д</span>
                    <span>·</span>
                    <span title="Рецептов создано">📖 {user.recipes_count}</span>
                    <span>·</span>
                    <span title="Раз готовил">🍳 {user.cook_sessions_count}</span>
                    <span>·</span>
                    <span title="Текущий streak">🔥 {user.current_streak}</span>
                    <span>·</span>
                    <span title="Общий XP">⚡ {user.total_xp}</span>
                    <span>·</span>
                    <span title="Последний вход">👁 {lastSeen}</span>
                </div>

                {user.is_blocked && user.block_reason && (
                    <div className={styles.recipeReason}>
                        🚫 {user.block_reason}
                    </div>
                )}

                {!isSelf && (
                    <div className={styles.recipeActions}>
                        {user.is_blocked ? (
                            <button
                                className={styles.btnSmallSuccess}
                                onClick={onUnblock}
                                disabled={busy}
                            >
                                ✓ Разблокировать
                            </button>
                        ) : (
                            <button
                                className={styles.btnSmallDanger}
                                onClick={onBlock}
                                disabled={busy}
                            >
                                🚫 Заблокировать
                            </button>
                        )}

                        <button
                            className={user.is_admin ? styles.btnSmallWarning : styles.btnSmallSecondary}
                            onClick={onToggleAdmin}
                            disabled={busy}
                        >
                            {user.is_admin ? '↓ Убрать админа' : '↑ Сделать админом'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================
// Utilities
// ============================================================

function formatRelative(date: string): string {
    const ms = Date.now() - new Date(date).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}с назад`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}м назад`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}ч назад`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}д назад`;
    return new Date(date).toLocaleDateString('ru');
}

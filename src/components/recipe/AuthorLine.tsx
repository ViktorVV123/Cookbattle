import { useNavigate } from 'react-router-dom';
import { useAuthor } from '@/hooks/useAuthor';
import styles from './AuthorLine.module.scss';

interface Props {
    authorId: string;
    /**
     * sm — для ленты (маленький аватар 24px, короткая инфо)
     * md — для страницы рецепта (побольше, 40px)
     */
    size?: 'sm' | 'md';
    /**
     * 'dark' — светлый текст на тёмном фоне (поверх фото в ленте)
     * 'light' — тёмный текст на светлом фоне (на странице рецепта)
     */
    variant?: 'dark' | 'light';
    /** Отключить клик (иногда нужно — например в админке превью) */
    disableNav?: boolean;
}

/**
 * Строчка автора UGC-рецепта — аватар, имя, @username, бейдж «от сообщества».
 * Клик ведёт на публичный профиль автора (/profile/:username).
 *
 * Показывается ТОЛЬКО когда authorId не null (т.е. рецепт создан юзером, а не
 * засижен из каталога). Решение показывать/не показывать — на стороне родителя.
 */
export function AuthorLine({ authorId, size = 'sm', variant = 'dark', disableNav = false }: Props) {
    const navigate = useNavigate();
    const { data: author, isLoading } = useAuthor(authorId);

    if (isLoading) {
        return (
            <div className={`${styles.root} ${styles[size]} ${styles[variant]} ${styles.skeleton}`}>
                <div className={styles.avatarSkeleton} />
                <div className={styles.textSkeleton} />
            </div>
        );
    }

    if (!author) return null;

    const handleClick = (e: React.MouseEvent) => {
        if (disableNav) return;
        e.stopPropagation(); // не пускаем клик в родительскую карточку
        navigate(`/profile/${author.username}`);
    };

    const initials = author.display_name.charAt(0).toUpperCase();

    return (
        <button
            type="button"
            className={`${styles.root} ${styles[size]} ${styles[variant]} ${disableNav ? styles.static : ''}`}
            onClick={handleClick}
            aria-label={`Автор: ${author.display_name}`}
        >
            <div className={styles.avatar}>
                {author.avatar_url ? (
                    <img src={author.avatar_url} alt={author.display_name} />
                ) : (
                    <div className={styles.avatarPlaceholder}>{initials}</div>
                )}
            </div>

            <div className={styles.text}>
                <div className={styles.name}>{author.display_name}</div>
                <div className={styles.username}>@{author.username}</div>
            </div>

            <span className={styles.badge}>от сообщества</span>
        </button>
    );
}

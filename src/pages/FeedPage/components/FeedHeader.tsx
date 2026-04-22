import type { Profile } from '@/types/database';
import { ChefHatLogo } from '@/components/common/ChefHatLogo';
import styles from './FeedHeader.module.scss';

interface Props {
    profile: Profile | null;
    onAvatarClick: () => void;
}

export function FeedHeader({ profile, onAvatarClick }: Props) {
    return (
        <header className={styles.header}>
            <button className={styles.avatar} onClick={onAvatarClick} aria-label="Профиль">
                {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.display_name} />
                ) : (
                    <span className={styles.avatarPlaceholder}>
            {(profile?.display_name?.charAt(0) ?? '?').toUpperCase()}
          </span>
                )}
            </button>

            <div className={styles.logo}>
                <ChefHatLogo size={28} className={styles.logoIcon} />
                <span className={styles.logoText}>CookBattle</span>
            </div>

            {profile && (
                <div className={styles.stats}>
                    {profile.current_streak > 0 && (
                        <div className={styles.stat}>
                            <span className={styles.statIcon}>🔥</span>
                            <span className={styles.statValue}>{profile.current_streak}</span>
                        </div>
                    )}
                    <div className={styles.stat}>
                        <span className={styles.statIcon}>⚡</span>
                        <span className={styles.statValue}>{profile.total_xp}</span>
                    </div>
                </div>
            )}
        </header>
    );
}

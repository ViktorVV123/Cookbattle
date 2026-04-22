import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { OwnerView } from './OwnerView';
import { PublicView } from './PublicView';

/**
 * Роутер профиля:
 *   /profile                — свой профиль (OwnerView)
 *   /profile/:username      — публичный профиль юзера (PublicView)
 *
 * Если юзер зашёл на /profile/:username где username совпадает с его
 * собственным — редиректим на /profile, чтобы не было дублирующихся URL.
 */
export function ProfilePage() {
    const { username } = useParams<{ username: string }>();
    const myUsername = useAuthStore((s) => s.profile?.username);
    const navigate = useNavigate();

    // Редирект свой-на-свой: /profile/myusername → /profile
    useEffect(() => {
        if (username && myUsername && username === myUsername) {
            navigate('/profile', { replace: true });
        }
    }, [username, myUsername, navigate]);

    if (username && username !== myUsername) {
        return <PublicView username={username} />;
    }

    return <OwnerView />;
}

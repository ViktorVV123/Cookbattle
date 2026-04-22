import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/layout/AppLayout';
import { FeedPage } from '@/pages/FeedPage';
import { SearchPage } from '@/pages/SearchPage';
import { RecipePage } from '@/pages/RecipePage';
import { CookPage } from '@/pages/CookPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AuthPage } from '@/pages/AuthPage';
import { CreateRecipePage } from '@/pages/CreateRecipePage';

import { SplashScreen } from '@/components/common/SplashScreen';

import {AdminPage} from "@/pages/AdminPage";
import {ModerationTab} from "@/pages/AdminPage/tabs/ModerationTab.tsx";
import {RecipesTab} from "@/pages/AdminPage/tabs/RecipesTab.tsx";
import {UsersTab} from "@/pages/AdminPage/tabs/UsersTab.tsx";
import {DashboardTab} from "@/pages/AdminPage/tabs/DashboardTab.tsx";
import {useEffect} from "react";

function App() {
    const { user, loading, init } = useAuthStore();

    useEffect(() => {
        init();
    }, [init]);

    if (loading) return <SplashScreen />;

    if (!user) {
        // Незалогиненные попадают на /auth. AuthPage сам рендерит лендинг
        // с hero-секцией и боттом-шитом для формы входа/регистрации.
        // Всё с /* редиректится на /auth.
        return (
            <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="*" element={<Navigate to="/auth" replace />} />
            </Routes>
        );
    }

    return (
        <Routes>
            {/* Fullscreen — без AppLayout */}
            <Route path="/create" element={<CreateRecipePage />} />

            {/* Админка с табами */}
            <Route path="/admin" element={<AdminPage />}>
                <Route index element={<Navigate to="moderation" replace />} />
                <Route path="moderation" element={<ModerationTab />} />
                <Route path="recipes" element={<RecipesTab />} />
                <Route path="users" element={<UsersTab />} />
                <Route path="dashboard" element={<DashboardTab />} />
            </Route>

            {/* Старый роут — редирект на новый */}
            <Route path="/admin/pending" element={<Navigate to="/admin/moderation" replace />} />

            <Route element={<AppLayout />}>
                <Route path="/" element={<FeedPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/recipe/:id" element={<RecipePage />} />
                <Route path="/cook/:id" element={<CookPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/profile/:username" element={<ProfilePage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
}

export default App;

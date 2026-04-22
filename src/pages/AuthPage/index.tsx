import { useState } from 'react';
import { LandingPage } from './LandingPage';
import { AuthSheet } from './AuthSheet';

type SheetMode = 'login' | 'register';

/**
 * Страница для незалогиненных юзеров (роут /auth в App.tsx).
 * Показывает лендинг с CTA; форма авторизации открывается в боттом-шите.
 *
 * Для залогиненных юзеров эта страница вообще не рендерится —
 * App.tsx редиректит их в основное приложение.
 */
export function AuthPage() {
    const [sheetOpen, setSheetOpen] = useState(false);
    const [sheetMode, setSheetMode] = useState<SheetMode>('register');

    const openLogin = () => {
        setSheetMode('login');
        setSheetOpen(true);
    };

    const openRegister = () => {
        setSheetMode('register');
        setSheetOpen(true);
    };

    return (
        <>
            <LandingPage onLogin={openLogin} onRegister={openRegister} />
            <AuthSheet
                open={sheetOpen}
                initialMode={sheetMode}
                onClose={() => setSheetOpen(false)}
            />
        </>
    );
}

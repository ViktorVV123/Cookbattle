import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';
import type { Profile } from '@/types/database';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  init: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

/**
 * Таймаут на запросы — чтобы refreshProfile не висел вечно если сеть
 * ушла спать (при возврате на вкладку после долгого отсутствия).
 * Если таймаут истёк — не ломаем state, просто оставляем старый profile.
 */
const FETCH_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), ms)
    )
  ]);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,

  init: async () => {
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, user: data.session?.user ?? null });

    if (data.session?.user) {
      await get().refreshProfile();
    }
    set({ loading: false });

    // Supabase триггерит onAuthStateChange не только при sign in/out,
    // но и при:
    //   - TOKEN_REFRESHED (автоматическое обновление токена каждые ~55 мин)
    //   - возврате на вкладку после долгого отсутствия
    //   - переходе со сторонней страницы обратно
    //
    // Без защиты: каждый такой триггер сбрасывает user reference → React
    // видит "изменения" → все хуки с enabled: !!userId рестартуют → куча
    // лишних запросов. Плюс — если refreshProfile зависнет (сеть спит),
    // profile остаётся null и App.tsx рендерит SplashScreen вечно.
    supabase.auth.onAuthStateChange(async (event, session) => {
      const prevUserId = get().user?.id;
      const nextUserId = session?.user?.id ?? null;

      // Пользователь не поменялся (TOKEN_REFRESHED или просто возврат на вкладку)
      // → обновляем только session, не трогаем user и не дёргаем refreshProfile.
      // Это ключевой фикс пустого экрана при навигации.
      if (prevUserId === nextUserId) {
        set({ session });
        return;
      }

      // Пользователь реально поменялся (sign in, sign out, смена аккаунта)
      if (session?.user) {
        set({ session, user: session.user });
        try {
          // Даже если refreshProfile зависнет — не роняем всё приложение
          await withTimeout(get().refreshProfile(), FETCH_TIMEOUT_MS);
        } catch (e) {
          console.warn('[auth] refreshProfile после auth-события не отработал:', e);
        }
      } else {
        // Signed out
        set({ session: null, user: null, profile: null });
      }

      // Дополнительная защита: некоторые события (например PASSWORD_RECOVERY)
      // нам вообще не интересны — игнорируем
      if (event === 'PASSWORD_RECOVERY') {
        return;
      }
    });
  },

  refreshProfile: async () => {
    const user = get().user;
    if (!user) return;
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (error) {
      console.error('[auth] refreshProfile error:', error);
      return;
    }

    // Проверка блокировки — если заблокирован, force logout
    if (data && (data as any).is_blocked === true) {
      const reason = (data as any).block_reason ?? 'Нарушение правил';
      alert(
          `Ваш аккаунт заблокирован.\n\nПричина: ${reason}\n\nЕсли считаете это ошибкой — свяжитесь с поддержкой.`
      );
      await supabase.auth.signOut();
      set({ session: null, user: null, profile: null });
      return;
    }

    set({ profile: data });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  }
}));

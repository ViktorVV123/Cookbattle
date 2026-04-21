import { useState } from 'react';
import { supabase } from '@/services/supabase';
import styles from './AuthPage.module.scss';

type Mode = 'login' | 'register' | 'magic';

function humanizeError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Неверный email или пароль';
  if (m.includes('user already registered')) return 'На этот email уже есть аккаунт — войди по паролю';
  if (m.includes('password should be at least')) return 'Пароль должен быть минимум 6 символов';
  if (m.includes('unable to validate email')) return 'Проверь формат email';
  if (m.includes('email rate limit')) return 'Слишком много попыток. Подожди пару минут.';
  return msg;
}

export function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'magicSent' | 'registerSent'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const reset = () => {
    setErrMsg('');
    setStatus('idle');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setStatus('loading');
    setErrMsg('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus('idle');
      setErrMsg(humanizeError(error.message));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !email || !password) return;
    if (displayName.trim().length < 2) {
      setErrMsg('Имя слишком короткое');
      return;
    }
    if (password !== passwordConfirm) {
      setErrMsg('Пароли не совпадают');
      return;
    }
    if (password.length < 6) {
      setErrMsg('Пароль минимум 6 символов');
      return;
    }

    setStatus('loading');
    setErrMsg('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        // Передаём имя в raw_user_meta_data — триггер handle_new_user его заберёт
        data: { display_name: displayName.trim() }
      }
    });

    if (error) {
      setStatus('idle');
      setErrMsg(humanizeError(error.message));
      return;
    }

    if (!data.session) {
      setStatus('registerSent');
    }
  };

  const handleMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    setErrMsg('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });

    if (error) {
      setStatus('idle');
      setErrMsg(humanizeError(error.message));
    } else {
      setStatus('magicSent');
    }
  };

  if (status === 'magicSent' || status === 'registerSent') {
    return (
        <div className={styles.root}>
          <div className={styles.logo}>📬</div>
          <h1 className={styles.title}>Почти на месте!</h1>
          <p className={styles.subtitle}>
            {status === 'magicSent'
                ? <>Письмо улетело на <b>{email}</b>.<br />Открой ссылку из него — и ты внутри.</>
                : <>На <b>{email}</b> пришло письмо для подтверждения.<br />Открой ссылку — и можно начинать готовить.</>
            }
          </p>
          <button
              type="button"
              className={styles.linkButton}
              onClick={() => { reset(); setMode('login'); }}
          >
            ← Назад
          </button>
        </div>
    );
  }

  return (
      <div className={styles.root}>
        <div className={styles.logo}>🍳</div>
        <h1 className={styles.title}>CookBattle</h1>
        <p className={styles.subtitle}>Готовь. Фоткай. Получай оценку AI.</p>

        {mode !== 'magic' && (
            <div className={styles.tabs}>
              <button
                  type="button"
                  className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
                  onClick={() => { setMode('login'); reset(); }}
              >
                Вход
              </button>
              <button
                  type="button"
                  className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
                  onClick={() => { setMode('register'); reset(); }}
              >
                Регистрация
              </button>
            </div>
        )}

        {/* LOGIN */}
        {mode === 'login' && (
            <form onSubmit={handleLogin} className={styles.form}>
              <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={styles.input}
                  autoComplete="email"
                  autoFocus
              />
              <input
                  type="password"
                  placeholder="Пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={styles.input}
                  autoComplete="current-password"
              />
              <button type="submit" className={styles.button} disabled={status === 'loading'}>
                {status === 'loading' ? 'Проверяем…' : 'Войти'}
              </button>
              {errMsg && <div className={styles.error}>{errMsg}</div>}

              <div className={styles.divider}><span>или</span></div>

              <button
                  type="button"
                  className={styles.buttonSecondary}
                  onClick={() => { setMode('magic'); reset(); }}
              >
                ✨ Войти по ссылке из почты
              </button>
            </form>
        )}

        {/* REGISTER */}
        {mode === 'register' && (
            <form onSubmit={handleRegister} className={styles.form}>
              <input
                  type="text"
                  placeholder="Как тебя зовут?"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  maxLength={40}
                  className={styles.input}
                  autoComplete="given-name"
                  autoFocus
              />
              <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={styles.input}
                  autoComplete="email"
              />
              <input
                  type="password"
                  placeholder="Пароль (минимум 6 символов)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={styles.input}
                  autoComplete="new-password"
              />
              <input
                  type="password"
                  placeholder="Повтори пароль"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  minLength={6}
                  className={styles.input}
                  autoComplete="new-password"
              />
              <button type="submit" className={styles.button} disabled={status === 'loading'}>
                {status === 'loading' ? 'Создаём…' : 'Зарегистрироваться'}
              </button>
              {errMsg && <div className={styles.error}>{errMsg}</div>}
              <p className={styles.hint}>
                После регистрации придёт письмо для подтверждения email.
              </p>
            </form>
        )}

        {/* MAGIC */}
        {mode === 'magic' && (
            <form onSubmit={handleMagic} className={styles.form}>
              <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={styles.input}
                  autoComplete="email"
                  autoFocus
              />
              <button type="submit" className={styles.button} disabled={status === 'loading'}>
                {status === 'loading' ? 'Отправляем…' : 'Прислать ссылку'}
              </button>
              {errMsg && <div className={styles.error}>{errMsg}</div>}
              <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => { setMode('login'); reset(); }}
              >
                ← Войти по паролю
              </button>
            </form>
        )}
      </div>
  );
}

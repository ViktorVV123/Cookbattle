import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
    children: ReactNode;
    /** Можно передать свой fallback-компонент, если дефолтный не подходит */
    fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
    error: Error | null;
}

/**
 * Error Boundary — страховка от любых ошибок рендера компонентов.
 * Без него ошибка в одном компоненте валит всё приложение и показывает
 * белый экран без информации. С ним — показываем дружелюбный UI с кнопкой
 * восстановления.
 *
 * Ловит только ошибки рендера React-компонентов. НЕ ловит:
 *  - Ошибки в promise-ах и async/await (React Query сам их обрабатывает)
 *  - Ошибки в event handler'ах
 *  - Ошибки в useEffect
 *
 * Это ок — React Query, zustand и прочие библиотеки имеют свою обработку
 * ошибок. Задача Boundary — поймать именно то что ломает рендер-цикл.
 */
export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // В проде можно отправлять в Sentry / LogRocket и т.п.
        console.error('[ErrorBoundary] caught:', error, info);
    }

    reset = () => {
        this.setState({ error: null });
    };

    render() {
        if (this.state.error) {
            if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.reset);
            }

            return (
                <div
                    style={{
                        minHeight: '100dvh',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px',
                        background: 'var(--color-bg)',
                        color: 'var(--color-text)',
                        textAlign: 'center'
                    }}
                >
                    <div style={{ fontSize: 64, marginBottom: 16 }}>😬</div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
                        Что-то пошло не так
                    </h1>
                    <p style={{ color: 'var(--color-text-dim)', maxWidth: 340, marginBottom: 24, lineHeight: 1.5 }}>
                        Приложение споткнулось на этой странице. Попробуй обновить — обычно помогает.
                    </p>
                    <div style={{ display: 'flex', gap: 12, flexDirection: 'column', width: '100%', maxWidth: 280 }}>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                padding: '14px 24px',
                                background: 'var(--color-primary)',
                                color: '#fff',
                                fontWeight: 700,
                                borderRadius: 14,
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 15
                            }}
                        >
                            🔄 Обновить страницу
                        </button>
                        <button
                            onClick={this.reset}
                            style={{
                                padding: '12px 24px',
                                background: 'var(--color-surface)',
                                color: 'var(--color-text)',
                                fontWeight: 600,
                                borderRadius: 14,
                                border: '1px solid var(--color-border)',
                                cursor: 'pointer',
                                fontSize: 14
                            }}
                        >
                            Попробовать снова
                        </button>
                    </div>
                    {import.meta.env.DEV && (
                        <details
                            style={{
                                marginTop: 32,
                                maxWidth: 480,
                                width: '100%',
                                textAlign: 'left',
                                fontSize: 12,
                                color: 'var(--color-text-muted)'
                            }}
                        >
                            <summary style={{ cursor: 'pointer', marginBottom: 8 }}>
                                Техническая инфо (только в dev)
                            </summary>
                            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                {this.state.error.message}
                                {'\n\n'}
                                {this.state.error.stack}
              </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

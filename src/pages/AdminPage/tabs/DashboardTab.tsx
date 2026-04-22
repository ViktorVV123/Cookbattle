import { useDashboardStats } from '@/hooks/useAdmin';
import styles from '../AdminPage.module.scss';

export function DashboardTab() {
    const { data, isLoading, error } = useDashboardStats();

    if (isLoading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
            </div>
        );
    }

    if (error || !data) {
        return <div className={styles.errorBox}>Не удалось загрузить статистику</div>;
    }

    return (
        <div className={styles.dashboardTab}>
            {/* Секция: Юзеры */}
            <section className={styles.dashSection}>
                <h3 className={styles.dashSectionTitle}>👥 Юзеры</h3>
                <div className={styles.dashGrid}>
                    <StatCard label="Всего" value={data.users_total} icon="👤" />
                    <StatCard label="Новых за 7 дней" value={data.users_new_7d} icon="✨" accent="green" />
                    <StatCard label="Активных за сутки" value={data.users_active_24h} icon="🔥" accent="orange" />
                    <StatCard label="Админов" value={data.users_admins} icon="🛡" />
                    <StatCard label="Заблокировано" value={data.users_blocked} icon="🚫" accent={data.users_blocked > 0 ? 'red' : undefined} />
                </div>
            </section>

            {/* Секция: Рецепты */}
            <section className={styles.dashSection}>
                <h3 className={styles.dashSectionTitle}>📖 Рецепты</h3>
                <div className={styles.dashGrid}>
                    <StatCard label="Всего активных" value={data.recipes_total} icon="📚" />
                    <StatCard label="Опубликовано" value={data.recipes_published} icon="✓" accent="green" />
                    <StatCard label="На модерации" value={data.recipes_pending} icon="⏳" accent={data.recipes_pending > 0 ? 'orange' : undefined} />
                    <StatCard label="Отклонено" value={data.recipes_rejected} icon="✗" />
                    <StatCard label="UGC-рецептов" value={data.recipes_ugc} icon="👥" accent="blue" />
                    <StatCard label="Удалённых" value={data.recipes_deleted} icon="🗑" />
                </div>
            </section>

            {/* Секция: Готовки */}
            <section className={styles.dashSection}>
                <h3 className={styles.dashSectionTitle}>🍳 Готовка</h3>
                <div className={styles.dashGrid}>
                    <StatCard label="Всего готовок" value={data.sessions_total} icon="🍽" />
                    <StatCard label="За сутки" value={data.sessions_24h} icon="⏱" accent="orange" />
                    <StatCard label="За неделю" value={data.sessions_7d} icon="📈" accent="green" />
                    <StatCard
                        label="Средняя оценка"
                        value={data.avg_score ? data.avg_score.toFixed(2) : '—'}
                        icon="⭐"
                        accent={data.avg_score && data.avg_score >= 7 ? 'green' : undefined}
                    />
                </div>
            </section>

            {/* График регистраций */}
            {data.registrations_chart && data.registrations_chart.length > 0 && (
                <section className={styles.dashSection}>
                    <h3 className={styles.dashSectionTitle}>📊 Регистрации за 30 дней</h3>
                    <MiniChart data={data.registrations_chart} color="#4ade80" />
                </section>
            )}

            {/* График готовок */}
            {data.sessions_chart && data.sessions_chart.length > 0 && (
                <section className={styles.dashSection}>
                    <h3 className={styles.dashSectionTitle}>🍳 Готовки за 30 дней</h3>
                    <MiniChart data={data.sessions_chart} color="#ff6b35" />
                </section>
            )}

            <div className={styles.dashFooter}>
                Обновляется автоматически каждую минуту.
            </div>
        </div>
    );
}

// ============================================================
// Stat card
// ============================================================

type AccentColor = 'green' | 'red' | 'orange' | 'blue';

function StatCard({
                      label,
                      value,
                      icon,
                      accent
                  }: {
    label: string;
    value: number | string;
    icon: string;
    accent?: AccentColor;
}) {
    return (
        <div className={`${styles.statCard} ${accent ? styles[`statCard_${accent}`] : ''}`}>
            <div className={styles.statIcon}>{icon}</div>
            <div className={styles.statValue}>{value}</div>
            <div className={styles.statLabel}>{label}</div>
        </div>
    );
}

// ============================================================
// Mini chart (sparkline bar chart через SVG)
// ============================================================

function MiniChart({
                       data,
                       color
                   }: {
    data: Array<{ date: string; count: number }>;
    color: string;
}) {
    if (data.length === 0) return null;

    const max = Math.max(...data.map((d) => d.count), 1);
    const width = 800;
    const height = 180;
    const padding = 24;
    const innerW = width - padding * 2;
    const innerH = height - padding * 2 - 20;

    const barW = innerW / data.length;
    const total = data.reduce((sum, d) => sum + d.count, 0);

    return (
        <div className={styles.chartBox}>
            <div className={styles.chartHeader}>
                <span className={styles.chartTotal}>Всего: <b>{total}</b></span>
                <span className={styles.chartPeriod}>макс. за день: {max}</span>
            </div>

            <svg viewBox={`0 0 ${width} ${height}`} className={styles.chartSvg}>
                {/* Горизонтальные линии сетки */}
                {[0.25, 0.5, 0.75].map((p) => (
                    <line
                        key={p}
                        x1={padding}
                        x2={width - padding}
                        y1={padding + innerH * (1 - p)}
                        y2={padding + innerH * (1 - p)}
                        stroke="rgba(255, 255, 255, 0.05)"
                        strokeWidth={1}
                    />
                ))}

                {/* Столбцы */}
                {data.map((d, i) => {
                    const h = (d.count / max) * innerH;
                    const x = padding + i * barW + 1;
                    const y = padding + innerH - h;
                    return (
                        <g key={d.date}>
                            <rect
                                x={x}
                                y={y}
                                width={barW - 2}
                                height={h}
                                fill={color}
                                opacity={0.8}
                                rx={2}
                            >
                                <title>{new Date(d.date).toLocaleDateString('ru')}: {d.count}</title>
                            </rect>
                        </g>
                    );
                })}

                {/* Подписи дат — первая, средняя, последняя */}
                {[0, Math.floor(data.length / 2), data.length - 1].map((i) => {
                    if (!data[i]) return null;
                    const x = padding + i * barW + barW / 2;
                    const date = new Date(data[i].date);
                    const label = `${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
                    return (
                        <text
                            key={`label-${i}`}
                            x={x}
                            y={height - 4}
                            textAnchor="middle"
                            fontSize="10"
                            fill="rgba(255, 255, 255, 0.4)"
                        >
                            {label}
                        </text>
                    );
                })}
            </svg>
        </div>
    );
}

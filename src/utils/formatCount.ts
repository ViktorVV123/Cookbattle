/**
 * Форматирует число для компактного отображения в UI.
 * TikTok/Instagram-стиль:
 *   0-999    → как есть (42, 999)
 *   1k-999k  → с одним десятичным (1.2k, 15k, 999k)
 *   1M+      → миллионы (1.5M)
 */
export function formatCount(n: number): string {
    if (n < 1000) return n.toString();

    if (n < 1_000_000) {
        const k = n / 1000;
        return k < 10
            ? `${(Math.floor(k * 10) / 10).toString().replace(/\.0$/, '')}k`
            : `${Math.floor(k)}k`;
    }

    const m = n / 1_000_000;
    return m < 10
        ? `${(Math.floor(m * 10) / 10).toString().replace(/\.0$/, '')}M`
        : `${Math.floor(m)}M`;
}

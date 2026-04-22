/**
 * Персонализация ленты — 0 байт в БД, всё на клиенте.
 *
 * Три правила формирования очереди:
 *  1. Персональный shuffle — у каждого юзера свой порядок (детерминированный хэш)
 *  2. Freshness boost — рецепты за последние 14 дней идут первыми
 *  3. "Видел" — рецепты из localStorage уходят в самый конец
 *
 * Результат: при каждом заходе в ленту юзер видит свежее в начале, знакомое —
 * в конце, порядок стабильный в пределах user_id и не совпадает с другими.
 */

const FRESHNESS_WINDOW_DAYS = 14;
const VIEWED_MAX_SIZE = 500; // после этого отрезаем самые старые записи
const VIEWED_KEY_PREFIX = 'cb_viewed_';

// ============ FNV-1a хэш: быстро, равномерно, 32-бит ============
// Стандартный алгоритм, стабильный, без внешних зависимостей.
export function hashStr(s: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    // Возвращаем unsigned для стабильной сортировки
    return h >>> 0;
}

// ============ localStorage: что юзер уже видел ============

function getViewedKey(userId: string): string {
    return `${VIEWED_KEY_PREFIX}${userId}`;
}

/** Возвращает Set всех recipe_id, которые юзер уже видел в ленте */
export function getViewedIds(userId: string): Set<string> {
    try {
        const raw = localStorage.getItem(getViewedKey(userId));
        if (!raw) return new Set();
        const arr = JSON.parse(raw) as string[];
        return new Set(arr);
    } catch {
        return new Set();
    }
}

/**
 * Добавляет recipe_id в список виденного. Хранит в порядке добавления.
 * Если список > VIEWED_MAX_SIZE — обрезает с головы (самое старое забываем первым).
 *
 * Это noop, если id уже есть (перемещать в конец не нужно —
 * для логики ленты важно только "видел / не видел").
 */
export function markAsViewed(userId: string, recipeId: string): void {
    try {
        const key = getViewedKey(userId);
        const raw = localStorage.getItem(key);
        const arr: string[] = raw ? JSON.parse(raw) : [];

        if (arr.includes(recipeId)) return; // уже в списке, ничего не делаем

        arr.push(recipeId);

        // Ограничиваем размер — отрезаем самые старые
        const trimmed = arr.length > VIEWED_MAX_SIZE
            ? arr.slice(arr.length - VIEWED_MAX_SIZE)
            : arr;

        localStorage.setItem(key, JSON.stringify(trimmed));
    } catch {
        // localStorage может быть недоступен (приватный режим Safari) — молча игнорим
    }
}

/** Полностью чистит список — для дебага и кнопки "сброс" */
export function clearViewed(userId: string): void {
    try {
        localStorage.removeItem(getViewedKey(userId));
    } catch {
        /* noop */
    }
}

// ============ Построение очереди ============

export interface RecipeIndexEntry {
    id: string;
    created_at: string;
}

/**
 * Главная функция — получает минимальный индекс рецептов (id + created_at),
 * возвращает персонализированную очередь id'шников.
 *
 * Стратегия:
 *   [not_viewed fresh]  ←  shuffle по hash(id + userId)
 *   [not_viewed old]    ←  shuffle
 *   [viewed]            ←  shuffle (только если виденного мало и очередь закончилась)
 */
export function buildFeedQueue(
    index: RecipeIndexEntry[],
    userId: string,
    viewedIds: Set<string>
): string[] {
    const now = Date.now();
    const freshnessCutoff = now - FRESHNESS_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    const freshNotViewed: RecipeIndexEntry[] = [];
    const oldNotViewed: RecipeIndexEntry[] = [];
    const viewed: RecipeIndexEntry[] = [];

    for (const r of index) {
        if (viewedIds.has(r.id)) {
            viewed.push(r);
            continue;
        }
        const createdMs = new Date(r.created_at).getTime();
        if (createdMs >= freshnessCutoff) {
            freshNotViewed.push(r);
        } else {
            oldNotViewed.push(r);
        }
    }

    // Детерминированная сортировка внутри каждого bucket — у каждого юзера свой порядок
    const sortByUserHash = (a: RecipeIndexEntry, b: RecipeIndexEntry) => {
        const ha = hashStr(a.id + userId);
        const hb = hashStr(b.id + userId);
        return ha - hb;
    };

    freshNotViewed.sort(sortByUserHash);
    oldNotViewed.sort(sortByUserHash);
    viewed.sort(sortByUserHash);

    return [
        ...freshNotViewed.map((r) => r.id),
        ...oldNotViewed.map((r) => r.id),
        ...viewed.map((r) => r.id)
    ];
}

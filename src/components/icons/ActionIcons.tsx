/**
 * Иконки действий в ленте и других местах приложения.
 *
 * Стилистика: outline 2.5px, round joins/caps, viewBox 24x24, fill none.
 * Цвет задаётся через currentColor — иконка наследует color родителя.
 *
 * Все иконки принимают { size, className } для переиспользуемости.
 */

interface IconProps {
    size?: number;
    className?: string;
}

const DEFAULT_PROPS = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true
};

/** Outline-сердечко (не сохранено) */
export function HeartIcon({ size = 28, className }: IconProps) {
    return (
        <svg width={size} height={size} className={className} {...DEFAULT_PROPS}>
            <path d="M12 20.5 C 12 20.5, 3.5 14.8, 3.5 9 C 3.5 6.2, 5.7 4, 8.5 4 C 10.2 4, 11.4 5, 12 6.2 C 12.6 5, 13.8 4, 15.5 4 C 18.3 4, 20.5 6.2, 20.5 9 C 20.5 14.8, 12 20.5, 12 20.5 Z" />
        </svg>
    );
}

/** Filled сердечко (сохранено) — с обводкой и заливкой */
export function HeartFilledIcon({ size = 28, className }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            className={className}
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M12 20.5 C 12 20.5, 3.5 14.8, 3.5 9 C 3.5 6.2, 5.7 4, 8.5 4 C 10.2 4, 11.4 5, 12 6.2 C 12.6 5, 13.8 4, 15.5 4 C 18.3 4, 20.5 6.2, 20.5 9 C 20.5 14.8, 12 20.5, 12 20.5 Z" />
        </svg>
    );
}

/** Книга / рецепт — раскрытая книжка */
export function BookIcon({ size = 28, className }: IconProps) {
    return (
        <svg width={size} height={size} className={className} {...DEFAULT_PROPS}>
            {/* Левая страница */}
            <path d="M12 6 C 10 4.5, 7 3.5, 4 4 L 4 18 C 7 17.5, 10 18.5, 12 20" />
            {/* Правая страница */}
            <path d="M12 6 C 14 4.5, 17 3.5, 20 4 L 20 18 C 17 17.5, 14 18.5, 12 20" />
            {/* Вертикальная линия переплёта */}
            <path d="M12 6 L 12 20" />
        </svg>
    );
}

/** Поделиться — квадрат со стрелкой вверх (iOS-style share) */
export function ShareIcon({ size = 28, className }: IconProps) {
    return (
        <svg width={size} height={size} className={className} {...DEFAULT_PROPS}>
            {/* Стрелка вверх */}
            <path d="M12 3 L 12 15" />
            <path d="M8 7 L 12 3 L 16 7" />
            {/* Коробочка "откуда вылетает" */}
            <path d="M6 12 L 6 20 C 6 20.55, 6.45 21, 7 21 L 17 21 C 17.55 21, 18 20.55, 18 20 L 18 12" />
        </svg>
    );
}

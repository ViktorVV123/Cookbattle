/**
 * Логотип CookBattle — шапка шефа с золотым контуром.
 * Векторный, масштабируется под любой размер через props.
 *
 * Использовать: <ChefHatLogo size={48} /> или <ChefHatLogo className="..." />
 */
interface Props {
    size?: number;
    className?: string;
}

export function ChefHatLogo({ size = 48, className }: Props) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 200 200"
            width={size}
            height={size}
            fill="none"
            className={className}
            aria-hidden="true"
        >
            <defs>
                <linearGradient id="cbGoldStroke" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f5d08a" />
                    <stop offset="55%" stopColor="#d8a24a" />
                    <stop offset="100%" stopColor="#a87020" />
                </linearGradient>
                <filter id="cbGoldGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="0.8" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            <g
                stroke="url(#cbGoldStroke)"
                strokeWidth="5.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                filter="url(#cbGoldGlow)"
            >
                {/* Верх: три облачка */}
                <path
                    d="M 50 120 C 22 120, 18 85, 42 75 C 30 48, 62 30, 78 52 C 84 28, 118 26, 124 52 C 142 32, 176 50, 160 78 C 182 88, 178 122, 150 120 Z"
                />
                {/* Манжет */}
                <path d="M 55 120 L 55 152 Q 55 162, 65 162 L 135 162 Q 145 162, 145 152 L 145 120" />
                {/* Линия-перегиб */}
                <path d="M 58 132 L 142 132" />
            </g>

            {/* Складочки — solid цвет, иначе сливаются с градиентом манжета */}
            <g stroke="#e6b970" strokeWidth="3" strokeLinecap="round">
                <path d="M 80 140 L 80 156" />
                <path d="M 100 140 L 100 156" />
                <path d="M 120 140 L 120 156" />
            </g>
        </svg>
    );
}

import { ChefHatLogo } from '@/components/common/ChefHatLogo';
import styles from './LandingPage.module.scss';

interface Props {
    onLogin: () => void;
    onRegister: () => void;
}

export function LandingPage({ onLogin, onRegister }: Props) {
    return (
        <div className={styles.root}>
            {/* Sticky-шапка с кнопкой Войти */}
            <header className={styles.topBar}>
                <div className={styles.brand}>
                    <ChefHatLogo size={28} />
                    <span className={styles.brandName}>CookBattle</span>
                </div>
                <button type="button" className={styles.loginBtn} onClick={onLogin}>
                    Войти
                </button>
            </header>

            {/* Hero */}
            <section className={styles.hero}>
                <div className={styles.heroLogoWrap}>
                    <ChefHatLogo size={88} />
                </div>
                <h1 className={styles.heroTitle}>
                    AI оценит<br />твоё блюдо
                </h1>
                <p className={styles.heroSubtitle}>
                    Готовь по пошаговым рецептам. Фоткай результат.<br />
                    Получай оценку и советы шефа.
                </p>
                <button type="button" className={styles.ctaPrimary} onClick={onRegister}>
                    🍳 Начать готовить
                </button>
                <p className={styles.ctaHint}>Бесплатно · без карты</p>
            </section>

            {/* Как работает — 3 шага */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Как это работает</h2>
                <div className={styles.steps}>
                    <div className={styles.step}>
                        <div className={styles.stepIcon}>🍳</div>
                        <div className={styles.stepBody}>
                            <div className={styles.stepTitle}>Выбери рецепт</div>
                            <div className={styles.stepSub}>Листай ленту — как TikTok, только вкуснее</div>
                        </div>
                    </div>
                    <div className={styles.step}>
                        <div className={styles.stepIcon}>📸</div>
                        <div className={styles.stepBody}>
                            <div className={styles.stepTitle}>Приготовь и сфоткай</div>
                            <div className={styles.stepSub}>Пошаговые инструкции с таймером</div>
                        </div>
                    </div>
                    <div className={styles.step}>
                        <div className={styles.stepIcon}>🤖</div>
                        <div className={styles.stepBody}>
                            <div className={styles.stepTitle}>Получи оценку AI</div>
                            <div className={styles.stepSub}>От 1 до 10 + конкретный совет как улучшить</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Пример оценки AI */}
            <section className={styles.section}>
                <div className={styles.sectionKicker}>Пример оценки AI</div>
                <div className={styles.mockCard}>
                    <div className={styles.mockPhoto}>
                        <span className={styles.mockEmoji}>🍝</span>
                        <div className={styles.mockCuisine}>Итальянская</div>
                    </div>
                    <div className={styles.mockBody}>
                        <div className={styles.mockRow}>
                            <div className={styles.mockScore}>8</div>
                            <div className={styles.mockMeta}>
                                <div className={styles.mockTitle}>Карбонара</div>
                                <div className={styles.mockSub}>из 10 · отличная подача</div>
                            </div>
                        </div>
                        <div className={styles.mockComment}>
                            «Красивое плетение пасты, сыр идеально распределён. Попробуй добавить больше перца для контраста.»
                        </div>
                    </div>
                </div>
            </section>

            {/* Геймификация */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Прокачивай навык</h2>
                <div className={styles.perks}>
                    <div className={`${styles.perk} ${styles.perkGold}`}>
                        <div className={styles.perkIcon}>⚡</div>
                        <div className={styles.perkTitle}>Зарабатывай XP</div>
                        <div className={styles.perkSub}>От Новичка до Мастер-шефа</div>
                    </div>
                    <div className={`${styles.perk} ${styles.perkFire}`}>
                        <div className={styles.perkIcon}>🔥</div>
                        <div className={styles.perkTitle}>Держи streak</div>
                        <div className={styles.perkSub}>Готовь каждый день</div>
                    </div>
                </div>
            </section>

            {/* Финальный CTA */}
            <section className={styles.finalCta}>
                <h2 className={styles.finalTitle}>Готов попробовать?</h2>
                <p className={styles.finalSub}>Присоединяйся — бесплатно, без обязательств</p>
                <button type="button" className={styles.ctaPrimary} onClick={onRegister}>
                    🍳 Начать готовить
                </button>
                <button type="button" className={styles.finalLogin} onClick={onLogin}>
                    Уже есть аккаунт? Войти
                </button>
            </section>

            <footer className={styles.footer}>
                <ChefHatLogo size={20} />
                <span>CookBattle · 2026</span>
            </footer>
        </div>
    );
}

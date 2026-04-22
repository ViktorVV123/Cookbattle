import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  usePendingRecipes,
  useApproveRecipe,
  useRejectRecipe,
  type PendingRecipe
} from '@/hooks/useAdmin';
import { useAuthStore } from '@/store/authStore';
import styles from './AdminPendingPage.module.scss';

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Легко',
  medium: 'Средне',
  hard: 'Сложно'
};

export function AdminPendingPage() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const isAdmin = (profile as any)?.is_admin === true;

  const { data: pending, isLoading, error } = usePendingRecipes();
  const [selected, setSelected] = useState<PendingRecipe | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('');

  const approveMutation = useApproveRecipe();
  const rejectMutation = useRejectRecipe();

  // Не админ — редирект
  if (profile && !isAdmin) {
    return (
      <div className={styles.forbidden}>
        <div className={styles.forbiddenIcon}>🚫</div>
        <h2>Доступ запрещён</h2>
        <p>Эта страница только для админов.</p>
        <button onClick={() => navigate('/')} className={styles.btn}>На главную</button>
      </div>
    );
  }

  const handleApprove = async () => {
    if (!selected) return;
    try {
      await approveMutation.mutateAsync(selected.id);
      setSelected(null);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleReject = async () => {
    if (!selected || !reason.trim()) return;
    try {
      await rejectMutation.mutateAsync({ recipeId: selected.id, reason: reason.trim() });
      setSelected(null);
      setRejectMode(false);
      setReason('');
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className={styles.root}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.closeBtn} onClick={() => navigate(-1)}>✕</button>
        <div className={styles.headerTitle}>
          <div className={styles.headerMain}>Модерация</div>
          <div className={styles.headerSub}>
            {isLoading ? 'Загружаем…' : `${pending?.length ?? 0} на проверке`}
          </div>
        </div>
        <div className={styles.headerSpacer} />
      </header>

      {/* Список или предпросмотр */}
      {!selected ? (
        <div className={styles.listWrap}>
          {isLoading && (
            <div className={styles.loading}>
              <div className={styles.spinner} />
            </div>
          )}

          {error && (
            <div className={styles.errorBox}>Не удалось загрузить очередь</div>
          )}

          {pending && pending.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>✨</div>
              <h2>Всё чисто!</h2>
              <p>Пока нет рецептов на модерацию. Загляни попозже.</p>
            </div>
          )}

          {pending && pending.length > 0 && (
            <div className={styles.list}>
              {pending.map((r) => (
                <button
                  key={r.id}
                  className={styles.listItem}
                  onClick={() => {
                    setSelected(r);
                    setRejectMode(false);
                    setReason('');
                  }}
                >
                  <div className={styles.listThumb}>
                    {r.image_url ? (
                      <img src={r.image_url} alt={r.title} />
                    ) : (
                      <div className={styles.listThumbPlaceholder}>🍴</div>
                    )}
                  </div>
                  <div className={styles.listContent}>
                    <div className={styles.listTitle}>{r.title}</div>
                    <div className={styles.listMeta}>
                      <span>{r.cuisine}</span>
                      <span>·</span>
                      <span>{DIFFICULTY_LABEL[r.difficulty]}</span>
                      <span>·</span>
                      <span>{r.steps.length} шагов</span>
                    </div>
                    {r.author && (
                      <div className={styles.listAuthor}>
                        от {r.author.display_name}
                      </div>
                    )}
                  </div>
                  <div className={styles.listArrow}>→</div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Предпросмотр выбранного рецепта */
        <div className={styles.previewWrap}>
          <button
            className={styles.backBtn}
            onClick={() => { setSelected(null); setRejectMode(false); }}
          >
            ← Назад к списку
          </button>

          {/* Автор */}
          {selected.author && (
            <div className={styles.authorBox}>
              <div className={styles.authorAvatar}>
                {selected.author.avatar_url ? (
                  <img src={selected.author.avatar_url} alt={selected.author.display_name} />
                ) : (
                  <div className={styles.authorAvatarPh}>
                    {selected.author.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className={styles.authorName}>{selected.author.display_name}</div>
                <div className={styles.authorDate}>
                  Отправил {new Date(selected.submitted_at).toLocaleString('ru')}
                </div>
              </div>
            </div>
          )}

          {/* Обложка */}
          {selected.image_url && (
            <div className={styles.previewImage}>
              <img src={selected.image_url} alt={selected.title} />
            </div>
          )}

          {/* Заголовок и описание */}
          <h1 className={styles.previewTitle}>{selected.title}</h1>
          <div className={styles.previewBadges}>
            <span className={styles.badge}>{selected.cuisine}</span>
            <span className={styles.badge}>{selected.category}</span>
            <span className={styles.badge}>{DIFFICULTY_LABEL[selected.difficulty]}</span>
            <span className={styles.badge}>⏱ {selected.prep_time_min + selected.cook_time_min} мин</span>
            <span className={styles.badge}>{selected.servings} порций</span>
          </div>
          <p className={styles.previewDesc}>{selected.description}</p>

          {/* Калории если есть */}
          {(selected.calories || selected.protein) && (
            <div className={styles.nutritionBox}>
              {selected.calories && <span>🔥 {selected.calories} ккал</span>}
              {selected.protein && <span>🥩 {selected.protein}г белка</span>}
              {selected.fat && <span>🧈 {selected.fat}г жиров</span>}
              {selected.carbs && <span>🍞 {selected.carbs}г углеводов</span>}
            </div>
          )}

          {/* Ингредиенты */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Ингредиенты ({selected.ingredients.length})</h3>
            <ul className={styles.ingredientsList}>
              {selected.ingredients.map((ing, i) => (
                <li key={i}>
                  <span>{ing.name}</span>
                  <span className={styles.ingMeta}>
                    {ing.amount > 0 ? `${ing.amount} ${ing.unit}` : ing.unit}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Шаги */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Шаги ({selected.steps.length})</h3>
            {selected.steps.map((s, i) => (
              <div key={i} className={styles.stepBox}>
                <div className={styles.stepNumber}>{i + 1}</div>
                <div className={styles.stepContent}>
                  <p>{s.text}</p>
                  {s.timer_seconds != null && s.timer_seconds > 0 && (
                    <span className={styles.stepMeta}>⏱ {Math.round(s.timer_seconds / 60)} мин</span>
                  )}
                  {s.image_url && (
                    <img src={s.image_url} alt={`Step ${i + 1}`} className={styles.stepImage} />
                  )}
                </div>
              </div>
            ))}
          </section>

          {/* Форма отклонения */}
          {rejectMode && (
            <div className={styles.rejectBox}>
              <h4>Почему отклоняем?</h4>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Например: в шаге 3 пропущена температура духовки, уточни и переотправь"
                rows={3}
                className={styles.rejectTextarea}
              />
              <span className={styles.rejectHint}>
                Автор увидит эту причину и сможет переотправить после правок.
              </span>
            </div>
          )}

          {/* Кнопки действий */}
          <div className={styles.actionsBar}>
            {!rejectMode ? (
              <>
                <button
                  className={styles.btnReject}
                  onClick={() => setRejectMode(true)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  ❌ Отклонить
                </button>
                <button
                  className={styles.btnApprove}
                  onClick={handleApprove}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  {approveMutation.isPending ? 'Публикуем…' : '✅ Опубликовать'}
                </button>
              </>
            ) : (
              <>
                <button
                  className={styles.btnSecondary}
                  onClick={() => { setRejectMode(false); setReason(''); }}
                  disabled={rejectMutation.isPending}
                >
                  Отмена
                </button>
                <button
                  className={styles.btnReject}
                  onClick={handleReject}
                  disabled={!reason.trim() || rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? 'Отклоняем…' : 'Подтвердить отказ'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

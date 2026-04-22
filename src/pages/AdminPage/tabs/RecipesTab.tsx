import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAllRecipes,
  useDeleteRecipe,
  useRestoreRecipe,
  useUnpublishRecipe,
  type AdminRecipe,
  type RecipeStatus
} from '@/hooks/useAdmin';
import styles from '../AdminPage.module.scss';

type StatusFilter = RecipeStatus | 'all' | 'deleted';

const STATUS_FILTERS: { value: StatusFilter; label: string; color: string }[] = [
  { value: 'all', label: 'Все активные', color: 'var(--color-text)' },
  { value: 'published', label: 'Опубликованные', color: 'var(--color-success)' },
  { value: 'pending', label: 'На модерации', color: 'var(--color-gold)' },
  { value: 'draft', label: 'Черновики', color: 'var(--color-text-muted)' },
  { value: 'rejected', label: 'Отклонённые', color: '#ff6b6b' },
  { value: 'deleted', label: 'Удалённые', color: 'var(--color-text-dim)' }
];

const UGC_FILTERS = [
  { value: undefined, label: 'Все' },
  { value: true, label: 'Только UGC' },
  { value: false, label: 'Только стоковые' }
];

export function RecipesTab() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [isUgc, setIsUgc] = useState<boolean | undefined>(undefined);

  const [unpublishing, setUnpublishing] = useState<AdminRecipe | null>(null);
  const [unpublishReason, setUnpublishReason] = useState('');

  const { data: recipes, isLoading } = useAllRecipes({
    status,
    search: search.trim() || undefined,
    isUgc
  });

  const deleteMutation = useDeleteRecipe();
  const restoreMutation = useRestoreRecipe();
  const unpublishMutation = useUnpublishRecipe();

  const handleDelete = async (r: AdminRecipe) => {
    if (!confirm(`Удалить рецепт "${r.title}"?\n\nЭто soft delete — его можно будет восстановить.`)) return;
    try {
      await deleteMutation.mutateAsync(r.id);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRestore = async (r: AdminRecipe) => {
    try {
      await restoreMutation.mutateAsync(r.id);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUnpublish = async () => {
    if (!unpublishing || !unpublishReason.trim()) return;
    try {
      await unpublishMutation.mutateAsync({
        recipeId: unpublishing.id,
        reason: unpublishReason.trim()
      });
      setUnpublishing(null);
      setUnpublishReason('');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const total = recipes?.length ?? 0;

  const grouped = useMemo(() => {
    if (!recipes) return null;
    return {
      ugc: recipes.filter((r) => r.author_id !== null).length,
      stock: recipes.filter((r) => r.author_id === null).length
    };
  }, [recipes]);

  return (
    <div className={styles.recipesTab}>
      {/* Фильтры */}
      <div className={styles.filtersBar}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Поиск по названию"
          className={styles.searchInput}
        />

        <div className={styles.filterChips}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`${styles.filterChip} ${status === f.value ? styles.filterChipActive : ''}`}
              onClick={() => setStatus(f.value)}
              style={{ borderColor: status === f.value ? f.color : undefined }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className={styles.filterChips}>
          {UGC_FILTERS.map((f) => (
            <button
              key={String(f.value)}
              className={`${styles.filterChip} ${isUgc === f.value ? styles.filterChipActive : ''}`}
              onClick={() => setIsUgc(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {grouped && (
          <div className={styles.summary}>
            Найдено: <b>{total}</b>
            {grouped.ugc > 0 && <span> · UGC: {grouped.ugc}</span>}
            {grouped.stock > 0 && <span> · стоковые: {grouped.stock}</span>}
          </div>
        )}
      </div>

      {/* Unpublish modal */}
      {unpublishing && (
        <div className={styles.modalOverlay} onClick={() => setUnpublishing(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Снять с публикации?</h3>
            <p className={styles.modalText}>
              Рецепт <b>{unpublishing.title}</b> станет невидимым для юзеров.
              Автор увидит статус "Отклонён".
            </p>
            <textarea
              value={unpublishReason}
              onChange={(e) => setUnpublishReason(e.target.value)}
              placeholder="Причина (будет видна автору)..."
              rows={3}
              className={styles.rejectTextarea}
            />
            <div className={styles.modalActions}>
              <button
                className={styles.btnSecondary}
                onClick={() => { setUnpublishing(null); setUnpublishReason(''); }}
              >
                Отмена
              </button>
              <button
                className={styles.btnReject}
                onClick={handleUnpublish}
                disabled={!unpublishReason.trim() || unpublishMutation.isPending}
              >
                {unpublishMutation.isPending ? 'Снимаем…' : 'Снять с публикации'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Таблица */}
      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
        </div>
      ) : total === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🙈</div>
          <p>Нет рецептов под эти фильтры</p>
        </div>
      ) : (
        <div className={styles.recipesGrid}>
          {recipes!.map((r) => (
            <RecipeAdminCard
              key={r.id}
              recipe={r}
              onView={() => navigate(`/recipe/${r.id}`)}
              onDelete={() => handleDelete(r)}
              onRestore={() => handleRestore(r)}
              onUnpublish={() => setUnpublishing(r)}
              busy={deleteMutation.isPending || restoreMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Recipe admin card
// ============================================================

function RecipeAdminCard({
  recipe: r,
  onView,
  onDelete,
  onRestore,
  onUnpublish,
  busy
}: {
  recipe: AdminRecipe;
  onView: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onUnpublish: () => void;
  busy: boolean;
}) {
  const isDeleted = r.deleted_at !== null;
  const statusColor: Record<string, string> = {
    draft: 'var(--color-text-muted)',
    pending: 'var(--color-gold)',
    published: 'var(--color-success)',
    rejected: '#ff6b6b'
  };

  return (
    <div className={`${styles.recipeCard} ${isDeleted ? styles.recipeCardDeleted : ''}`}>
      <div className={styles.recipeThumb} onClick={onView}>
        {r.image_url ? (
          <img src={r.image_url} alt={r.title} />
        ) : (
          <div className={styles.listThumbPlaceholder}>🍴</div>
        )}
        {isDeleted && <div className={styles.deletedOverlay}>УДАЛЁН</div>}
      </div>

      <div className={styles.recipeBody}>
        <div className={styles.recipeHeader}>
          <div className={styles.recipeTitle} onClick={onView}>
            {r.title}
          </div>
          {!isDeleted && (
            <div
              className={styles.recipeStatus}
              style={{ color: statusColor[r.status] }}
            >
              {r.status === 'draft' && 'Черновик'}
              {r.status === 'pending' && 'На модерации'}
              {r.status === 'published' && '✓ Опубликован'}
              {r.status === 'rejected' && '✗ Отклонён'}
            </div>
          )}
        </div>

        <div className={styles.recipeMeta}>
          {r.author ? (
            <span className={styles.recipeAuthor}>
              👤 {r.author.display_name}
            </span>
          ) : (
            <span className={styles.recipeAuthorStock}>📦 стоковый</span>
          )}
          <span>·</span>
          <span>{r.cuisine}</span>
          <span>·</span>
          <span>{new Date(r.created_at).toLocaleDateString('ru')}</span>
        </div>

        {r.rejection_reason && (
          <div className={styles.recipeReason}>
            💬 {r.rejection_reason}
          </div>
        )}

        <div className={styles.recipeActions}>
          {isDeleted ? (
            <button
              className={styles.btnSmallSuccess}
              onClick={onRestore}
              disabled={busy}
            >
              ↶ Восстановить
            </button>
          ) : (
            <>
              {r.status === 'published' && (
                <button
                  className={styles.btnSmallWarning}
                  onClick={onUnpublish}
                  disabled={busy}
                >
                  🚫 Снять
                </button>
              )}
              <button
                className={styles.btnSmallDanger}
                onClick={onDelete}
                disabled={busy}
              >
                🗑 Удалить
              </button>
            </>
          )}
          <button className={styles.btnSmallSecondary} onClick={onView}>
            👁 Открыть
          </button>
        </div>
      </div>
    </div>
  );
}

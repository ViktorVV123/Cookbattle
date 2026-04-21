import { useState } from 'react';

import { RecipeCard } from '@/components/recipe/RecipeCard';
import styles from './SearchPage.module.scss';
import {RecipeFilters, useRecipeFacets, useRecipesFeed} from "@/hooks/useRecipes.ts";


export function SearchPage() {
  const [search, setSearch] = useState('');
  const [cuisine, setCuisine] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [difficulty, setDifficulty] = useState<RecipeFilters['difficulty'] | ''>('');

  const { data: facets } = useRecipeFacets();
  const { data, isLoading } = useRecipesFeed({
    search: search.trim() || undefined,
    cuisine: cuisine || undefined,
    category: category || undefined,
    difficulty: difficulty || undefined
  });

  const recipes = data?.pages.flat() ?? [];
  const hasFilters = search || cuisine || category || difficulty;

  const resetFilters = () => {
    setSearch('');
    setCuisine('');
    setCategory('');
    setDifficulty('');
  };

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Поиск</h1>

      <div className={styles.searchBox}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Название блюда…"
          className={styles.searchInput}
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} className={styles.clearBtn}>
            ✕
          </button>
        )}
      </div>

      <div className={styles.filters}>
        <FilterChips
          label="Кухня"
          value={cuisine}
          onChange={setCuisine}
          options={facets?.cuisines ?? []}
        />
        <FilterChips
          label="Категория"
          value={category}
          onChange={setCategory}
          options={facets?.categories ?? []}
        />
        <FilterChips
            label="Сложность"
            value={difficulty as string}
            onChange={(v) => setDifficulty(v as RecipeFilters['difficulty'] | '')}
            options={['easy', 'medium', 'hard']}
            labels={{ easy: 'Легко', medium: 'Средне', hard: 'Сложно' }}
        />
      </div>

      {hasFilters && (
        <button className={styles.resetBtn} onClick={resetFilters}>
          ✕ Сбросить фильтры
        </button>
      )}

      {isLoading && <div className={styles.loading}><div className={styles.spinner} /></div>}

      {!isLoading && recipes.length === 0 && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🙈</div>
          <p>Ничего не нашлось. Попробуй другие фильтры.</p>
        </div>
      )}

      {recipes.length > 0 && (
        <>
          <div className={styles.countLabel}>
            Найдено: {recipes.length}
          </div>
          <div className={styles.grid}>
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface FilterChipsProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labels?: Record<string, string>;
}

function FilterChips({ label, value, onChange, options, labels }: FilterChipsProps) {
  if (options.length === 0) return null;

  return (
    <div className={styles.filterGroup}>
      <div className={styles.filterLabel}>{label}</div>
      <div className={styles.chipsRow}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`${styles.chip} ${value === opt ? styles.chipActive : ''}`}
            onClick={() => onChange(value === opt ? '' : opt)}
          >
            {labels?.[opt] ?? opt}
          </button>
        ))}
      </div>
    </div>
  );
}

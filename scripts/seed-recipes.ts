/**
 * Seed-скрипт для наполнения БД рецептами.
 *
 * Запуск:
 *   tsx scripts/seed-recipes.ts [количество_рецептов]
 *
 * Требует в .env:
 *   ANTHROPIC_API_KEY
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (обход RLS)
 *
 * Логика:
 *  1. Для каждой пары (кухня × категория) просим Claude сгенерить N рецептов в JSON.
 *  2. Валидируем (zod-стайл рукопашной проверкой, чтобы не тащить ещё одну либу).
 *  3. Заливаем в recipes с is_ai_generated = true, image_url пока null.
 *  4. Фото цепляем отдельным скриптом (Unsplash/Pexels API) или вручную.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Нет ANTHROPIC_API_KEY / VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY в .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

const CUISINES = ['русская', 'итальянская', 'азиатская', 'грузинская', 'американская', 'французская', 'мексиканская'];
const CATEGORIES = ['завтрак', 'обед', 'ужин', 'салат', 'суп', 'десерт'];
const BATCH_SIZE = 5; // сколько рецептов за один запрос к Claude

interface GeneratedRecipe {
  title: string;
  description: string;
  cuisine: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prep_time_min: number;
  cook_time_min: number;
  servings: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  tags: string[];
  ingredients: Array<{ name: string; amount: number; unit: string }>;
  steps: Array<{ order: number; text: string; timer_seconds?: number }>;
}

async function generateBatch(cuisine: string, category: string): Promise<GeneratedRecipe[]> {
  const prompt = `Сгенерируй ${BATCH_SIZE} реальных, популярных рецептов ${category}а ${cuisine} кухни.

Ответ — строго JSON-массив без комментариев и markdown-обёртки.
Формат каждого рецепта:
{
  "title": "Название на русском",
  "description": "1-2 предложения, что за блюдо и чем хорошо",
  "cuisine": "${cuisine}",
  "category": "${category}",
  "difficulty": "easy" | "medium" | "hard",
  "prep_time_min": число минут на подготовку,
  "cook_time_min": число минут на готовку,
  "servings": число порций,
  "calories": ккал на 1 порцию,
  "protein": граммы белка на 1 порцию,
  "fat": граммы жира на 1 порцию,
  "carbs": граммы углеводов на 1 порцию,
  "tags": ["низкокалорийное", "быстро", "вегетарианское", ...],
  "ingredients": [{ "name": "куриное филе", "amount": 300, "unit": "г" }, ...],
  "steps": [
    { "order": 1, "text": "Нарежьте филе кубиками.", "timer_seconds": null },
    { "order": 2, "text": "Обжарьте на среднем огне 5 минут.", "timer_seconds": 300 }
  ]
}

Требования:
- Шаги: коротко, по 1–2 предложения, с таймером где есть время готовки.
- Ингредиенты: реальные количества для указанного servings.
- Разные блюда внутри батча, не повторяйся.
- КБЖУ адекватные (не 3000 ккал за порцию салата).

Верни ТОЛЬКО JSON-массив, больше ничего.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  const text = data.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');

  // Claude иногда оборачивает в ```json ... ```, снимаем
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();

  let parsed: GeneratedRecipe[];
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('❌ Не распарсился JSON для', cuisine, category);
    console.error('Raw:', cleaned.slice(0, 500));
    throw e;
  }

  if (!Array.isArray(parsed)) throw new Error('Ожидали массив рецептов');
  return parsed.filter(validateRecipe);
}

function validateRecipe(r: any): r is GeneratedRecipe {
  return (
    typeof r?.title === 'string' &&
    typeof r?.cuisine === 'string' &&
    typeof r?.category === 'string' &&
    ['easy', 'medium', 'hard'].includes(r?.difficulty) &&
    Array.isArray(r?.ingredients) && r.ingredients.length > 0 &&
    Array.isArray(r?.steps) && r.steps.length > 0
  );
}

async function insertRecipes(recipes: GeneratedRecipe[]) {
  const rows = recipes.map((r) => ({
    ...r,
    is_ai_generated: true,
    author_id: null,
    image_url: null
  }));

  const { error, count } = await supabase.from('recipes').insert(rows, { count: 'exact' });
  if (error) throw error;
  return count ?? rows.length;
}

async function main() {
  const targetTotal = parseInt(process.argv[2] ?? '60', 10);
  const pairs: Array<[string, string]> = [];

  // раскидываем равномерно по кухням и категориям
  while (pairs.length * BATCH_SIZE < targetTotal) {
    for (const cuisine of CUISINES) {
      for (const category of CATEGORIES) {
        if (pairs.length * BATCH_SIZE >= targetTotal) break;
        pairs.push([cuisine, category]);
      }
    }
  }

  console.log(`🍳 Генерим ~${pairs.length * BATCH_SIZE} рецептов в ${pairs.length} батчах…\n`);

  let totalInserted = 0;
  for (const [i, [cuisine, category]] of pairs.entries()) {
    try {
      console.log(`[${i + 1}/${pairs.length}] ${cuisine} — ${category}…`);
      const batch = await generateBatch(cuisine, category);
      const inserted = await insertRecipes(batch);
      totalInserted += inserted;
      console.log(`  ✓ вставлено ${inserted}`);
    } catch (e: any) {
      console.error(`  ✗ ошибка:`, e.message);
      // не падаем — продолжаем остальные батчи
    }
  }

  console.log(`\n✅ Готово. Всего вставлено: ${totalInserted} рецептов.`);
}

main().catch((e) => {
  console.error('Фатально:', e);
  process.exit(1);
});

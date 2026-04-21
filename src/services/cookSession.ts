import { supabase } from './supabase';

export interface GradingResult {
  is_food: boolean;
  score: number;
  comment: string;
}

export interface CookSessionResult {
  session_id: string;
  xp_earned: number;
  new_streak: number;
  level_up: boolean;
  new_level: string;
  new_achievements: Array<{ id: string; xp: number }>;
  grading: GradingResult;
}

// Если в .env стоит VITE_USE_MOCK_AI=true — AI-оценка фейковая (для разработки без ключа)
const USE_MOCK = import.meta.env.VITE_USE_MOCK_AI === 'true';

async function mockGrade(recipeTitle: string): Promise<GradingResult> {
  await new Promise((r) => setTimeout(r, 2000));

  const hash = [...recipeTitle].reduce((a, c) => a + c.charCodeAt(0), 0);
  const score = 7 + (hash % 4); // 7-10

  const comments: Record<number, string[]> = {
    10: [
      'Идеальная подача! Цвета сбалансированы, композиция безупречна. Уровень ресторана.',
      'Вау! Выглядит как с обложки Bon Appétit. Подача на все 10.'
    ],
    9: [
      'Отличная работа! Цвета яркие, тарелка аккуратная. Для 10 попробуй добавить зелень для контраста.',
      'Очень красиво. Композиция интересная. Чуть-чуть зелени сверху — и будет идеально.'
    ],
    8: [
      'Хорошая подача. Выглядит аппетитно. В следующий раз положи чуть меньше — простор на тарелке всегда работает.',
      'Аккуратно и вкусно. Добавь контрастный соус каплями — визуально будет интереснее.'
    ],
    7: [
      'Неплохо! Видно что ты старался. Совет: возьми тарелку поменьше — блюдо будет смотреться эффектнее.',
      'Хорошая работа для будней. Для "инстаграмного" эффекта протри края тарелки салфеткой перед фото.'
    ]
  };

  const variants = comments[score] ?? comments[8];
  const comment = variants[hash % variants.length];

  return { is_food: true, score, comment };
}

export async function submitCookSession(params: {
  recipeId: string;
  recipeTitle: string;
  recipeDescription?: string;
  photoBlob: Blob;
}): Promise<CookSessionResult> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Не авторизован');

  // 1. Upload
  const ext = params.photoBlob.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const filename = `${userId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
      .from('dishes')
      .upload(filename, params.photoBlob, {
        cacheControl: '3600',
        contentType: params.photoBlob.type
      });
  if (uploadError) throw new Error(`Не удалось загрузить фото: ${uploadError.message}`);

  // 2. Public URL
  const { data: urlData } = supabase.storage.from('dishes').getPublicUrl(filename);
  const photoUrl = urlData.publicUrl;

  // 3. Grade (реальный Claude или мок)
  let grading: GradingResult;
  if (USE_MOCK) {
    grading = await mockGrade(params.recipeTitle);
  } else {
    const { data, error } = await supabase.functions.invoke<GradingResult>('grade-dish', {
      body: {
        photo_url: photoUrl,
        recipe_title: params.recipeTitle,
        recipe_description: params.recipeDescription
      }
    });
    if (error) throw new Error(`Ошибка AI-оценки: ${error.message}`);
    if (!data) throw new Error('AI вернул пустой ответ');
    grading = data;
  }

  // 4. Not food reject
  if (!grading.is_food) {
    await supabase.storage.from('dishes').remove([filename]);
    const err = new Error(grading.comment) as Error & { code?: string };
    err.code = 'NOT_FOOD';
    throw err;
  }

  // 5. Record в БД (атомарная RPC)
  const { data: rpcData, error: rpcError } = await supabase.rpc('record_cook_session', {
    p_recipe_id: params.recipeId,
    p_photo_url: photoUrl,
    p_ai_score: grading.score,
    p_ai_comment: grading.comment
  });
  if (rpcError) throw new Error(`Не удалось записать сессию: ${rpcError.message}`);

  return { ...(rpcData as any), grading };
}

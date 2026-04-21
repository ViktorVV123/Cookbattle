// Edge Function: grade-dish
// Принимает: { photo_url, recipe_title, recipe_description }
// Возвращает: { score: 1-10, comment: string, is_food: boolean }
//
// Деплой:
//   supabase functions deploy grade-dish
// Секреты:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

// @ts-ignore — Deno runtime, в обычном tsc не резолвится
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

interface RequestBody {
  photo_url: string;
  recipe_title: string;
  recipe_description?: string;
}

interface GradingResult {
  is_food: boolean;
  score: number;
  comment: string;
}

const SYSTEM_PROMPT = `Ты — доброжелательный судья кулинарной подачи в приложении CookBattle.

Твоя задача:
1. Посмотреть на фото и решить, действительно ли это приготовленное блюдо / еда на тарелке. Если на фото НЕ еда (селфи, мем, предмет, пустой стол, мусор, человек) — is_food=false, score=0, comment="На фото не видно готового блюда. Попробуй переснять тарелку сверху при хорошем свете."
2. Если это еда — оцени подачу по шкале 1–10 с учётом: цвет, композиция, аккуратность, соответствие рецепту, креативность сервировки.
3. ВАЖНО: всегда будь тёплым и поддерживающим. Даже слабую подачу оцени минимум на 5. Хвали за конкретное ("удачный цвет соуса", "красиво уложил зелень") и давай ОДИН конкретный совет на будущее. Не унижай, не говори "плохо" — говори "можно ещё лучше если…".
4. Комментарий: 1–2 предложения, живо и по-человечески. На русском. Без смайликов в начале.

Формат ответа — ТОЛЬКО JSON, без markdown-обёртки:
{"is_food": boolean, "score": number 0-10, "comment": "строка"}`;

async function fetchImageAsBase64(url: string): Promise<{ data: string; mediaType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Не смог загрузить фото: ${res.status}`);

  const mediaType = res.headers.get('content-type') ?? 'image/jpeg';
  const buf = new Uint8Array(await res.arrayBuffer());

  // Base64 без превышения стека (большие фото могут быть 4-5 MB)
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < buf.length; i += chunkSize) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunkSize));
  }
  return { data: btoa(binary), mediaType };
}

function parseGradingResponse(text: string): GradingResult {
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
  const parsed = JSON.parse(cleaned);

  if (typeof parsed.is_food !== 'boolean' ||
      typeof parsed.score !== 'number' ||
      typeof parsed.comment !== 'string') {
    throw new Error('Неожиданный формат ответа от Claude');
  }

  // Клэмпим score на всякий случай
  const score = Math.max(0, Math.min(10, Math.round(parsed.score)));

  return { is_food: parsed.is_food, score, comment: parsed.comment.trim() };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY не задан' }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' }
    });
  }

  try {
    const body = (await req.json()) as RequestBody;
    if (!body.photo_url || !body.recipe_title) {
      return new Response(JSON.stringify({ error: 'Нужны photo_url и recipe_title' }), {
        status: 400,
        headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    const { data: imageB64, mediaType } = await fetchImageAsBase64(body.photo_url);

    const userPrompt = `Рецепт: "${body.recipe_title}".${
      body.recipe_description ? ` Описание: ${body.recipe_description}` : ''
    }\n\nОцени подачу на фото.`;

    const apiResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageB64 } },
              { type: 'text', text: userPrompt }
            ]
          }
        ]
      })
    });

    if (!apiResp.ok) {
      const err = await apiResp.text();
      console.error('Claude API error:', apiResp.status, err);
      return new Response(JSON.stringify({ error: 'AI временно недоступен' }), {
        status: 502,
        headers: { ...CORS, 'content-type': 'application/json' }
      });
    }

    const data = await apiResp.json();
    const text = data.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');

    const result = parseGradingResponse(text);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...CORS, 'content-type': 'application/json' }
    });
  } catch (e: any) {
    console.error('grade-dish error:', e);
    return new Response(JSON.stringify({ error: e.message ?? 'Неизвестная ошибка' }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' }
    });
  }
});

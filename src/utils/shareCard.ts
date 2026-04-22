/**
 * Генерация shareable-карточки с результатом AI-оценки блюда.
 * Формат Stories: 1080x1920 (9:16) — идеально для Instagram/TikTok.
 *
 * Возвращает Blob, который можно:
 *  - скачать как PNG через createObjectURL + <a download>
 *  - расшарить через Web Share API (navigator.share)
 */

interface ShareCardParams {
  photoUrl: string;          // URL фото приготовленного блюда
  score: number;             // 1-10
  comment: string;           // Комментарий AI
  recipeTitle: string;
  cuisine?: string;
}

// Размеры холста — Instagram Stories / TikTok
const W = 1080;
const H = 1920;

// Цвета в HEX (без var() потому что Canvas не понимает CSS-переменные)
const COLORS = {
  bgDark: '#0f0f14',
  bgMid: '#1a1a22',
  primary: '#ff6b35',
  gold: '#ffc857',
  goldLight: '#f5d08a',
  goldDark: '#a87020',
  success: '#4ade80',
  textLight: '#f5f5f7',
  textDim: '#a0a0b0',
  textMuted: '#6b6b7a'
};

function getScoreColor(score: number): string {
  if (score >= 9) return COLORS.success;
  if (score >= 7) return COLORS.gold;
  return COLORS.primary;
}

/**
 * Загружает изображение по URL и ждёт готовности.
 * Если CORS запрещает — возвращает null (не упадёт).
 */
async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // нужно для toBlob без tainted-канваса
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Помощник: рисует прямоугольник со скруглёнными углами */
function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Рисует логотип-шапку шефа с золотым контуром.
 * cx, cy — центр, size — итоговый размер квадрата (px).
 * Форма повторяет SVG из ChefHatLogo — viewBox 0..200 масштабируем в size.
 */
function drawChefHat(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.save();
  // Переносим 0,0 в левый-верхний угол логотипа и масштабируем "как будто" viewBox 200x200
  const s = size / 200;
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(s, s);

  // Градиент для контура
  const goldGrad = ctx.createLinearGradient(0, 0, 0, 200);
  goldGrad.addColorStop(0, COLORS.goldLight);
  goldGrad.addColorStop(0.55, COLORS.gold);
  goldGrad.addColorStop(1, COLORS.goldDark);

  ctx.strokeStyle = goldGrad;
  ctx.lineWidth = 5.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Верх: три облачка (те же координаты, что в SVG)
  ctx.beginPath();
  ctx.moveTo(50, 120);
  ctx.bezierCurveTo(22, 120, 18, 85, 42, 75);
  ctx.bezierCurveTo(30, 48, 62, 30, 78, 52);
  ctx.bezierCurveTo(84, 28, 118, 26, 124, 52);
  ctx.bezierCurveTo(142, 32, 176, 50, 160, 78);
  ctx.bezierCurveTo(182, 88, 178, 122, 150, 120);
  ctx.closePath();
  ctx.stroke();

  // Манжет
  ctx.beginPath();
  ctx.moveTo(55, 120);
  ctx.lineTo(55, 152);
  ctx.quadraticCurveTo(55, 162, 65, 162);
  ctx.lineTo(135, 162);
  ctx.quadraticCurveTo(145, 162, 145, 152);
  ctx.lineTo(145, 120);
  ctx.stroke();

  // Линия-перегиб
  ctx.beginPath();
  ctx.moveTo(58, 132);
  ctx.lineTo(142, 132);
  ctx.stroke();

  // Складочки — отдельный solid-цвет, тоньше
  ctx.strokeStyle = '#e6b970';
  ctx.lineWidth = 3;
  for (const x of [80, 100, 120]) {
    ctx.beginPath();
    ctx.moveTo(x, 140);
    ctx.lineTo(x, 156);
    ctx.stroke();
  }

  ctx.restore();
}

/** Переносит длинный текст по словам в несколько строк, возвращает массив строк */
function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    maxLines: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      if (lines.length === maxLines - 1) {
        // для последней строки добавляем остаток + многоточие если надо
        const rest = [word, ...words.slice(words.indexOf(word) + 1)].join(' ');
        let lastLine = rest;
        while (ctx.measureText(lastLine + '…').width > maxWidth && lastLine.length > 0) {
          lastLine = lastLine.slice(0, -1);
        }
        if (lastLine !== rest) lastLine = lastLine.trim() + '…';
        lines.push(lastLine);
        return lines;
      }
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Главная функция — генерирует PNG Blob.
 */
export async function generateShareCard(params: ShareCardParams): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context недоступен');

  // ============ Фон: градиент ============
  const bgGradient = ctx.createLinearGradient(0, 0, 0, H);
  bgGradient.addColorStop(0, '#1a0f14');
  bgGradient.addColorStop(0.5, COLORS.bgDark);
  bgGradient.addColorStop(1, '#0a0a0f');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, W, H);

  // Декоративные круги с размытием
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.filter = 'blur(80px)';
  ctx.fillStyle = COLORS.primary;
  ctx.beginPath();
  ctx.arc(150, 200, 250, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.gold;
  ctx.beginPath();
  ctx.arc(W - 100, H - 300, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ============ Watermark: шапка шефа + COOKBATTLE ============
  // Рисуем логотип слева от текста, чтобы вместе смотрелись как фирменный знак
  const wmY = 100;
  const wmGap = 18;

  ctx.font = '800 44px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const wmText = 'COOKBATTLE';
  const textW = ctx.measureText(wmText).width;
  const logoSize = 70;
  const totalW = logoSize + wmGap + textW;
  const startX = (W - totalW) / 2;

  drawChefHat(ctx, startX + logoSize / 2, wmY, logoSize);

  ctx.fillStyle = COLORS.textLight;
  ctx.fillText(wmText, startX + logoSize + wmGap, wmY);

  // ============ Фото блюда с закруглёнными углами ============
  const photoSize = 720;
  const photoX = (W - photoSize) / 2;
  const photoY = 200;
  const photoRadius = 40;

  const img = await loadImage(params.photoUrl);

  ctx.save();
  roundRect(ctx, photoX, photoY, photoSize, photoSize, photoRadius);
  ctx.clip();

  if (img) {
    // Рисуем фото с object-fit: cover
    const scale = Math.max(photoSize / img.width, photoSize / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const dx = photoX + (photoSize - drawW) / 2;
    const dy = photoY + (photoSize - drawH) / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);
  } else {
    // Если фото не загрузилось — градиент-заглушка
    const fallback = ctx.createLinearGradient(photoX, photoY, photoX + photoSize, photoY + photoSize);
    fallback.addColorStop(0, COLORS.bgMid);
    fallback.addColorStop(1, COLORS.bgDark);
    ctx.fillStyle = fallback;
    ctx.fillRect(photoX, photoY, photoSize, photoSize);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '120px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍴', photoX + photoSize / 2, photoY + photoSize / 2);
  }
  ctx.restore();

  // Бейдж с кухней поверх фото
  if (params.cuisine) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    roundRect(ctx, photoX + 30, photoY + 30, 200, 60, 30);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '600 24px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(params.cuisine, photoX + 130, photoY + 60);
    ctx.restore();
  }

  // ============ Круг со score ============
  const scoreColor = getScoreColor(params.score);
  const circleY = photoY + photoSize + 130;
  const circleR = 130;

  // Свечение
  ctx.save();
  ctx.shadowColor = scoreColor;
  ctx.shadowBlur = 40;
  ctx.strokeStyle = scoreColor;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(W / 2, circleY, circleR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Заливка круга
  ctx.fillStyle = COLORS.bgMid;
  ctx.beginPath();
  ctx.arc(W / 2, circleY, circleR - 5, 0, Math.PI * 2);
  ctx.fill();

  // Сама цифра
  ctx.fillStyle = scoreColor;
  ctx.font = '900 130px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(params.score.toString(), W / 2, circleY + 5);

  // "из 10" под цифрой внутри круга
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '600 22px -apple-system, sans-serif';
  ctx.fillText('ИЗ 10', W / 2, circleY + 70);

  // Лейбл "ОЦЕНКА AI"
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '600 28px -apple-system, sans-serif';
  ctx.fillText('ОЦЕНКА AI', W / 2, circleY + circleR + 60);

  // ============ Название рецепта ============
  const titleY = circleY + circleR + 130;
  ctx.fillStyle = COLORS.textLight;
  ctx.font = '800 56px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const titleLines = wrapText(ctx, params.recipeTitle, W - 120, 2);
  titleLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, titleY + i * 68);
  });

  // ============ Комментарий AI ============
  const commentY = titleY + titleLines.length * 68 + 40;
  ctx.fillStyle = COLORS.textDim;
  ctx.font = 'italic 400 32px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  const commentLines = wrapText(ctx, `"${params.comment}"`, W - 140, 4);
  commentLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, commentY + i * 44);
  });

  // ============ CTA в самом низу ============
  const ctaY = H - 120;
  ctx.fillStyle = COLORS.primary;
  ctx.font = '700 32px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Попробуй сам → cookbattle.app', W / 2, ctaY);

  // ============ Экспорт в Blob ============
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Не удалось сгенерировать PNG'))),
        'image/png',
        0.95
    );
  });
}

/**
 * Скачивает PNG на устройство через невидимый <a download>.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Освобождаем память через таймаут — Safari может лагать без этого
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Пробует расшарить через Web Share API.
 * На мобиле откроет нативное меню (Instagram/Telegram/WhatsApp/...).
 * На десктопе или в браузерах без поддержки — фолбэк на скачивание.
 */
export async function shareBlob(blob: Blob, filename: string, text?: string): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' });

  // Проверяем поддержку share с файлом
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'CookBattle',
        text: text ?? 'Моё блюдо в CookBattle'
      });
      return 'shared';
    } catch (e: any) {
      // Пользователь отменил — не фолбэчимся
      if (e.name === 'AbortError') return 'shared';
      // Реальная ошибка — скачиваем
      console.warn('share failed, fallback to download:', e);
    }
  }

  downloadBlob(blob, filename);
  return 'downloaded';
}

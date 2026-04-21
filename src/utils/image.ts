/**
 * Конвертация и сжатие изображения через Canvas API.
 * Поддерживаемые входы: всё что умеет браузер (HTMLImageElement) —
 * JPEG, PNG, WebP, AVIF, HEIC (на Safari), GIF.
 * Выход: JPEG Blob.
 *
 * Параметры по умолчанию выбраны так, чтобы:
 *  - Claude Vision адекватно "видел" блюдо (1024px по длинной стороне достаточно)
 *  - Фото весило 100-400 KB (быстро грузить, дёшево хранить, экономит токены)
 *  - Качество визуально неотличимо от оригинала
 */

export interface ProcessImageOptions {
    maxSize?: number; // px по длинной стороне
    quality?: number; // 0..1 для JPEG
    mimeType?: 'image/jpeg' | 'image/webp';
}

export async function processImage(
    input: File | Blob,
    options: ProcessImageOptions = {}
): Promise<Blob> {
    const { maxSize = 1024, quality = 0.85, mimeType = 'image/jpeg' } = options;

    // 1. Грузим файл в HTMLImageElement (умеет почти все форматы, что поддерживает браузер)
    const imgUrl = URL.createObjectURL(input);
    const img = new Image();

    try {
        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Не удалось прочитать файл как изображение'));
            img.src = imgUrl;
        });
    } finally {
        // URL больше не нужен
        URL.revokeObjectURL(imgUrl);
    }

    // 2. Считаем новые размеры (сохраняем пропорции)
    const { width: srcW, height: srcH } = img;
    let width = srcW;
    let height = srcH;

    if (Math.max(srcW, srcH) > maxSize) {
        const scale = maxSize / Math.max(srcW, srcH);
        width = Math.round(srcW * scale);
        height = Math.round(srcH * scale);
    }

    // 3. Рисуем на Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context недоступен');

    // Белый фон на случай прозрачности PNG (JPEG не поддерживает альфа)
    if (mimeType === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);

    // 4. Экспорт в Blob
    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Canvas.toBlob вернул null'))),
            mimeType,
            quality
        );
    });

    return blob;
}

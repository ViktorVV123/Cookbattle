import { useRef, useState } from 'react';
import { processImage } from '@/utils/image';
import styles from './PhotoCapture.module.scss';

interface Props {
  onConfirm: (blob: Blob) => void;
  disabled?: boolean;
}

type RetakeSource = 'camera' | 'gallery';

export function PhotoCapture({ onConfirm, disabled }: Props) {
  // Два отдельных input'а: camera использует capture="environment", gallery — без него.
  // На мобиле capture="environment" сразу открывает камеру, без него — показывается
  // выбор источника / файловый пикер. Одной кнопкой двух поведений не получить,
  // поэтому явно два инпута.
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Запоминаем каким способом юзер загрузил фото — чтобы "переснять" открыло
  // тот же источник. Если сделал камерой — снова камеру; если из галереи — галерею.
  const [lastSource, setLastSource] = useState<RetakeSource>('camera');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, source: RetakeSource) => {
    const file = e.target.files?.[0];
    // Всегда чистим value — чтобы выбор того же файла повторно триггерил onChange
    if (e.target) e.target.value = '';
    if (!file) return;

    setError(null);
    setLastSource(source);

    if (!file.type.startsWith('image/')) {
      setError('Файл должен быть картинкой');
      return;
    }

    // Макс 20 МБ — потом всё равно сожмём до ~200 КБ
    if (file.size > 20 * 1024 * 1024) {
      setError('Файл больше 20 МБ. Выбери другое.');
      return;
    }

    setProcessing(true);
    try {
      // Конвертируем любой формат (avif/heic/png/...) в компактный JPEG 1024px
      const processed = await processImage(file, { maxSize: 1024, quality: 0.85 });
      setBlob(processed);
      setPreview(URL.createObjectURL(processed));
    } catch (err: any) {
      console.error('Image processing failed:', err);
      setError(
          err?.message?.includes('изображение')
              ? 'Не удалось прочитать фото. Попробуй другой формат.'
              : 'Что-то пошло не так при обработке фото'
      );
    } finally {
      setProcessing(false);
    }
  };

  const retake = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setBlob(null);
    setError(null);
    // Открываем тот же источник что в прошлый раз
    if (lastSource === 'camera') {
      cameraInputRef.current?.click();
    } else {
      galleryInputRef.current?.click();
    }
  };

  const confirm = () => {
    if (blob) onConfirm(blob);
  };

  // Во время конвертации показываем спиннер
  if (processing) {
    return (
        <div className={styles.root}>
          <div className={styles.processing}>
            <div className={styles.spinner} />
            <p>Обрабатываем фото…</p>
          </div>
        </div>
    );
  }

  if (preview) {
    return (
        <div className={styles.root}>
          <div className={styles.previewWrap}>
            <img src={preview} alt="Preview" className={styles.preview} />
          </div>
          {error && <div className={styles.errorMsg}>{error}</div>}
          <div className={styles.actions}>
            <button onClick={retake} className={styles.btnSecondary} disabled={disabled}>
              📷 Переснять
            </button>
            <button onClick={confirm} className={styles.btnPrimary} disabled={disabled}>
              ✨ Отправить на оценку
            </button>
          </div>

          {/* Невидимые инпуты для "переснять" */}
          <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFile(e, 'camera')}
              className={styles.hiddenInput}
          />
          <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e, 'gallery')}
              className={styles.hiddenInput}
          />
        </div>
    );
  }

  return (
      <div className={styles.root}>
        <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFile(e, 'camera')}
            className={styles.hiddenInput}
        />
        <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFile(e, 'gallery')}
            className={styles.hiddenInput}
        />

        <div className={styles.sourceGrid}>
          <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className={`${styles.sourceBtn} ${styles.sourceBtnPrimary}`}
              disabled={disabled}
          >
            <div className={styles.sourceIcon}>📸</div>
            <div className={styles.sourceTitle}>Сфоткать</div>
            <div className={styles.sourceHint}>Открыть камеру</div>
          </button>

          <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className={styles.sourceBtn}
              disabled={disabled}
          >
            <div className={styles.sourceIcon}>🖼</div>
            <div className={styles.sourceTitle}>Из галереи</div>
            <div className={styles.sourceHint}>Выбрать готовое фото</div>
          </button>
        </div>

        <p className={styles.captionHint}>Снимай сверху при хорошем свете — AI оценит лучше</p>

        {error && <div className={styles.errorMsg}>{error}</div>}
      </div>
  );
}

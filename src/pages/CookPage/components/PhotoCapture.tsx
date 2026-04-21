import { useRef, useState } from 'react';
import { processImage } from '@/utils/image';
import styles from './PhotoCapture.module.scss';

interface Props {
  onConfirm: (blob: Blob) => void;
  disabled?: boolean;
}

export function PhotoCapture({ onConfirm, disabled }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Принимаем всё что начинается с image/
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
      // Сбрасываем input чтобы можно было выбрать тот же файл повторно
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const retake = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setBlob(null);
    setError(null);
    fileInputRef.current?.click();
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
        </div>
    );
  }

  return (
      <div className={styles.root}>
        <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            className={styles.hiddenInput}
        />
        <button
            onClick={() => fileInputRef.current?.click()}
            className={styles.captureBtn}
            disabled={disabled}
        >
          <div className={styles.captureIcon}>📸</div>
          <div className={styles.captureText}>
            <div className={styles.captureTitle}>Сфоткать блюдо</div>
            <div className={styles.captureHint}>Снимай сверху при хорошем свете</div>
          </div>
        </button>
        {error && <div className={styles.errorMsg}>{error}</div>}
      </div>
  );
}

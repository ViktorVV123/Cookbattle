import { supabase } from '@/services/supabase';
import { processImage } from '@/utils/image';

/**
 * Загружает фото в bucket 'recipes' по пути {user_id}/{uuid}.jpg
 * Сжимает в JPEG 1024px/85% перед загрузкой.
 * Возвращает public URL.
 */
export async function uploadRecipeImage(file: File | Blob): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Не авторизован');

  // Сжимаем в JPEG
  const processed = await processImage(file, { maxSize: 1024, quality: 0.85 });

  // Уникальное имя — user_id/timestamp_random.jpg
  const filename = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;

  const { error } = await supabase.storage
    .from('recipes')
    .upload(filename, processed, {
      cacheControl: '3600',
      contentType: 'image/jpeg'
    });
  if (error) throw new Error(`Не удалось загрузить фото: ${error.message}`);

  const { data: urlData } = supabase.storage.from('recipes').getPublicUrl(filename);
  return urlData.publicUrl;
}

import { supabase } from '@/integrations/supabase/client';

export async function uploadImage(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  
  const { error } = await supabase.storage
    .from('site-images')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data } = supabase.storage.from('site-images').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function uploadBase64Image(base64: string, folder: string): Promise<string | null> {
  // Convert base64 to blob
  const res = await fetch(base64);
  const blob = await res.blob();
  const file = new File([blob], `${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
  return uploadImage(file, folder);
}

export async function deleteStorageFile(publicUrl: string): Promise<void> {
  // Extract path from public URL
  const match = publicUrl.match(/site-images\/(.+)$/);
  if (match) {
    await supabase.storage.from('site-images').remove([match[1]]);
  }
}

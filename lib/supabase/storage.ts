import { supabase, isSupabaseConfigured } from './client'

const BUCKET = 'menu-images'

export async function uploadImage(file: File, path: string): Promise<string> {
  if (!isSupabaseConfigured) throw new Error('กรุณาตั้งค่า Supabase ใน .env.local ก่อนใช้งาน')
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

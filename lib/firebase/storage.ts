/**
 * Upload an image file via the server-side /api/upload route.
 * Uses ImgBB when IMGBB_API_KEY is set (production/Vercel),
 * falls back to local public/uploads/ in development.
 *
 * @param file   - The File object to upload
 * @param folder - Hint folder ('images' | 'slips') — used as filename prefix in local mode
 */
export async function uploadImage(file: File, folder = 'images'): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)

  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  if (!res.ok) throw new Error('อัปโหลดรูปไม่สำเร็จ')

  const data = await res.json()
  if (!data.url) throw new Error('ไม่ได้รับ URL รูปภาพ')
  return data.url as string
}

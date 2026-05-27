export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  if (!res.ok) throw new Error('อัปโหลดไม่สำเร็จ')
  const data = await res.json()
  return data.url
}

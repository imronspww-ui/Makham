import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { app, isFirebaseConfigured } from '@/lib/firebase/config'

/**
 * Upload a file directly to Firebase Storage from the browser.
 * Returns the public download URL.
 *
 * @param file   - The File object to upload
 * @param folder - Storage folder ('images' for menu, 'slips' for payment slips)
 */
export async function uploadImage(file: File, folder = 'images'): Promise<string> {
  if (!isFirebaseConfigured) {
    throw new Error('กรุณาตั้งค่า Firebase ก่อนอัปโหลดรูปภาพ')
  }

  const storage = getStorage(app)
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const storageRef = ref(storage, path)

  const snapshot = await uploadBytes(storageRef, file)
  return getDownloadURL(snapshot.ref)
}

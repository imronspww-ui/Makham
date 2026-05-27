import {
  db,
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  docToData,
} from '@/lib/firebase/firestore'
import { isFirebaseConfigured } from '@/lib/firebase/config'
import { cacheGet, cacheSet, cacheClear } from '@/lib/utils/cache'
import type { Category } from '@/types'

const COL = 'categories'
const CACHE_KEY = 'cat:all'
const TTL = 120_000

export async function getCategories(): Promise<Category[]> {
  const cached = cacheGet<Category[]>(CACHE_KEY)
  if (cached) return cached
  if (!isFirebaseConfigured) return []

  try {
    const q = query(collection(db, COL), orderBy('sortOrder', 'asc'))
    const snap = await getDocs(q)
    const cats = snap.docs.map((d) => docToData<Category>(d.id, d.data()))
    cacheSet(CACHE_KEY, cats, TTL)
    return cats
  } catch {
    return []
  }
}

const requireFirebase = () => {
  if (!isFirebaseConfigured) throw new Error('กรุณาตั้งค่า Firebase ใน .env.local ก่อนใช้งาน')
}

export async function createCategory(data: Omit<Category, 'id' | 'createdAt'>): Promise<string> {
  requireFirebase()
  const ref = await addDoc(collection(db, COL), { ...data, createdAt: Timestamp.now() })
  cacheClear('cat:')
  return ref.id
}

export async function updateCategory(
  id: string,
  data: Partial<Omit<Category, 'id' | 'createdAt'>>,
): Promise<void> {
  requireFirebase()
  await updateDoc(doc(db, COL, id), data)
  cacheClear('cat:')
}

export async function deleteCategory(id: string): Promise<void> {
  requireFirebase()
  await deleteDoc(doc(db, COL, id))
  cacheClear('cat:')
}

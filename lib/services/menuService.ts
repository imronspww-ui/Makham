import {
  db,
  collection,
  doc,
  getDoc,
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
import type { MenuItem } from '@/types'

const COL = 'menuItems'
const CACHE_KEY = 'menu:all'
const TTL = 60_000

export async function getMenuItems(): Promise<MenuItem[]> {
  const cached = cacheGet<MenuItem[]>(CACHE_KEY)
  if (cached) return cached
  if (!isFirebaseConfigured) return []

  try {
    const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    const items = snap.docs.map((d) => docToData<MenuItem>(d.id, d.data()))
    cacheSet(CACHE_KEY, items, TTL)
    return items
  } catch {
    return []
  }
}

export async function getMenuItem(id: string): Promise<MenuItem | null> {
  if (!isFirebaseConfigured) return null
  try {
    const snap = await getDoc(doc(db, COL, id))
    if (!snap.exists()) return null
    return docToData<MenuItem>(snap.id, snap.data())
  } catch {
    return null
  }
}

const requireFirebase = () => {
  if (!isFirebaseConfigured) throw new Error('กรุณาตั้งค่า Firebase ใน .env.local ก่อนใช้งาน')
}

export async function createMenuItem(
  data: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  requireFirebase()
  const now = Timestamp.now()
  const ref = await addDoc(collection(db, COL), { ...data, createdAt: now, updatedAt: now })
  cacheClear('menu:')
  return ref.id
}

export async function updateMenuItem(
  id: string,
  data: Partial<Omit<MenuItem, 'id' | 'createdAt'>>,
): Promise<void> {
  requireFirebase()
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: Timestamp.now() })
  cacheClear('menu:')
}

export async function deleteMenuItem(id: string): Promise<void> {
  requireFirebase()
  await deleteDoc(doc(db, COL, id))
  cacheClear('menu:')
}

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
  writeBatch,
  Timestamp,
  docToData,
} from '@/lib/firebase/firestore'
import { isFirebaseConfigured } from '@/lib/firebase/config'
import { cacheGet, cacheSet, cacheClear } from '@/lib/utils/cache'
import type { MenuItem, OptionGroup } from '@/types'

const COL = 'menuItems'
const CACHE_KEY = 'menu:all'
const TTL = 60_000

export async function getMenuItems(): Promise<MenuItem[]> {
  const cached = cacheGet<MenuItem[]>(CACHE_KEY)
  if (cached) return cached
  if (!isFirebaseConfigured) return []

  try {
    const snap = await getDocs(collection(db, COL))
    const items = snap.docs
      .map((d) => docToData<MenuItem>(d.id, d.data()))
      .sort((a, b) => {
        const ao = a.sortOrder ?? 9999
        const bo = b.sortOrder ?? 9999
        if (ao !== bo) return ao - bo
        return a.createdAt < b.createdAt ? 1 : -1
      })
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

export async function updateMenuItemsOrder(orders: { id: string; sortOrder: number }[]): Promise<void> {
  requireFirebase()
  const batch = writeBatch(db)
  for (const { id, sortOrder } of orders) {
    batch.update(doc(db, COL, id), { sortOrder })
  }
  await batch.commit()
  cacheClear('menu:')
}

// ─── Choice-level sold-out ────────────────────────────────────────────────────

/**
 * ตั้งสถานะหมดเฉพาะตัวเลือกย่อย เช่น "ไก่ยอ หมด" โดยไม่กระทบตัวเลือกอื่น
 */
export async function toggleChoiceSoldOut(
  menuItemId: string,
  groupId:    string,
  choiceId:   string,
  soldOut:    boolean,
): Promise<void> {
  requireFirebase()
  const ref  = doc(db, COL, menuItemId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return

  const data    = snap.data() as Record<string, unknown>
  const groups  = (data.optionGroups as OptionGroup[]) ?? []
  const updated = groups.map((g) => {
    if (g.id !== groupId) return g
    return {
      ...g,
      choices: g.choices.map((c) =>
        c.id === choiceId ? { ...c, isSoldOut: soldOut } : c,
      ),
    }
  })
  await updateDoc(ref, { optionGroups: updated, updatedAt: Timestamp.now() })
  cacheClear('menu:')
}


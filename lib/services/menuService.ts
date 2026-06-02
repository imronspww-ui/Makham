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

// ─── Stock management ─────────────────────────────────────────────────────────

const todayStr = () => new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD

/**
 * ตั้งสต็อกรายวัน — เรียกจากหน้า admin menu
 * dailyStock = 0 → ไม่จำกัด
 */
export async function setDailyStock(id: string, dailyStock: number): Promise<void> {
  requireFirebase()
  const today = todayStr()
  await updateDoc(doc(db, COL, id), {
    dailyStock,
    currentStock: dailyStock > 0 ? dailyStock : null,
    stockDate:    today,
    isSoldOut:    false,   // รีเซ็ตสถานะหมดด้วย
    updatedAt:    Timestamp.now(),
  })
  cacheClear('menu:')
}

/**
 * หักสต็อกเมื่อมีออเดอร์ — เรียกหลัง createOrder
 * ถ้า currentStock ถึง 0 → mark isSoldOut อัตโนมัติ
 */
export async function decrementStock(
  items: Array<{ menuItemId: string; qty: number }>,
): Promise<void> {
  if (!isFirebaseConfigured) return
  const today = todayStr()

  await Promise.allSettled(
    items.map(async ({ menuItemId, qty }) => {
      const ref  = doc(db, COL, menuItemId)
      const snap = await getDoc(ref)
      if (!snap.exists()) return

      const d = snap.data() as Record<string, unknown>
      const dailyStock   = (d.dailyStock as number | undefined) ?? 0
      if (!dailyStock) return  // ไม่จำกัดสต็อก → ไม่ต้องทำอะไร

      // รีเซ็ตถ้าข้ามวัน
      const stockDate    = (d.stockDate  as string  | undefined) ?? ''
      const currentStock = stockDate === today
        ? ((d.currentStock as number | undefined) ?? dailyStock)
        : dailyStock  // ข้ามวัน → เริ่มใหม่

      const remaining = Math.max(0, currentStock - qty)
      await updateDoc(ref, {
        currentStock: remaining,
        stockDate:    today,
        ...(remaining === 0 && { isSoldOut: true }),
        updatedAt:    Timestamp.now(),
      })
    })
  )
  cacheClear('menu:')
}

/** รีเซ็ตสต็อกทุกรายการที่มี dailyStock > 0 (กดปุ่มตอนเปิดร้าน) */
export async function resetAllStock(): Promise<void> {
  requireFirebase()
  const today = todayStr()
  const snap  = await getDocs(query(collection(db, COL)))
  await Promise.allSettled(
    snap.docs.map(async (d) => {
      const data        = d.data() as Record<string, unknown>
      const dailyStock  = (data.dailyStock as number | undefined) ?? 0
      if (!dailyStock) return
      await updateDoc(d.ref, {
        currentStock: dailyStock,
        stockDate:    today,
        isSoldOut:    false,
        updatedAt:    Timestamp.now(),
      })
    })
  )
  cacheClear('menu:')
}

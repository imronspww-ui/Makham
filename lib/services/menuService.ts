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
  runTransaction,
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

// ─── Stock management ─────────────────────────────────────────────────────────

/**
 * ตั้งสต็อกสินค้า — เรียกจากหน้า admin menu
 * stockQty = 0 → ไม่จำกัด
 * packSize = จำนวนชิ้นต่อแพ็ค (เก็บไว้อ้างอิง)
 */
export async function setStock(
  id: string,
  stockQty: number,
  packSize?: number,
): Promise<void> {
  requireFirebase()
  await updateDoc(doc(db, COL, id), {
    stockQty:  stockQty > 0 ? stockQty : null,
    packSize:  packSize && packSize > 0 ? packSize : null,
    isSoldOut: false,
    updatedAt: Timestamp.now(),
  })
  cacheClear('menu:')
}

/**
 * หักสต็อกเมื่อมีออเดอร์ — เรียกหลัง createOrder
 * ใช้ Firestore transaction เพื่อป้องกัน race condition กรณีหลายออเดอร์พร้อมกัน
 * ถ้า stockQty ถึง 0 → mark isSoldOut อัตโนมัติ
 */
export async function decrementStock(
  items: Array<{ menuItemId: string; qty: number }>,
): Promise<void> {
  if (!isFirebaseConfigured) return

  await Promise.allSettled(
    items.map(({ menuItemId, qty }) =>
      runTransaction(db, async (txn) => {
        const ref  = doc(db, COL, menuItemId)
        const snap = await txn.get(ref)
        if (!snap.exists()) return

        const d        = snap.data() as Record<string, unknown>
        const stockQty = (d.stockQty as number | undefined) ?? 0
        if (!stockQty) return   // ไม่จำกัดสต็อก → ไม่ต้องทำอะไร

        const remaining = Math.max(0, stockQty - qty)
        txn.update(ref, {
          stockQty:  remaining,
          ...(remaining === 0 && { isSoldOut: true }),
          updatedAt: Timestamp.now(),
        })
      }),
    ),
  )
  cacheClear('menu:')
}

/** เติมสต็อกสินค้า (เพิ่มจำนวน) — เรียกเมื่อรับสินค้าเข้าใหม่ */
export async function restockItem(id: string, addQty: number): Promise<void> {
  requireFirebase()
  const snap = await getDoc(doc(db, COL, id))
  if (!snap.exists()) return
  const current = (snap.data().stockQty as number | undefined) ?? 0
  await updateDoc(doc(db, COL, id), {
    stockQty:  current + addQty,
    isSoldOut: false,
    updatedAt: Timestamp.now(),
  })
  cacheClear('menu:')
}

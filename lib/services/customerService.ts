import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from '@/lib/firebase/firestore'
import { isFirebaseConfigured } from '@/lib/firebase/config'
import type { CustomerProfile } from '@/types'

const COL = 'customers'

// ─── Helper ──────────────────────────────────────────────────────────────────

function toExpireAt(months: number): Timestamp {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return Timestamp.fromDate(d)
}

function isExpired(ts: unknown): boolean {
  if (!ts || typeof ts !== 'object' || !('toDate' in ts)) return false
  return (ts as Timestamp).toDate() < new Date()
}

function docToProfile(id: string, d: Record<string, unknown>): CustomerProfile {
  const expired = isExpired(d.pointsExpireAt)
  return {
    id,
    phone: id,
    name:         (d.name as string)            ?? '',
    points:       expired ? 0 : ((d.points as number)   ?? 0),
    totalOrders:  (d.totalOrders as number)      ?? 0,
    totalSpent:   (d.totalSpent as number)       ?? 0,
    lastOrderAt:  (d.lastOrderAt as Timestamp)?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    pointsExpireAt: (d.pointsExpireAt as Timestamp)?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    createdAt:    (d.createdAt as Timestamp)?.toDate?.()?.toISOString()    ?? new Date().toISOString(),
    updatedAt:    (d.updatedAt as Timestamp)?.toDate?.()?.toISOString()    ?? new Date().toISOString(),
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** ดึงโปรไฟล์ลูกค้าจากเบอร์โทร (null ถ้าไม่มีข้อมูล) */
export async function getCustomer(phone: string): Promise<CustomerProfile | null> {
  if (!isFirebaseConfigured || !phone) return null
  try {
    const snap = await getDoc(doc(db, COL, phone))
    if (!snap.exists()) return null
    return docToProfile(snap.id, snap.data() as Record<string, unknown>)
  } catch {
    return null
  }
}

/**
 * อัปเดตแต้มหลังสั่งอาหารสำเร็จ
 * - สร้าง document ใหม่ถ้าลูกค้าสั่งครั้งแรก
 * - รีเซ็ตวันหมดอายุทุกครั้งที่สั่ง
 * - ถ้าแต้มเดิมหมดอายุแล้ว → เริ่มใหม่จาก 0
 */
export async function upsertCustomerAfterOrder({
  phone,
  name,
  pointsEarned,
  pointsUsed,
  orderTotal,
  expiryMonths,
}: {
  phone: string
  name: string
  pointsEarned: number
  pointsUsed: number
  orderTotal: number
  expiryMonths: number
}): Promise<void> {
  if (!isFirebaseConfigured || !phone) return
  try {
    const ref  = doc(db, COL, phone)
    const snap = await getDoc(ref)
    const now  = Timestamp.now()
    const exp  = toExpireAt(expiryMonths)

    if (!snap.exists()) {
      await setDoc(ref, {
        name,
        points:       Math.max(0, pointsEarned - pointsUsed),
        totalOrders:  1,
        totalSpent:   orderTotal,
        lastOrderAt:  now,
        pointsExpireAt: exp,
        createdAt:    now,
        updatedAt:    now,
      })
    } else {
      const d = snap.data() as Record<string, unknown>
      // ถ้าหมดอายุแล้ว เริ่มนับใหม่จาก 0
      const base = isExpired(d.pointsExpireAt) ? 0 : ((d.points as number) ?? 0)
      await updateDoc(ref, {
        name,
        points:       Math.max(0, base + pointsEarned - pointsUsed),
        totalOrders:  ((d.totalOrders as number) ?? 0) + 1,
        totalSpent:   ((d.totalSpent as number)  ?? 0) + orderTotal,
        lastOrderAt:  now,
        pointsExpireAt: exp,
        updatedAt:    now,
      })
    }
  } catch { /* silent — ไม่ให้ความผิดพลาดด้านแต้มทำให้ order สะดุด */ }
}

/**
 * สร้างลูกค้าใหม่ด้วยมือโดย admin
 * โยน Error ถ้าเบอร์โทรมีอยู่แล้วในระบบ
 */
export async function createCustomer(
  phone: string,
  name: string,
  initialPoints: number,
  expiryMonths: number = 3,
): Promise<void> {
  if (!isFirebaseConfigured) throw new Error('Firebase ไม่ได้ตั้งค่า')
  const ref  = doc(db, COL, phone)
  const snap = await getDoc(ref)
  if (snap.exists()) throw new Error('เบอร์โทรนี้มีอยู่ในระบบแล้ว')
  const now = Timestamp.now()
  await setDoc(ref, {
    name,
    points:         Math.max(0, initialPoints),
    totalOrders:    0,
    totalSpent:     0,
    lastOrderAt:    now,
    pointsExpireAt: toExpireAt(expiryMonths),
    createdAt:      now,
    updatedAt:      now,
  })
}

/** ปรับแต้มด้วยมือโดย admin (+delta หรือ -delta) */
export async function adjustCustomerPoints(phone: string, delta: number): Promise<void> {
  if (!isFirebaseConfigured) return
  const ref  = doc(db, COL, phone)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const d = snap.data() as Record<string, unknown>
  const current = isExpired(d.pointsExpireAt) ? 0 : ((d.points as number) ?? 0)
  await updateDoc(ref, {
    points:    Math.max(0, current + delta),
    updatedAt: Timestamp.now(),
  })
}

/** ดึงลูกค้าทั้งหมด (สำหรับหน้า admin) */
export async function getCustomers(): Promise<CustomerProfile[]> {
  if (!isFirebaseConfigured) return []
  try {
    const q    = query(collection(db, COL), orderBy('lastOrderAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => docToProfile(d.id, d.data() as Record<string, unknown>))
  } catch {
    return []
  }
}

/** ลบข้อมูลลูกค้าโดย admin */
export async function deleteCustomer(phone: string): Promise<void> {
  if (!isFirebaseConfigured) throw new Error('Firebase ไม่ได้ตั้งค่า')
  const ref = doc(db, COL, phone)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('ไม่พบข้อมูลลูกค้า')
  await deleteDoc(ref)
}

/** Real-time subscription สำหรับหน้า admin */
export function subscribeToCustomers(callback: (customers: CustomerProfile[]) => void): () => void {
  if (!isFirebaseConfigured) { callback([]); return () => {} }
  const q = query(collection(db, COL), orderBy('lastOrderAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => docToProfile(d.id, d.data() as Record<string, unknown>))),
    () => callback([]),
  )
}

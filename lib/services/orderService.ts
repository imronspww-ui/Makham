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
  where,
  onSnapshot,
  Timestamp,
  docToData,
} from '@/lib/firebase/firestore'
import { isFirebaseConfigured } from '@/lib/firebase/config'
import type { Order, OrderStatus } from '@/types'
import { adjustCustomerPoints } from '@/lib/services/customerService'
import { trackMenuOrders } from '@/lib/services/menuStatsService'

const COL = 'orders'

export async function getOrdersByPhone(phone: string): Promise<Order[]> {
  if (!isFirebaseConfigured || !phone) return []
  try {
    const q = query(
      collection(db, COL),
      where('customer.phone', '==', phone),
      orderBy('createdAt', 'desc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => docToData<Order>(d.id, d.data()))
  } catch {
    return []
  }
}

export async function getOrders(): Promise<Order[]> {
  if (!isFirebaseConfigured) return []
  try {
    const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => docToData<Order>(d.id, d.data()))
  } catch {
    return []
  }
}

export async function getOrder(id: string): Promise<Order | null> {
  if (!isFirebaseConfigured) return null
  try {
    const snap = await getDoc(doc(db, COL, id))
    if (!snap.exists()) return null
    return docToData<Order>(snap.id, snap.data())
  } catch {
    return null
  }
}

const requireFirebase = () => {
  if (!isFirebaseConfigured) throw new Error('กรุณาตั้งค่า Firebase ใน .env.local ก่อนใช้งาน')
}

export async function createOrder(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  requireFirebase()
  const now = Timestamp.now()
  const ref = await addDoc(collection(db, COL), { ...data, createdAt: now, updatedAt: now })
  // fire-and-forget: track daily order counts per menu item
  const menuItemIds = [...new Set(data.items.map(i => i.menuItemId))]
  trackMenuOrders(menuItemIds).catch(() => {})
  return ref.id
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  requireFirebase()
  // Read before write so _reversePoints sees the original pointsEarned/pointsUsed
  const snap = status === 'cancelled' ? await getDoc(doc(db, COL, id)) : null
  const extra = status === 'completed' ? { 'payment.status': 'paid' } : {}
  await updateDoc(doc(db, COL, id), { status, ...extra, updatedAt: Timestamp.now() })
  if (snap?.exists()) await _reversePoints(snap.data() as Order)
}

export async function updatePaymentStatus(id: string, status: 'pending' | 'paid'): Promise<void> {
  requireFirebase()
  await updateDoc(doc(db, COL, id), { 'payment.status': status, updatedAt: Timestamp.now() })
}

export async function updateOrderSlip(id: string, slipUrl: string): Promise<void> {
  requireFirebase()
  await updateDoc(doc(db, COL, id), { 'payment.slipUrl': slipUrl, updatedAt: Timestamp.now() })
}

export function subscribeToOrders(callback: (orders: Order[]) => void): () => void {
  if (!isFirebaseConfigured) { callback([]); return () => {} }
  const q = query(collection(db, COL), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => docToData<Order>(d.id, d.data())))
  })
}

/** ลบออเดอร์เดี่ยว */
export async function deleteOrder(id: string): Promise<void> {
  requireFirebase()
  await deleteDoc(doc(db, COL, id))
}

/** ลบออเดอร์ทั้งหมดใน collection — ใช้ก่อน go-live เพื่อล้างข้อมูลทดสอบ */
export async function deleteAllOrders(): Promise<number> {
  requireFirebase()
  const snap = await getDocs(collection(db, COL))
  await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, COL, d.id))))
  return snap.docs.length
}

/** ลูกค้าขอยกเลิกออเดอร์ — บันทึก cancelRequest รอ admin ยืนยัน */
export async function requestCancelOrder(id: string, reason: string): Promise<void> {
  requireFirebase()
  await updateDoc(doc(db, COL, id), {
    cancelRequest: { reason, requestedAt: new Date().toISOString() },
    updatedAt: Timestamp.now(),
  })
}

/** admin อนุมัติ/ปฏิเสธคำขอยกเลิก */
export async function respondToCancelRequest(
  id: string,
  approve: boolean,
): Promise<void> {
  requireFirebase()
  if (approve) {
    const snap = await getDoc(doc(db, COL, id))
    await updateDoc(doc(db, COL, id), {
      status: 'cancelled' as OrderStatus,
      cancelRequest: null,
      updatedAt: Timestamp.now(),
    })
    if (snap.exists()) await _reversePoints(snap.data() as Order)
  } else {
    await updateDoc(doc(db, COL, id), {
      cancelRequest: null,
      updatedAt: Timestamp.now(),
    })
  }
}

/** หักแต้มคืนเมื่อยกเลิก — clawback pointsEarned, คืน pointsUsed */
async function _reversePoints(order: Order): Promise<void> {
  const phone = order.customer?.phone
  if (!phone) return
  const earned = order.pointsEarned ?? 0
  const used   = order.pointsUsed   ?? 0
  const delta  = used - earned  // ถ้า earned=5, used=0 → delta=-5 (หัก 5 แต้ม)
  if (delta !== 0) {
    await adjustCustomerPoints(phone, delta).catch(() => {})
  }
}

export function subscribeToOrder(id: string, callback: (order: Order | null) => void): () => void {
  if (!isFirebaseConfigured) { callback(null); return () => {} }
  return onSnapshot(doc(db, COL, id), (snap) => {
    callback(snap.exists() ? docToData<Order>(snap.id, snap.data()) : null)
  })
}

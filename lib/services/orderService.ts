import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  docToData,
} from '@/lib/firebase/firestore'
import { isFirebaseConfigured } from '@/lib/firebase/config'
import type { Order, OrderStatus } from '@/types'

const COL = 'orders'

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
  return ref.id
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  requireFirebase()
  await updateDoc(doc(db, COL, id), { status, updatedAt: Timestamp.now() })
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

export function subscribeToOrder(id: string, callback: (order: Order | null) => void): () => void {
  if (!isFirebaseConfigured) { callback(null); return () => {} }
  return onSnapshot(doc(db, COL, id), (snap) => {
    callback(snap.exists() ? docToData<Order>(snap.id, snap.data()) : null)
  })
}

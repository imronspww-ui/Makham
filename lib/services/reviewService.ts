import {
  db, collection, doc, addDoc, getDocs, query,
  where, orderBy, updateDoc, Timestamp,
} from '@/lib/firebase/firestore'
import { isFirebaseConfigured } from '@/lib/firebase/config'
import { updateMenuItem } from './menuService'
import type { Review } from '@/types'

const COL = 'reviews'

function docToReview(id: string, d: Record<string, unknown>): Review {
  return {
    id,
    menuItemId:   (d.menuItemId   as string) ?? '',
    menuItemName: (d.menuItemName as string) ?? '',
    orderId:      (d.orderId      as string) ?? '',
    orderNumber:  (d.orderNumber  as string) ?? '',
    rating:       (d.rating       as number) ?? 0,
    comment:      (d.comment      as string) ?? undefined,
    createdAt:    (d.createdAt    as Timestamp)?.toDate?.()?.toISOString() ?? new Date().toISOString(),
  }
}

/** บันทึกรีวิวและอัปเดต avgRating บน menuItem */
export async function addReview(data: Omit<Review, 'id' | 'createdAt'>): Promise<void> {
  if (!isFirebaseConfigured) return
  const now = Timestamp.now()
  await addDoc(collection(db, COL), { ...data, createdAt: now })

  // คำนวณ avg rating ใหม่
  const snap = await getDocs(
    query(collection(db, COL), where('menuItemId', '==', data.menuItemId))
  )
  const ratings = snap.docs.map((d) => (d.data().rating as number) ?? 0).filter(Boolean)
  if (ratings.length === 0) return
  const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length
  await updateMenuItem(data.menuItemId, {
    avgRating:   Math.round(avg * 10) / 10,
    ratingCount: ratings.length,
  })
}

/** ดึงรีวิวทั้งหมดของ menu item */
export async function getMenuReviews(menuItemId: string): Promise<Review[]> {
  if (!isFirebaseConfigured) return []
  try {
    const snap = await getDocs(
      query(collection(db, COL),
        where('menuItemId', '==', menuItemId),
        orderBy('createdAt', 'desc'),
      )
    )
    return snap.docs.map((d) => docToReview(d.id, d.data() as Record<string, unknown>))
  } catch { return [] }
}

/** เช็คว่า orderId นี้เคยรีวิวไปแล้วหรือยัง */
export async function hasReviewed(orderId: string): Promise<boolean> {
  if (!isFirebaseConfigured) return false
  try {
    const snap = await getDocs(
      query(collection(db, COL), where('orderId', '==', orderId))
    )
    return !snap.empty
  } catch { return false }
}

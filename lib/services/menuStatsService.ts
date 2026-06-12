import {
  db, collection, doc, getDoc, getDocs, setDoc, updateDoc, increment, Timestamp,
} from '@/lib/firebase/firestore'
import { isFirebaseConfigured } from '@/lib/firebase/config'

const COL = 'menuStats'

function todayStr() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

interface MenuStat {
  ordersToday: number
  todayDate: string
  clicksTotal: number
  ordersTotal: number
}

/** อัปเดตจำนวนออเดอร์วันนี้สำหรับแต่ละเมนูในออเดอร์ */
export async function trackMenuOrders(menuItemIds: string[]): Promise<void> {
  if (!isFirebaseConfigured || menuItemIds.length === 0) return
  const today = todayStr()
  await Promise.all(
    menuItemIds.map(async (id) => {
      const ref = doc(db, COL, id)
      const snap = await getDoc(ref)
      if (!snap.exists()) {
        await setDoc(ref, { ordersToday: 1, todayDate: today, clicksTotal: 0, ordersTotal: 1 })
      } else {
        const d = snap.data() as MenuStat
        if (d.todayDate === today) {
          await updateDoc(ref, { ordersToday: increment(1), ordersTotal: increment(1) })
        } else {
          await updateDoc(ref, { ordersToday: 1, todayDate: today, ordersTotal: increment(1) })
        }
      }
    })
  )
}

/** บันทึก click เมื่อลูกค้ากดดูเมนู (fire-and-forget) */
export async function trackMenuClick(menuItemId: string): Promise<void> {
  if (!isFirebaseConfigured) return
  const ref = doc(db, COL, menuItemId)
  const today = todayStr()
  try {
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, { ordersToday: 0, todayDate: today, clicksTotal: 1, ordersTotal: 0 })
    } else {
      await updateDoc(ref, { clicksTotal: increment(1) })
    }
  } catch { /* fire-and-forget */ }
}

/** ดึง stats ทั้งหมด */
export async function getAllMenuStats(): Promise<Record<string, MenuStat>> {
  if (!isFirebaseConfigured) return {}
  try {
    const snap = await getDocs(collection(db, COL))
    const today = todayStr()
    const result: Record<string, MenuStat> = {}
    snap.docs.forEach((d) => {
      const data = d.data() as MenuStat
      result[d.id] = {
        ...data,
        ordersToday: data.todayDate === today ? (data.ordersToday ?? 0) : 0,
      }
    })
    return result
  } catch { return {} }
}

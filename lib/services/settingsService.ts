import { db, doc, getDoc, setDoc, onSnapshot } from '@/lib/firebase/firestore'
import { isFirebaseConfigured } from '@/lib/firebase/config'
import { cacheGet, cacheSet, cacheClear } from '@/lib/utils/cache'
import type { Settings, PromptPaySettings, DeliverySettings, StoreSettings, OpeningHoursSettings, LoyaltySettings, ReceiptSettings } from '@/types'

const CACHE_KEY = 'settings:main'
const TTL = 5 * 60_000

const DEFAULT_SETTINGS: Settings = {
  store: {
    name: process.env.NEXT_PUBLIC_STORE_NAME ?? 'ร้านมะขาม',
    address: '',
    lat: parseFloat(process.env.NEXT_PUBLIC_STORE_LAT ?? '13.7563'),
    lng: parseFloat(process.env.NEXT_PUBLIC_STORE_LNG ?? '100.5018'),
  },
  promptpay: { phone: '', accountName: '' },
  delivery: { enabled: true, freeFirstKm: 0, minOrderAmount: 0, pricePerKm: 10, minDistance: 1, minFee: 30, maxDistance: 20 },
}

export async function getSettings(): Promise<Settings> {
  const cached = cacheGet<Settings>(CACHE_KEY)
  if (cached) return cached
  if (!isFirebaseConfigured) return DEFAULT_SETTINGS

  try {
    const snap = await getDoc(doc(db, 'settings', 'main'))
    const result = snap.exists()
      ? ({ ...DEFAULT_SETTINGS, ...snap.data() } as Settings)
      : DEFAULT_SETTINGS
    cacheSet(CACHE_KEY, result, TTL)
    return result
  } catch {
    return DEFAULT_SETTINGS
  }
}

const requireFirebase = () => {
  if (!isFirebaseConfigured) throw new Error('กรุณาตั้งค่า Firebase ใน .env.local ก่อนใช้งาน')
}

export async function updatePromptPaySettings(data: PromptPaySettings): Promise<void> {
  requireFirebase()
  await setDoc(doc(db, 'settings', 'main'), { promptpay: data }, { merge: true })
  cacheClear('settings:')
}

export async function updateDeliverySettings(data: DeliverySettings): Promise<void> {
  requireFirebase()
  await setDoc(doc(db, 'settings', 'main'), { delivery: data }, { merge: true })
  cacheClear('settings:')
}

/**
 * เปิด/ปิดบริการจัดส่งทันที โดยไม่กระทบค่าอื่นใน delivery settings
 * เหมาะสำหรับกดเปิด/ปิดรายวัน (เสาร์-อาทิตย์ / วันหยุด)
 */
export async function toggleDeliveryEnabled(enabled: boolean): Promise<void> {
  requireFirebase()
  const snap = await getDoc(doc(db, 'settings', 'main'))
  const current: DeliverySettings = (snap.exists() ? snap.data().delivery : null) ?? DEFAULT_SETTINGS.delivery
  await setDoc(doc(db, 'settings', 'main'), { delivery: { ...current, enabled } }, { merge: true })
  cacheClear('settings:')
}

export async function updateStoreSettings(data: StoreSettings): Promise<void> {
  requireFirebase()
  await setDoc(doc(db, 'settings', 'main'), { store: data }, { merge: true })
  cacheClear('settings:')
}

export async function updateOpeningHoursSettings(data: OpeningHoursSettings): Promise<void> {
  requireFirebase()
  await setDoc(doc(db, 'settings', 'main'), { openingHours: data }, { merge: true })
  cacheClear('settings:')
}

export async function updateLoyaltySettings(data: LoyaltySettings): Promise<void> {
  requireFirebase()
  await setDoc(doc(db, 'settings', 'main'), { loyalty: data }, { merge: true })
  cacheClear('settings:')
}

export async function updateReceiptSettings(data: ReceiptSettings): Promise<void> {
  requireFirebase()
  await setDoc(doc(db, 'settings', 'main'), { receipt: data }, { merge: true })
  cacheClear('settings:')
}

/** Real-time subscription — fires immediately then on every change */
export function subscribeToSettings(callback: (s: Settings) => void): () => void {
  if (!isFirebaseConfigured) { callback(DEFAULT_SETTINGS); return () => {} }
  return onSnapshot(
    doc(db, 'settings', 'main'),
    (snap) => {
      const result = snap.exists()
        ? ({ ...DEFAULT_SETTINGS, ...snap.data() } as Settings)
        : DEFAULT_SETTINGS
      cacheClear('settings:')
      callback(result)
    },
    () => callback(DEFAULT_SETTINGS),
  )
}

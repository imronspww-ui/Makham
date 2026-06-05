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
} from '@/lib/firebase/firestore'
import { isFirebaseConfigured } from '@/lib/firebase/config'
import type { StaffAccount, StaffAccountPublic } from '@/types'

const COL = 'staffAccounts'

function docToAccount(id: string, d: Record<string, unknown>): StaffAccount {
  return {
    id,
    name:      (d.name as string)      ?? '',
    pinHash:   (d.pinHash as string)   ?? '',
    isActive:  (d.isActive as boolean) ?? true,
    sortOrder: (d.sortOrder as number) ?? 0,
    createdAt: (d.createdAt as Timestamp)?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    updatedAt: (d.updatedAt as Timestamp)?.toDate?.()?.toISOString() ?? new Date().toISOString(),
  }
}

const requireFirebase = () => {
  if (!isFirebaseConfigured) throw new Error('กรุณาตั้งค่า Firebase ใน .env.local ก่อนใช้งาน')
}

/** ดึงบัญชีทั้งหมด (admin only — รวม pinHash) */
export async function getStaffAccounts(): Promise<StaffAccount[]> {
  if (!isFirebaseConfigured) return []
  try {
    const q = query(collection(db, COL), orderBy('sortOrder'), orderBy('createdAt'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => docToAccount(d.id, d.data() as Record<string, unknown>))
  } catch {
    return []
  }
}

/** ดึงเฉพาะ active accounts ไม่มี pinHash — ใช้แสดงหน้า staff-login */
export async function getActiveStaffAccountsPublic(): Promise<StaffAccountPublic[]> {
  const all = await getStaffAccounts()
  return all
    .filter((a) => a.isActive)
    .map(({ pinHash: _, ...rest }) => rest)
}

export async function getStaffAccount(id: string): Promise<StaffAccount | null> {
  if (!isFirebaseConfigured) return null
  try {
    const snap = await getDoc(doc(db, COL, id))
    if (!snap.exists()) return null
    return docToAccount(snap.id, snap.data() as Record<string, unknown>)
  } catch {
    return null
  }
}

export async function createStaffAccount(
  data: Pick<StaffAccount, 'name' | 'pinHash' | 'sortOrder'>,
): Promise<string> {
  requireFirebase()
  const now = Timestamp.now()
  const ref = await addDoc(collection(db, COL), {
    ...data,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  })
  return ref.id
}

export async function updateStaffAccount(
  id: string,
  data: Partial<Pick<StaffAccount, 'name' | 'isActive' | 'sortOrder'>>,
): Promise<void> {
  requireFirebase()
  await updateDoc(doc(db, COL, id), { ...data, updatedAt: Timestamp.now() })
}

export async function updateStaffPin(id: string, pinHash: string): Promise<void> {
  requireFirebase()
  await updateDoc(doc(db, COL, id), { pinHash, updatedAt: Timestamp.now() })
}

export async function deleteStaffAccount(id: string): Promise<void> {
  requireFirebase()
  await deleteDoc(doc(db, COL, id))
}

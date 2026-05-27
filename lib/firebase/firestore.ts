import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  Timestamp,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore'
import { app, isFirebaseConfigured } from './config'

function createDb(): Firestore {
  if (!isFirebaseConfigured) {
    return getFirestore(app)
  }
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  } catch {
    // initializeFirestore ถูกเรียกแล้ว (เช่น hot-reload) ใช้ instance เดิม
    return getFirestore(app)
  }
}

export const db: Firestore = createDb()

export function fromTimestamp(ts: unknown): string {
  if (
    ts &&
    typeof ts === 'object' &&
    'toDate' in ts &&
    typeof (ts as Timestamp).toDate === 'function'
  ) {
    return (ts as Timestamp).toDate().toISOString()
  }
  return new Date().toISOString()
}

export function docToData<T>(id: string, data: DocumentData): T {
  return {
    ...data,
    id,
    createdAt: fromTimestamp(data.createdAt),
    updatedAt: fromTimestamp(data.updatedAt),
  } as T
}

export {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  Timestamp,
}

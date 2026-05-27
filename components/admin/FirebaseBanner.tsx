import { AlertTriangle } from 'lucide-react'
import { isFirebaseConfigured } from '@/lib/firebase/config'

export function FirebaseBanner() {
  if (isFirebaseConfigured) return null

  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-yellow-500" />
      <div>
        <p className="font-semibold">Firebase ยังไม่ได้ตั้งค่า</p>
        <p className="mt-0.5 text-yellow-700">
          การดู/แก้ไขข้อมูลจะยังไม่ทำงาน กรุณาใส่ค่า{' '}
          <code className="rounded bg-yellow-200 px-1 font-mono text-xs">NEXT_PUBLIC_FIREBASE_*</code>{' '}
          ใน <code className="rounded bg-yellow-200 px-1 font-mono text-xs">.env.local</code>{' '}
          แล้ว restart server
        </p>
      </div>
    </div>
  )
}

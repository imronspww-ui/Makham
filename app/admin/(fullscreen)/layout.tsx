'use client'
import { AudioUnlockBanner } from '@/components/admin/AudioUnlockBanner'
import { AdminServiceWorker } from '@/components/admin/AdminServiceWorker'
import { useAdminOrderAlert } from '@/lib/hooks/useAdminOrderAlert'

function AdminAlertProvider() {
  const { audioUnlocked, unlockAudio } = useAdminOrderAlert()
  return audioUnlocked ? null : <AudioUnlockBanner onUnlock={unlockAudio} />
}

/** Layout สำหรับหน้าเต็มจอ (ไม่มี Sidebar / Header) */
export default function FullscreenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50 flex flex-col">
      <AdminServiceWorker />
      <AdminAlertProvider />
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

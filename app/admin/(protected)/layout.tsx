'use client'
import { Sidebar } from '@/components/admin/Sidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AudioUnlockBanner } from '@/components/admin/AudioUnlockBanner'
import { useAdminOrderAlert } from '@/lib/hooks/useAdminOrderAlert'

/** Mount hook + แสดง iOS audio unlock banner */
function AdminAlertProvider() {
  const { audioUnlocked, unlockAudio } = useAdminOrderAlert()

  return audioUnlocked ? null : <AudioUnlockBanner onUnlock={unlockAudio} />
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* iOS audio unlock banner (หายไปเองหลังแตะ) */}
        <AdminAlertProvider />
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

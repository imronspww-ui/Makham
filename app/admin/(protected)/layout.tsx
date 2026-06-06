'use client'
import { useEffect } from 'react'
import { Sidebar } from '@/components/admin/Sidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AdminServiceWorker } from '@/components/admin/AdminServiceWorker'
import { useAdminOrderAlert } from '@/lib/hooks/useAdminOrderAlert'
import { unlockAudio } from '@/lib/utils/audio'

/** Mount hook + auto-unlock audio บน first interaction */
function AdminAlertProvider() {
  useAdminOrderAlert()

  useEffect(() => {
    // Unlock AudioContext + prime SpeechSynthesis บน user interaction ครั้งแรก
    // Chrome/Firefox: resume() สำเร็จหลัง user เคย interact แล้ว
    // iOS Safari PWA: ต้องการ gesture — touchstart จับได้เสมอ
    const unlock = () => { unlockAudio() }
    // ครอบคลุมทุกกรณี: click/touch/key/mousemove
    // mousemove → Desktop unlock ทันทีที่เลื่อน mouse (ไม่ต้องกดอะไร)
    window.addEventListener('click',      unlock, { once: true })
    window.addEventListener('touchstart', unlock, { once: true, passive: true })
    window.addEventListener('keydown',    unlock, { once: true })
    window.addEventListener('mousemove',  unlock, { once: true, passive: true })
    return () => {
      window.removeEventListener('click',      unlock)
      window.removeEventListener('touchstart', unlock)
      window.removeEventListener('keydown',    unlock)
      window.removeEventListener('mousemove',  unlock)
    }
  }, [])

  return null
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminServiceWorker />
        <AdminAlertProvider />
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

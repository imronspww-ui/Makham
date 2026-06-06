'use client'
import { useEffect } from 'react'
import { AdminServiceWorker } from '@/components/admin/AdminServiceWorker'
import { useAdminOrderAlert } from '@/lib/hooks/useAdminOrderAlert'
import { unlockAudio } from '@/lib/utils/audio'

function AdminAlertProvider() {
  useAdminOrderAlert()

  useEffect(() => {
    const unlock = () => { unlockAudio() }
    window.addEventListener('click',      unlock, { once: true })
    window.addEventListener('touchstart', unlock, { once: true, passive: true })
    window.addEventListener('keydown',    unlock, { once: true })
    return () => {
      window.removeEventListener('click',      unlock)
      window.removeEventListener('touchstart', unlock)
      window.removeEventListener('keydown',    unlock)
    }
  }, [])

  return null
}

export default function FullscreenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-gray-50 flex flex-col">
      <AdminServiceWorker />
      <AdminAlertProvider />
      {children}
    </div>
  )
}

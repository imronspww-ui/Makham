'use client'
/**
 * AdminServiceWorker
 * - Register SW สำหรับ background order notifications
 * - รับ SPEAK → TTS เมื่อ tab กลับมา focus
 * - รับ PLAY_ALARM → เล่นเสียงกริ่งเมื่อ tab กลับมา focus
 * - แสดง banner เมื่อ notification ถูก block
 */
import { useEffect, useState } from 'react'
import { BellOff, X } from 'lucide-react'
import { speak } from '@/lib/utils/speak'
import { playAdminAlarm } from '@/lib/utils/audio'

export function AdminServiceWorker() {
  const [blocked,   setBlocked]   = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    async function setup() {
      // ขอสิทธิ์ Notification
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          const perm = await Notification.requestPermission()
          if (perm === 'denied') { setBlocked(true); return }
        } else if (Notification.permission === 'denied') {
          setBlocked(true)
          return
        }
      }

      // Register SW
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      } catch (err) {
        console.warn('[SW] registration failed:', err)
      }
    }

    setup()

    // รับ message จาก SW
    function onMessage(event: MessageEvent) {
      const { type } = event.data ?? {}

      if (type === 'SPEAK' && typeof event.data.text === 'string') {
        // TTS — speak() queue ไว้อัตโนมัติถ้าหน้าต่างยังไม่ focus
        speak(event.data.text)
      }

      if (type === 'PLAY_ALARM') {
        // เสียงกริ่ง — เล่นทันที (AudioContext resume ได้ถ้า user เคย interact แล้ว)
        playAdminAlarm()
      }
    }

    navigator.serviceWorker.addEventListener('message', onMessage)

    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage)
      navigator.serviceWorker.controller?.postMessage({ type: 'RESET_ADMIN_STATE' })
    }
  }, [])

  if (blocked && !dismissed) {
    const isPwa = typeof window !== 'undefined' &&
      window.matchMedia('(display-mode: standalone)').matches

    if (isPwa) return null

    return (
      <div className="flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm text-amber-800">
        <BellOff size={16} className="shrink-0 text-amber-500" />
        <span className="flex-1">
          การแจ้งเตือนถูกบล็อก — เปิดที่{' '}
          <strong>ตั้งค่า Browser → ไซต์ → การแจ้งเตือน</strong>{' '}
          เพื่อรับแจ้งเตือนออเดอร์ใหม่
        </span>
        <button onClick={() => setDismissed(true)} className="shrink-0 text-amber-500 hover:text-amber-700">
          <X size={15} />
        </button>
      </div>
    )
  }

  return null
}

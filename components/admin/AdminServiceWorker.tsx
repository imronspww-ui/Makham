'use client'
import { useEffect, useState } from 'react'
import { BellOff, X } from 'lucide-react'

/**
 * Register Service Worker สำหรับ background order notifications
 * แสดง banner เมื่อ permission ถูก block
 */
export function AdminServiceWorker() {
  const [blocked, setBlocked] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    async function setup() {
      // ──── 1. ขอสิทธิ์ Notification ────
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          const perm = await Notification.requestPermission()
          if (perm === 'denied') { setBlocked(true); return }
        } else if (Notification.permission === 'denied') {
          setBlocked(true)
          return
        }
      }

      // ──── 2. Register Service Worker ────
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        console.log('[SW] registered, scope:', reg.scope)

        // บอก SW ให้เริ่ม polling ทันที (กรณี SW เพิ่ง activate ช้า)
        navigator.serviceWorker.ready.then((r) => {
          r.active?.postMessage({ type: 'START' })
        })
      } catch (err) {
        console.warn('[SW] registration failed:', err)
      }
    }

    setup()

    // เมื่อ logout → reset state ใน SW
    return () => {
      navigator.serviceWorker.controller?.postMessage({ type: 'RESET_STATE' })
    }
  }, [])

  // Banner แจ้งว่า notification ถูก block
  if (blocked && !dismissed) {
    return (
      <div className="flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-sm text-amber-800">
        <BellOff size={16} className="shrink-0 text-amber-500" />
        <span className="flex-1">
          การแจ้งเตือนถูกบล็อก — เปิดการแจ้งเตือนใน{' '}
          <strong>การตั้งค่า Browser → ไซต์ → การแจ้งเตือน</strong>{' '}
          เพื่อรับแจ้งเตือนออเดอร์ใหม่
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-amber-500 hover:text-amber-700"
        >
          <X size={15} />
        </button>
      </div>
    )
  }

  return null
}

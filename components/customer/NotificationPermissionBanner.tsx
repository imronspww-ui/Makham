'use client'
/**
 * NotificationPermissionBanner
 * ─ แสดงเมื่อ permission === 'default' (ยังไม่ได้ตัดสินใจ)
 * ─ iOS Safari ที่ยังไม่ได้ Add to Home Screen → แสดงคำแนะนำ
 * ─ ต้องเรียก requestPermission() จาก user gesture เท่านั้น (iOS บังคับ)
 */
import { useState, useEffect } from 'react'
import { Bell, BellOff, X, Share } from 'lucide-react'

type BannerState = 'hidden' | 'ask' | 'ios-guide' | 'denied'

function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as { MSStream?: unknown }).MSStream
}

function isInStandaloneMode() {
  if (typeof window === 'undefined') return false
  return (
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

export function NotificationPermissionBanner() {
  const [state, setState] = useState<BannerState>('hidden')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // ไม่รองรับ Notification API เลย
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return

    const perm = Notification.permission

    if (perm === 'denied') {
      // ถูก block แล้ว — ไม่แสดง (ขอซ้ำไม่ได้)
      return
    }

    if (perm === 'granted') return  // OK แล้ว

    // perm === 'default' → ต้องขอ
    if (isIOS() && !isInStandaloneMode()) {
      // iOS ต้อง Add to Home Screen ก่อน
      setState('ios-guide')
    } else {
      setState('ask')
    }
  }, [])

  async function handleAllow() {
    const result = await Notification.requestPermission()
    if (result === 'granted') {
      // register SW ถ้ายังไม่ได้ทำ
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      } catch { /* ignore */ }
      setState('hidden')
    } else {
      setState('denied')
      setTimeout(() => setState('hidden'), 3000)
    }
  }

  if (!mounted || state === 'hidden') return null

  // ── iOS: ยังไม่ Add to Home Screen ─────────────────────────────────
  if (state === 'ios-guide') {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto">
        <div className="rounded-2xl bg-[#1c1209] border border-amber-700/40 shadow-2xl px-4 py-3.5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                <Bell size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-100 leading-snug">เปิดการแจ้งเตือน</p>
                <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
                  บน iPhone ต้องเพิ่มแอปลงหน้าจอก่อน
                  กด <Share size={11} className="inline mb-0.5" /> แล้วเลือก
                  <span className="text-amber-300 font-medium"> "Add to Home Screen"</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setState('hidden')}
              className="shrink-0 text-stone-500 hover:text-stone-300 mt-0.5"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Denied feedback ─────────────────────────────────────────────────
  if (state === 'denied') {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto">
        <div className="rounded-2xl bg-red-900/90 border border-red-700/40 shadow-2xl px-4 py-3 text-white flex items-center gap-3">
          <BellOff size={16} className="text-red-300 shrink-0" />
          <p className="text-xs text-red-200">
            ปิดการแจ้งเตือนแล้ว — เปิดได้ที่การตั้งค่าเบราว์เซอร์
          </p>
        </div>
      </div>
    )
  }

  // ── Default: ask permission ─────────────────────────────────────────
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="rounded-2xl bg-[#1c1209] border border-amber-700/40 shadow-2xl px-4 py-3.5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <Bell size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-100 leading-snug">เปิดการแจ้งเตือน?</p>
              <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
                รับแจ้งเตือนเมื่อออเดอร์สถานะเปลี่ยน เช่น กำลังทำ / พร้อมรับ
              </p>
            </div>
          </div>
          <button
            onClick={() => setState('hidden')}
            className="shrink-0 text-stone-500 hover:text-stone-300 mt-0.5"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleAllow}
            className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all py-2 text-sm font-semibold text-white"
          >
            เปิดการแจ้งเตือน
          </button>
          <button
            onClick={() => setState('hidden')}
            className="rounded-xl border border-stone-700 bg-stone-800/60 px-4 py-2 text-sm text-stone-400 hover:text-stone-200 transition-colors"
          >
            ทีหลัง
          </button>
        </div>
      </div>
    </div>
  )
}

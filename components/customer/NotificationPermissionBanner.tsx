'use client'
/**
 * NotificationPermissionBanner
 *
 * ─ กรณีที่ 1 "granted" แล้ว → ไม่แสดง banner เลย
 *   แต่ unlock audio ทันทีตอน user tap/click แรก (ผ่าน layout listener)
 *
 * ─ กรณีที่ 2 "default" → แสดง banner ขออนุญาต
 *   กดปุ่มเดียวได้ทั้ง: Notification permission + SW register + Audio unlock
 *
 * ─ iOS Safari (ไม่ใช่ standalone PWA) → แนะนำ Add to Home Screen
 *
 * ─ "denied" → ไม่แสดงอะไร (ขอซ้ำไม่ได้)
 */
import { useState, useEffect } from 'react'
import { Bell, BellOff, X, Share } from 'lucide-react'
import { unlockAudio } from '@/lib/utils/audio'

type BannerState = 'hidden' | 'ask' | 'ios-guide' | 'denied'

function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as { MSStream?: unknown }).MSStream
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    ('standalone' in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

export function NotificationPermissionBanner() {
  const [state,   setState]   = useState<BannerState>('hidden')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return

    const perm = Notification.permission
    if (perm === 'denied' || perm === 'granted') return

    // perm === 'default'
    if (isIOS()) {
      if (!isStandalone()) {
        // iOS Safari (ไม่ใช่ PWA) → แนะนำ Add to Home Screen
        setState('ios-guide')
      } else {
        // iOS PWA → ต้องใช้ gesture จาก user เพื่อขอ permission
        setState('ask')
      }
    } else {
      // Android / Desktop — ขอ permission อัตโนมัติได้เลย ไม่ต้องกดปุ่ม
      Notification.requestPermission().then((result) => {
        if (result !== 'granted') setState('denied')
        // granted → ไม่แสดงอะไร
      }).catch(() => {
        // บาง browser ต้องการ gesture → fallback แสดง banner
        setState('ask')
      })
    }
  }, [])

  async function handleAllow() {
    // ① unlock audio ทันที (user gesture นี้คือโอกาส)
    await unlockAudio()

    // ② ขอ notification permission
    const result = await Notification.requestPermission()

    // ③ register SW
    try {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    } catch { /* ignore */ }

    if (result === 'granted') {
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
                <p className="text-sm font-semibold text-amber-100 leading-snug">
                  รับแจ้งเตือนออเดอร์
                </p>
                <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
                  บน iPhone กด <Share size={11} className="inline mb-0.5" /> แล้วเลือก
                  <span className="text-amber-300 font-medium"> "Add to Home Screen"</span>
                  {' '}จากนั้นเปิดแอปจากหน้าจอหลัก
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

  // ── Denied ──────────────────────────────────────────────────────────
  if (state === 'denied') {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto">
        <div className="rounded-2xl bg-red-900/90 border border-red-700/40 shadow-2xl px-4 py-3 text-white flex items-center gap-2">
          <BellOff size={15} className="text-red-300 shrink-0" />
          <p className="text-xs text-red-200">
            ปิดการแจ้งเตือน — เปิดได้ที่ตั้งค่าเบราว์เซอร์
          </p>
        </div>
      </div>
    )
  }

  // ── Ask permission ──────────────────────────────────────────────────
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-2xl bg-[#1c1209] border border-amber-700/40 shadow-2xl px-4 py-3.5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <Bell size={16} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-100 leading-snug">
                เปิดการแจ้งเตือน & เสียง
              </p>
              <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
                รับแจ้งเมื่อออเดอร์สถานะเปลี่ยน พร้อมเสียงแจ้งเตือน
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
            className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all py-2.5 text-sm font-semibold text-white"
          >
            อนุญาต
          </button>
          <button
            onClick={() => setState('hidden')}
            className="rounded-xl border border-stone-700 bg-stone-800/60 px-4 py-2.5 text-sm text-stone-400 hover:text-stone-200 transition-colors"
          >
            ไม่ใช่ตอนนี้
          </button>
        </div>
      </div>
    </div>
  )
}

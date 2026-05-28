'use client'
import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import type { Order, OrderStatus } from '@/types'

const STATUS_MESSAGES: Partial<Record<OrderStatus, { title: string; body: string; emoji: string }>> = {
  cooking:    { title: 'กำลังทำอาหาร!', body: 'ร้านรับออเดอร์และกำลังทำอาหารให้คุณแล้ว 👨‍🍳', emoji: '👨‍🍳' },
  delivering: { title: 'กำลังจัดส่ง!', body: 'อาหารของคุณกำลังเดินทางมาแล้ว 🛵', emoji: '🚚' },
  completed:  { title: 'เสร็จสิ้น!', body: 'อาหารของคุณพร้อมแล้ว มารับได้เลย ✅', emoji: '✅' },
  cancelled:  { title: 'ออเดอร์ถูกยกเลิก', body: 'ออเดอร์ของคุณถูกยกเลิกแล้ว กรุณาติดต่อร้าน', emoji: '❌' },
}

function playBeep(frequency: number) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.6)
  } catch {
    // ignore — audio blocked by browser policy
  }
}

export function useOrderNotification(order: Order | null, storeName = 'ร้านมะขาม') {
  const prevStatus = useRef<OrderStatus | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (!order) return
    const current = order.status

    // First load — record initial status, request permission, no notification
    if (!initialized.current) {
      prevStatus.current = current
      initialized.current = true
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
      return
    }

    // Status unchanged — nothing to do (guards against other field updates)
    if (prevStatus.current === current) return

    prevStatus.current = current
    const info = STATUS_MESSAGES[current]
    if (!info) return

    // In-app toast
    toast(info.emoji + ' ' + info.title, { duration: 5000 })

    // Browser notification (works when tab is in background)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`${storeName} — ${info.title}`, { body: info.body, icon: '/favicon.ico' })
      } catch {
        // ignore — some browsers block new Notification() in certain contexts
      }
    }

    // Audible beep
    const freq = current === 'completed' ? 880 : current === 'cancelled' ? 220 : 660
    playBeep(freq)
  }, [order]) // eslint-disable-line react-hooks/exhaustive-deps
}

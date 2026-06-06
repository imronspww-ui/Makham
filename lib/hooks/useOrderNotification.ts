'use client'
import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { speak } from '@/lib/utils/speak'
import { playNotificationBeep } from '@/lib/utils/sound'
import type { Order, OrderStatus } from '@/types'

const STATUS_MESSAGES: Partial<Record<OrderStatus, {
  title: string; body: string; emoji: string; speech: string
  beep: 'cooking' | 'delivering' | 'completed' | 'cancelled'
}>> = {
  cooking: {
    title: 'กำลังทำอาหาร!',
    body: 'ร้านรับออเดอร์และกำลังทำอาหารให้คุณแล้ว 👨‍🍳',
    emoji: '👨‍🍳',
    speech: 'ร้านรับออเดอร์แล้วครับ กำลังทำอาหารให้คุณ รอสักครู่นะครับ',
    beep: 'cooking',
  },
  delivering: {
    title: 'กำลังจัดส่ง!',
    body: 'อาหารของคุณกำลังเดินทางมาแล้ว 🛵',
    emoji: '🚚',
    speech: 'อาหารของคุณกำลังส่งแล้วครับ รอรับได้เลยนะครับ',
    beep: 'delivering',
  },
  completed: {
    title: 'เสร็จสิ้น!',
    body: 'อาหารของคุณพร้อมแล้ว มารับได้เลย ✅',
    emoji: '✅',
    speech: 'อาหารที่คุณสั่งเสร็จเรียบร้อยแล้วครับ มารับได้เลยนะครับ ขอบคุณที่ใช้บริการครับ',
    beep: 'completed',
  },
  cancelled: {
    title: 'ออเดอร์ถูกยกเลิก',
    body: 'ออเดอร์ของคุณถูกยกเลิกแล้ว กรุณาติดต่อร้าน',
    emoji: '❌',
    speech: 'ขออภัยครับ ออเดอร์ของคุณถูกยกเลิกแล้ว กรุณาติดต่อร้านครับ',
    beep: 'cancelled',
  },
}

export function useOrderNotification(order: Order | null, storeName = 'ร้านมะขาม') {
  const prevStatus  = useRef<OrderStatus | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (!order) return
    const current = order.status

    // First load — บันทึกสถานะเริ่มต้น, preload voices — ไม่แจ้งเตือน
    if (!initialized.current) {
      prevStatus.current = current
      initialized.current = true
      // Pre-load Thai voices ให้พร้อม
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.getVoices()
      }
      return
    }

    // สถานะไม่เปลี่ยน → ข้าม (guard other field updates)
    if (prevStatus.current === current) return
    prevStatus.current = current

    const info = STATUS_MESSAGES[current]
    if (!info) return

    // ① In-app toast
    toast(info.emoji + ' ' + info.title, { duration: 5000 })

    // ② Browser notification (เมื่ออยู่ tab อื่น)
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(`${storeName} — ${info.title}`, {
          body:  info.body,
          icon:  '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
        })
      } catch { /* ignore */ }
    }

    // ③ เสียง beep (AudioContext — unlock แล้วจาก user gesture ก่อนหน้า)
    playNotificationBeep(info.beep).catch(() => {})

    // ④ TTS — ดีเลย์เล็กน้อยให้ beep ออกก่อน
    setTimeout(() => speak(info.speech), 400)
  }, [order]) // eslint-disable-line react-hooks/exhaustive-deps
}

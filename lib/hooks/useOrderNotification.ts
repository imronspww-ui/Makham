'use client'
/**
 * useOrderNotification — แจ้งเตือนลูกค้าเมื่อสถานะออเดอร์เปลี่ยน
 * ทำงาน: Firestore onSnapshot (real-time) → toast + browser notification + เสียง + TTS
 */
import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { speak } from '@/lib/utils/speak'
import { playCustomerBeep } from '@/lib/utils/audio'
import type { Order, OrderStatus } from '@/types'

interface StatusInfo {
  title:  string
  body:   string
  emoji:  string
  speech: string
  beep:   'cooking' | 'delivering' | 'completed' | 'cancelled'
}

const STATUS_MAP: Partial<Record<OrderStatus, StatusInfo>> = {
  cooking: {
    title:  'กำลังทำอาหาร!',
    body:   'ร้านรับออเดอร์และกำลังทำอาหารให้คุณแล้ว 👨‍🍳',
    emoji:  '👨‍🍳',
    speech: 'ร้านรับออเดอร์แล้วครับ กำลังทำอาหารให้คุณ รอสักครู่นะครับ',
    beep:   'cooking',
  },
  delivering: {
    title:  'กำลังจัดส่ง!',
    body:   'อาหารของคุณกำลังเดินทางมาแล้ว 🛵',
    emoji:  '🚚',
    speech: 'อาหารของคุณกำลังส่งแล้วครับ รอรับได้เลยนะครับ',
    beep:   'delivering',
  },
  completed: {
    title:  'เสร็จสิ้น! ✅',
    body:   'อาหารของคุณพร้อมแล้ว มารับได้เลย',
    emoji:  '✅',
    speech: 'อาหารที่คุณสั่งเสร็จเรียบร้อยแล้วครับ มารับได้เลยนะครับ ขอบคุณที่ใช้บริการครับ',
    beep:   'completed',
  },
  cancelled: {
    title:  'ออเดอร์ถูกยกเลิก',
    body:   'ออเดอร์ของคุณถูกยกเลิกแล้ว กรุณาติดต่อร้าน',
    emoji:  '❌',
    speech: 'ขออภัยครับ ออเดอร์ของคุณถูกยกเลิกแล้ว กรุณาติดต่อร้านครับ',
    beep:   'cancelled',
  },
}

export function useOrderNotification(order: Order | null, storeName = 'ร้านมะขาม') {
  const prevStatus  = useRef<OrderStatus | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (!order) return
    const current = order.status

    if (!initialized.current) {
      prevStatus.current = current
      initialized.current = true
      // Pre-load voices ให้พร้อม
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.getVoices()
      }
      return
    }

    if (prevStatus.current === current) return
    prevStatus.current = current

    const info = STATUS_MAP[current]
    if (!info) return

    // ① Toast (in-app)
    toast(info.emoji + ' ' + info.title, { duration: 5000 })

    // ② Browser notification (เมื่ออยู่ tab อื่น)
    if (typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted') {
      try {
        new Notification(`${storeName} — ${info.title}`, {
          body:  info.body,
          icon:  '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag:   `customer-status-${order.id}`,
        })
      } catch { /* ignore */ }
    }

    // ③ เสียง beep
    playCustomerBeep(info.beep)

    // ④ TTS — หลัง beep นิดนึง
    setTimeout(() => speak(info.speech), 500)

  }, [order]) // eslint-disable-line react-hooks/exhaustive-deps
}

'use client'
/**
 * useAdminOrderAlert — แจ้งเตือนออเดอร์ใหม่ฝั่ง admin
 *
 * ทำงาน: Firestore onSnapshot (real-time < 2s) → เสียงกริ่ง + TTS + flash tab + browser notification
 *
 * Audio unlock: ไม่มี guard _unlocked อีกต่อไป
 * — ใช้ tryResume() ภายใน playAdminAlarm() แทน
 * — layout ทำ auto-unlock บน first click/touch ให้แล้ว
 */
import { useEffect, useRef } from 'react'
import { subscribeToOrders } from '@/lib/services/orderService'
import { speak } from '@/lib/utils/speak'
import { playAdminAlarm } from '@/lib/utils/audio'
import type { Order } from '@/types'

function flashTitle(msg: string) {
  if (typeof document === 'undefined') return
  const original = document.title
  let count = 0
  const iv = setInterval(() => {
    document.title = count % 2 === 0 ? msg : original
    if (++count >= 12) { clearInterval(iv); document.title = original }
  }, 500)
}

export function useAdminOrderAlert() {
  const knownIds    = useRef<Set<string>>(new Set())
  const initialized = useRef(false)

  useEffect(() => {
    // ขอสิทธิ์ browser notification (ถ้ายังไม่ได้ขอ)
    if (typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const unsub = subscribeToOrders((orders: Order[]) => {
      // รอบแรก: บันทึก snapshot ปัจจุบัน — ไม่แจ้งเตือน
      if (!initialized.current) {
        orders.forEach((o) => knownIds.current.add(o.id))
        initialized.current = true
        return
      }

      // หาออเดอร์ใหม่ที่ status = pending และยังไม่เคยเห็น
      const fresh = orders.filter(
        (o) => o.status === 'pending' && !knownIds.current.has(o.id),
      )
      orders.forEach((o) => knownIds.current.add(o.id))
      if (fresh.length === 0) return

      const first = fresh[0]
      const name  = first.customer?.name || 'ลูกค้า'
      const total = first.total?.toLocaleString('th-TH') ?? '0'
      const extra = fresh.length > 1
        ? ` และอีก ${fresh.length - 1} รายการ`
        : ''

      // ① เสียงกริ่ง — ทำงานทันทีหลัง user เคย interact กับหน้า
      playAdminAlarm()

      // ② TTS ภาษาไทย — หลังกริ่งนิดนึง
      setTimeout(
        () => speak(`มีออเดอร์ใหม่จาก${name} ยอด ${total} บาท${extra} กรุณาตรวจสอบด้วยครับ`),
        600,
      )

      // ③ กระพริบ tab title
      flashTitle(`🔔 ออเดอร์ใหม่! (${fresh.length})`)

      // ④ Browser push notification — แสดงค้างไว้ (requireInteraction)
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`📦 ออเดอร์ใหม่ #${first.orderNumber}`, {
            body:               `${name} · ฿${total} · ${first.orderType === 'delivery' ? '🚗 Delivery' : '🛍️ Pickup'}`,
            icon:               '/icons/icon-192.png',
            badge:              '/icons/icon-192.png',
            tag:                `admin-new-order-${first.id}`,
            requireInteraction: true,
          })
        } catch { /* ignore */ }
      }
    })

    return unsub
  }, [])
}

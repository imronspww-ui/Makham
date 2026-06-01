'use client'
/**
 * CustomerOrderTracker — invisible component ที่ register Service Worker
 * และส่ง order history ให้ SW track สถานะแบบ background
 *
 * Mount ใน customer layout เพื่อทำงานในทุกหน้าของลูกค้า
 */
import { useEffect } from 'react'
import { useOrderHistoryStore } from '@/store/orderHistoryStore'

const MAX_TRACK_HOURS = 24

export function CustomerOrderTracker() {
  const orders = useOrderHistoryStore((s) => s.orders)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    async function setup() {
      // ──── 1. ขอสิทธิ์ notification ────
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission()
      }

      // ──── 2. Register / reuse SW ────
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      } catch (err) {
        console.warn('[SW] register failed:', err)
        return
      }

      // รอ SW พร้อม
      const reg = await navigator.serviceWorker.ready

      // ──── 3. ส่ง order history ให้ SW track ────
      const cutoff = Date.now() - MAX_TRACK_HOURS * 60 * 60 * 1000
      const recent = orders.filter((o) => new Date(o.createdAt).getTime() > cutoff)

      for (const order of recent) {
        reg.active?.postMessage({
          type:          'TRACK_ORDER',
          orderId:       order.id,
          orderNumber:   order.orderNumber,
          currentStatus: 'pending',   // SW จะ fetch สถานะจริงรอบแรก
        })
      }
    }

    setup()
  }, [orders]) // re-run ทุกครั้งที่มีออเดอร์ใหม่เข้า history

  return null
}

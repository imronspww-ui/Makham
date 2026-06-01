'use client'
/**
 * CustomerOrderTracker — register Service Worker + ขอสิทธิ์ notification
 * ฟัง SPEAK message จาก SW → เล่น TTS ภาษาไทย
 *
 * หน้า /order/[id] จะส่ง TRACK_ORDER พร้อมสถานะจริงเอง
 * ไม่ต้องส่งจาก history ที่นี่ (เพราะไม่รู้สถานะปัจจุบัน → เสี่ยงแจ้งซ้ำ)
 */
import { useEffect } from 'react'
import { useSWSpeak } from '@/lib/hooks/useSWSpeak'

export function CustomerOrderTracker() {
  // รับ SPEAK message จาก SW → เล่น TTS ภาษาไทย
  useSWSpeak()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    async function setup() {
      // ขอสิทธิ์ notification (ครั้งแรกที่เปิดเว็บ)
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission()
      }

      // Register SW (ถ้ายังไม่ได้ register)
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      } catch (err) {
        console.warn('[SW] register failed:', err)
      }
    }

    setup()
  }, [])

  return null
}

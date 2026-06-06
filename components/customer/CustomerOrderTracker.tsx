'use client'
/**
 * CustomerOrderTracker
 * - Register Service Worker
 * - รับ SPEAK จาก SW → TTS (queue ไว้ถ้า tab ไม่ focus)
 * - รับ ORDER_STATUS_CHANGED จาก SW → hook บน order page จัดการต่อ
 */
import { useEffect } from 'react'
import { speak } from '@/lib/utils/speak'

export function CustomerOrderTracker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    // Register SW
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch((err) => console.warn('[SW] register failed:', err))

    // รับ message จาก SW
    function onMessage(event: MessageEvent) {
      const { type } = event.data ?? {}
      if (type === 'SPEAK' && typeof event.data.text === 'string') {
        speak(event.data.text)
      }
    }

    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [])

  return null
}

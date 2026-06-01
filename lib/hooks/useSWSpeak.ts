'use client'
/**
 * useSWSpeak — ฟัง message { type: 'SPEAK', text } จาก Service Worker
 * แล้วเล่น TTS ผ่าน shared speak() utility (รองรับ queue เมื่อ browser ไม่ focus)
 */
import { useEffect } from 'react'
import { speak } from '@/lib/utils/speak'

export { speak }

export function useSWSpeak() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    function onMessage(event: MessageEvent) {
      if (event.data?.type === 'SPEAK' && typeof event.data.text === 'string') {
        speak(event.data.text)
      }
    }

    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [])
}

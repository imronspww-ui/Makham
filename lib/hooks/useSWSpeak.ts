'use client'
/**
 * useSWSpeak — ฟัง message { type: 'SPEAK', text } จาก Service Worker
 * แล้วเล่น TTS ภาษาไทยผ่าน SpeechSynthesis ของ browser
 *
 * Mount ใน layout ที่ต้องการรับเสียงพูดจาก SW background
 */
import { useEffect } from 'react'

export function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const utt       = new SpeechSynthesisUtterance(text)
    utt.lang        = 'th-TH'
    utt.rate        = 0.88
    utt.pitch       = 1.05
    utt.volume      = 1.0
    const voices    = window.speechSynthesis.getVoices()
    const thaiVoice = voices.find((v) => v.lang.startsWith('th'))
    if (thaiVoice) utt.voice = thaiVoice
    window.speechSynthesis.speak(utt)
  } catch { /* ignore */ }
}

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

'use client'
/**
 * useSWSpeak — ฟัง message { type: 'SPEAK', text } จาก Service Worker
 * แล้วเล่น TTS ภาษาไทยผ่าน SpeechSynthesis ของ browser
 */
import { useEffect } from 'react'

/** โหลด voices ให้พร้อม (Chrome โหลด async ผ่าน voiceschanged event) */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) { resolve(voices); return }
    // Chrome: ต้องรอ voiceschanged
    const handler = () => {
      resolve(window.speechSynthesis.getVoices())
      window.speechSynthesis.removeEventListener('voiceschanged', handler)
    }
    window.speechSynthesis.addEventListener('voiceschanged', handler)
    // timeout fallback — ใช้ default voice ถ้ารอนานเกิน 3 วิ
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 3000)
  })
}

export async function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const voices    = await loadVoices()
    const utt       = new SpeechSynthesisUtterance(text)
    utt.lang        = 'th-TH'
    utt.rate        = 0.88
    utt.pitch       = 1.05
    utt.volume      = 1.0
    const thaiVoice = voices.find((v) => v.lang.startsWith('th'))
    if (thaiVoice) utt.voice = thaiVoice
    window.speechSynthesis.speak(utt)
  } catch { /* ignore */ }
}

export function useSWSpeak() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // pre-load voices เมื่อ hook mount (ให้พร้อมก่อนที่ SW จะส่ง SPEAK)
    if ('speechSynthesis' in window) loadVoices()

    function onMessage(event: MessageEvent) {
      if (event.data?.type === 'SPEAK' && typeof event.data.text === 'string') {
        speak(event.data.text)
      }
    }

    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [])
}

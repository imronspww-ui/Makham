'use client'
/**
 * useSWSpeak — ฟัง message { type: 'SPEAK', text } จาก Service Worker
 * แล้วเล่น TTS ภาษาไทยผ่าน SpeechSynthesis
 *
 * ข้อจำกัด browser: SpeechSynthesis ถูก suspend เมื่อ window ไม่ได้ focus
 * → queue speech ไว้ แล้วเล่นทันทีเมื่อ tab กลับมา visible
 */
import { useEffect, useRef } from 'react'

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) { resolve(voices); return }
    const handler = () => {
      resolve(window.speechSynthesis.getVoices())
      window.speechSynthesis.removeEventListener('voiceschanged', handler)
    }
    window.speechSynthesis.addEventListener('voiceschanged', handler)
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
  // queue เสียงที่รอเล่น (กรณี browser ไม่ได้ focus)
  const pendingRef = useRef<string | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // pre-load voices
    if ('speechSynthesis' in window) loadVoices()

    // ── เมื่อ tab กลับมา visible → เล่นเสียงที่ค้างอยู่ ──
    function onVisibilityChange() {
      if (document.visibilityState === 'visible' && pendingRef.current) {
        speak(pendingRef.current)
        pendingRef.current = null
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    // ── รับ SPEAK message จาก SW ──
    function onMessage(event: MessageEvent) {
      if (event.data?.type !== 'SPEAK' || typeof event.data.text !== 'string') return
      const text = event.data.text

      if (document.visibilityState === 'visible') {
        // tab อยู่หน้า → เล่นได้เลย
        speak(text)
      } else {
        // tab ซ่อนอยู่ (browser minimize / ไปหน้าอื่น) → queue ไว้
        pendingRef.current = text
      }
    }

    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])
}

'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { subscribeToOrders } from '@/lib/services/orderService'
import type { Order } from '@/types'

// ─── Module-level AudioContext (ต้อง unlock ครั้งเดียวด้วย user gesture) ───────
let _ctx: AudioContext | null = null
let _unlocked = false

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!_ctx || _ctx.state === 'closed') {
    try {
      _ctx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )()
    } catch { return null }
  }
  return _ctx
}

/** เรียกตอน user gesture (click / touchstart) — unlock AudioContext + SpeechSynthesis */
export async function unlockAdminAudio(): Promise<boolean> {
  try {
    const ctx = getCtx()
    if (!ctx) return false

    // resume ถ้า suspended (iOS เริ่มต้นเป็น suspended เสมอ)
    if (ctx.state === 'suspended') await ctx.resume()

    // เล่น silent buffer เพื่อ unlock จริงๆ บน iOS
    const buf = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start(0)

    // prime SpeechSynthesis ด้วย user gesture เดียวกัน
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices()
      const dummy = new SpeechSynthesisUtterance('')
      dummy.volume = 0
      window.speechSynthesis.speak(dummy)
      window.speechSynthesis.cancel()
    }

    _unlocked = true
    return true
  } catch {
    return false
  }
}

/** เล่นกริ่ง 4 tone — ใช้ context ที่ unlock แล้ว */
function playAlarm() {
  if (!_unlocked) return                // iOS: ยังไม่ unlock → skip
  const ctx = getCtx()
  if (!ctx || ctx.state !== 'running') return
  try {
    const tones: [number, number][] = [[880, 0], [1100, 0.18], [880, 0.36], [1100, 0.54]]
    tones.forEach(([freq, delay]) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + delay
      gain.gain.setValueAtTime(0.35, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
      osc.start(t)
      osc.stop(t + 0.28)
    })
  } catch { /* ignore */ }
}

/** TTS ภาษาไทย */
function speak(text: string) {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang    = 'th-TH'
    utterance.rate    = 0.9
    utterance.pitch   = 1.0
    utterance.volume  = 1.0
    const voices = window.speechSynthesis.getVoices()
    const thaiVoice = voices.find((v) => v.lang.startsWith('th'))
    if (thaiVoice) utterance.voice = thaiVoice
    window.speechSynthesis.speak(utterance)
  } catch { /* ignore */ }
}

/** กระพริบ title tab */
function flashTitle(msg: string) {
  if (typeof document === 'undefined') return
  const original = document.title
  let count = 0
  const iv = setInterval(() => {
    document.title = count % 2 === 0 ? msg : original
    count++
    if (count >= 12) { clearInterval(iv); document.title = original }
  }, 500)
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAdminOrderAlert() {
  const knownIds    = useRef<Set<string>>(new Set())
  const initialized = useRef(false)
  const [audioUnlocked, setAudioUnlocked] = useState(_unlocked)   // sync กับ module state

  /** เรียกจาก banner เมื่อ user แตะ */
  const unlockAudio = useCallback(async () => {
    const ok = await unlockAdminAudio()
    if (ok) setAudioUnlocked(true)
  }, [])

  useEffect(() => {
    // sync กรณี refresh หน้าแล้ว module state อาจเป็น true อยู่แล้ว
    if (_unlocked) setAudioUnlocked(true)

    // ขอสิทธิ์ browser notification
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const unsub = subscribeToOrders((orders: Order[]) => {
      if (!initialized.current) {
        orders.forEach((o) => knownIds.current.add(o.id))
        initialized.current = true
        return
      }

      const fresh = orders.filter(
        (o) => o.status === 'pending' && !knownIds.current.has(o.id),
      )
      orders.forEach((o) => knownIds.current.add(o.id))
      if (fresh.length === 0) return

      const first = fresh[0]

      // เสียงกริ่ง (iOS: ทำงานเฉพาะหลัง unlock)
      playAlarm()

      // TTS — delay 700ms หลังกริ่ง
      const name  = first.customer.name
      const total = first.total.toLocaleString()
      const extra = fresh.length > 1 ? ` และมีออเดอร์เพิ่มอีก ${fresh.length - 1} รายการ` : ''
      setTimeout(() => speak(`มีออเดอร์ใหม่เข้ามาจาก${name} ยอด${total}บาท${extra} กรุณาตรวจสอบด้วยครับ`), 700)

      // กระพริบ tab
      flashTitle(`🔔 ออเดอร์ใหม่! (${fresh.length})`)

      // Browser push notification
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`📦 ออเดอร์ใหม่ #${first.orderNumber}`, {
            body: `${first.customer.name} · ฿${first.total.toLocaleString()}`,
            icon: '/favicon.ico',
            tag:  'new-order',
          })
        } catch { /* ignore */ }
      }
    })

    return unsub
  }, [])

  return { audioUnlocked, unlockAudio }
}

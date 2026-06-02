'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { subscribeToOrders } from '@/lib/services/orderService'
import { speak } from '@/lib/utils/speak'
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
    // iOS ต้องการข้อความจริง (ไม่ใช่ string ว่าง) ถึงจะ unlock ได้
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices()
      const dummy = new SpeechSynthesisUtterance(' ')
      dummy.volume = 0
      dummy.lang   = 'th-TH'
      window.speechSynthesis.speak(dummy)
    }

    _unlocked = true
    return true
  } catch {
    return false
  }
}

/** ตรวจว่าเป็น iOS/iPadOS */
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/**
 * เล่นเสียงกริ๊งยาว — จำลองเสียงกริ่งโทรศัพท์
 * แต่ละ "กริ๊ง" = เสียงสั่น 25Hz นาน 0.7s แล้วหยุด 0.35s
 * เล่น 3 รอบ รวม ~3.5 วินาที
 */
function playAlarm() {
  if (!_unlocked) return
  const ctx = getCtx()
  if (!ctx || ctx.state !== 'running') return
  try {
    const ringDuration = 0.7    // ความยาวแต่ละกริ๊ง (วินาที)
    const ringGap      = 0.35   // เว้นระหว่างกริ๊ง
    const rings        = 3      // จำนวนกริ๊ง
    const freq         = 1050   // ความถี่เสียงกริ๊ง (Hz)
    const tremoloRate  = 25     // ความเร็วสั่น (Hz) — ให้ฟังดูเหมือนกริ่งโทรศัพท์
    const volume       = 0.75

    for (let r = 0; r < rings; r++) {
      const startTime = ctx.currentTime + r * (ringDuration + ringGap)

      // oscillator หลัก (เสียง)
      const osc  = ctx.createOscillator()
      osc.type            = 'sine'
      osc.frequency.value = freq

      // gain หลัก — fade in เล็กน้อย แล้ว fade out ช่วงท้าย
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.02)
      gain.gain.setValueAtTime(volume, startTime + ringDuration - 0.1)
      gain.gain.linearRampToValueAtTime(0, startTime + ringDuration)

      // LFO — สร้างเอฟเฟกต์สั่น "กริ๊งๆ"
      const lfo      = ctx.createOscillator()
      lfo.type            = 'sine'
      lfo.frequency.value = tremoloRate
      const lfoGain  = ctx.createGain()
      lfoGain.gain.value  = 0.5   // ความลึกของการสั่น

      lfo.connect(lfoGain)
      lfoGain.connect(gain.gain)
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + ringDuration)
      lfo.start(startTime)
      lfo.stop(startTime + ringDuration)
    }
  } catch { /* ignore */ }
}

/** TTS ภาษาไทย */
// speak() imported from @/lib/utils/speak — รองรับ queue เมื่อ browser ไม่ focus

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

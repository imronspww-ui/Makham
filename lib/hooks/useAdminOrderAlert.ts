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
 * เล่นเสียงแจ้งเตือนดัง — square wave 2 ความถี่สลับกัน
 * pattern: สูง-ต่ำ-สูง-ต่ำ × 3 รอบ รวม ~2.4 วินาที
 * ใช้ DynamicsCompressor เพื่อให้เสียงเต็มและดังสุด
 */
function playAlarm() {
  if (!_unlocked) return
  const ctx = getCtx()
  if (!ctx || ctx.state !== 'running') return
  try {
    // compressor — ทำให้เสียงเต็มและดังขึ้นโดยไม่แตก
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -6
    comp.knee.value      = 3
    comp.ratio.value     = 4
    comp.attack.value    = 0.001
    comp.release.value   = 0.1
    comp.connect(ctx.destination)

    // pattern: [freq(Hz), startSec, duration]
    const beepDur = 0.12   // ความยาวแต่ละ beep
    const gap     = 0.06   // ช่องว่างระหว่าง beep
    const pause   = 0.25   // หยุดระหว่างรอบ
    const hiFreq  = 1400
    const loFreq  = 950
    const vol     = 1.0

    // สร้าง pattern: hi lo hi lo pause × 3 รอบ
    const schedule: [number, number][] = []
    for (let r = 0; r < 3; r++) {
      const base = r * ((beepDur + gap) * 4 + pause)
      schedule.push(
        [hiFreq, base],
        [loFreq, base + (beepDur + gap)],
        [hiFreq, base + (beepDur + gap) * 2],
        [loFreq, base + (beepDur + gap) * 3],
      )
    }

    schedule.forEach(([freq, offset]) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type            = 'square'   // square wave = คมชัด ได้ยินง่าย
      osc.frequency.value = freq

      const t = ctx.currentTime + offset
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(vol, t + 0.005)   // attack เร็ว
      gain.gain.setValueAtTime(vol, t + beepDur - 0.02)
      gain.gain.linearRampToValueAtTime(0, t + beepDur)   // release สั้น

      osc.connect(gain)
      gain.connect(comp)
      osc.start(t)
      osc.stop(t + beepDur)
    })
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

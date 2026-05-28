'use client'
import { useEffect, useRef } from 'react'
import { subscribeToOrders } from '@/lib/services/orderService'
import type { Order } from '@/types'

/** เล่นเสียงกริ่งแจ้งเตือน 4 tone */
function playAlarm() {
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const tones: [number, number][] = [[880, 0], [1100, 0.18], [880, 0.36], [1100, 0.54]]
    tones.forEach(([freq, delay]) => {
      const osc = ctx.createOscillator()
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
  } catch {
    // audio blocked — ignore
  }
}

/** พูดข้อความภาษาไทย */
function speak(text: string) {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'th-TH'
    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.volume = 1.0
    const voices = window.speechSynthesis.getVoices()
    const thaiVoice = voices.find((v) => v.lang.startsWith('th'))
    if (thaiVoice) utterance.voice = thaiVoice
    window.speechSynthesis.speak(utterance)
  } catch {
    // ignore — speech blocked or unsupported
  }
}

/** กระพริบ title tab 6 ครั้ง */
function flashTitle(msg: string) {
  if (typeof document === 'undefined') return
  const original = document.title
  let count = 0
  const interval = setInterval(() => {
    document.title = count % 2 === 0 ? msg : original
    count++
    if (count >= 12) { clearInterval(interval); document.title = original }
  }, 500)
}

export function useAdminOrderAlert() {
  const knownIds = useRef<Set<string>>(new Set())
  const initialized = useRef(false)

  useEffect(() => {
    // ขอสิทธิ์ browser notification ล่วงหน้า
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    // pre-load เสียงพูดไว้ก่อน เพื่อไม่ให้ delay ตอนเรียกใช้จริง
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices()
    }

    const unsub = subscribeToOrders((orders: Order[]) => {
      if (!initialized.current) {
        // โหลดครั้งแรก — seed ID ที่มีอยู่แล้วโดยไม่แจ้งเตือน
        orders.forEach((o) => knownIds.current.add(o.id))
        initialized.current = true
        return
      }

      // หาออเดอร์ pending ใหม่ที่ยังไม่เคยเห็น
      const fresh = orders.filter(
        (o) => o.status === 'pending' && !knownIds.current.has(o.id),
      )
      orders.forEach((o) => knownIds.current.add(o.id))

      if (fresh.length === 0) return

      const first = fresh[0]

      // เสียงกริ่ง
      playAlarm()

      // เสียงพูด — ดีเลย์ 700ms ให้กริ่งเล่นก่อน
      const name = first.customer.name
      const total = first.total.toLocaleString()
      const extra = fresh.length > 1 ? ` และมีออเดอร์เพิ่มอีก ${fresh.length - 1} รายการ` : ''
      setTimeout(() => speak(`มีออเดอร์ใหม่เข้ามาจาก${name} ยอด${total}บาท${extra} กรุณาตรวจสอบด้วยครับ`), 700)

      // กระพริบ tab title
      flashTitle(`🔔 ออเดอร์ใหม่! (${fresh.length})`)

      // Browser push notification
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`📦 ออเดอร์ใหม่ #${first.orderNumber}`, {
            body: `${first.customer.name} · ฿${first.total.toLocaleString()}`,
            icon: '/favicon.ico',
            tag: 'new-order',      // รวม notification เดียวกัน ถ้ามาหลายใบพร้อมกัน
          })
        } catch {
          // ignore
        }
      }
    })

    return unsub
  }, [])
}

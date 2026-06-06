/**
 * audio.ts — Unified Audio Engine (Admin + Customer)
 *
 * หลักการ:
 * - Singleton AudioContext — สร้างครั้งเดียว ใช้ร่วมกันทั้งแอป
 * - tryResume() — พยายาม resume ก่อนเล่นทุกครั้ง
 *   Chrome/Android/Desktop: resume() สำเร็จหลัง user เคย interact กับหน้าแล้ว
 *   iOS: ต้องมี unlockAudio() จาก user gesture ก่อน
 * - unlockAudio() — เรียกจาก click/touch handler เพื่อ unlock อย่างแน่นอน
 *   ควรเรียกทันทีที่ user tap ครั้งแรก (ทำใน layout)
 */

let _ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (_ctx && _ctx.state !== 'closed') return _ctx
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    _ctx = new Ctx()
  } catch { return null }
  return _ctx
}

/** Resume AudioContext — สำเร็จเมื่อ user เคย interact กับหน้าแล้ว */
async function tryResume(): Promise<boolean> {
  const ctx = getCtx()
  if (!ctx) return false
  if (ctx.state === 'running') return true
  try {
    await ctx.resume()
    return ctx.state === 'running'
  } catch { return false }
}

/**
 * Unlock AudioContext + prime SpeechSynthesis
 * เรียกจาก user gesture (click / touchstart) ครั้งแรก
 */
export async function unlockAudio(): Promise<void> {
  const ctx = getCtx()
  if (!ctx) return
  try {
    if (ctx.state === 'suspended') await ctx.resume()
    // play silent 1-frame buffer → unlock จริงบน iOS/Safari
    const buf = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start(0)
  } catch { /* ignore */ }

  // Prime SpeechSynthesis (iOS ต้องการ gesture เดียวกัน)
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.getVoices()
    try {
      const dummy = new SpeechSynthesisUtterance(' ')
      dummy.volume = 0
      dummy.lang   = 'th-TH'
      window.speechSynthesis.speak(dummy)
      window.speechSynthesis.cancel()
    } catch { /* ignore */ }
  }
}

// ─── Admin Alarm ─────────────────────────────────────────────────────────────
/**
 * เสียงกริ่ง admin — square wave hi-lo × 3 รอบ รวม ~2 วินาที
 * ดังและชัดเจน ได้ยินง่ายแม้เปิดเสียงไม่เต็ม
 */
export async function playAdminAlarm(): Promise<void> {
  const ok = await tryResume()
  if (!ok) return
  const ctx = getCtx()!

  try {
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -6
    comp.knee.value      = 3
    comp.ratio.value     = 4
    comp.attack.value    = 0.001
    comp.release.value   = 0.1
    comp.connect(ctx.destination)

    const beepDur = 0.13
    const gap     = 0.06
    const pause   = 0.22
    const hi      = 1400
    const lo      = 950
    const vol     = 1.0

    const schedule: [number, number][] = []
    for (let r = 0; r < 3; r++) {
      const base = r * ((beepDur + gap) * 4 + pause)
      schedule.push(
        [hi, base],
        [lo, base + (beepDur + gap)],
        [hi, base + (beepDur + gap) * 2],
        [lo, base + (beepDur + gap) * 3],
      )
    }

    schedule.forEach(([freq, offset]) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type             = 'square'
      osc.frequency.value  = freq
      const t = ctx.currentTime + offset + 0.02
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(vol, t + 0.005)
      gain.gain.setValueAtTime(vol, t + beepDur - 0.02)
      gain.gain.linearRampToValueAtTime(0, t + beepDur)
      osc.connect(gain)
      gain.connect(comp)
      osc.start(t)
      osc.stop(t + beepDur)
    })
  } catch { /* ignore */ }
}

// ─── Customer Beep ────────────────────────────────────────────────────────────
type BeepType = 'cooking' | 'delivering' | 'completed' | 'cancelled'

const BEEP_MAP: Record<BeepType, { freqs: number[]; durs: number[] }> = {
  cooking:    { freqs: [660, 660],           durs: [0.14, 0.32] },
  delivering: { freqs: [550, 660],           durs: [0.16, 0.38] },
  completed:  { freqs: [440, 550, 660, 880], durs: [0.10, 0.10, 0.10, 0.45] },
  cancelled:  { freqs: [440, 330, 220],      durs: [0.18, 0.18, 0.45] },
}

export async function playCustomerBeep(type: BeepType): Promise<void> {
  const ok = await tryResume()
  if (!ok) return
  const ctx = getCtx()!
  const cfg = BEEP_MAP[type]
  let   t   = ctx.currentTime + 0.03

  try {
    cfg.freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type            = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.28, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + cfg.durs[i])
      osc.start(t)
      osc.stop(t + cfg.durs[i])
      t += cfg.durs[i] + 0.05
    })
  } catch { /* ignore */ }
}

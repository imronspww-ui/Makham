/**
 * audio.ts — Unified Audio Engine
 *
 * กฎสำคัญของ Chrome/Safari:
 * - AudioContext ที่สร้างใน user gesture handler → state = "running" ทันที ✅
 * - AudioContext ที่สร้างนอก gesture → state = "suspended" และ resume() ถูกบล็อก ❌
 *
 * ดังนั้น: สร้าง _ctx ใน unlockAudio() เท่านั้น (gesture)
 * playAdminAlarm / playCustomerBeep → ถ้า _ctx ยังไม่ถูกสร้าง → เงียบ (รอให้ user interact ก่อน)
 */

let _ctx: AudioContext | null = null

/** ดึง context ที่ถูกสร้างแล้วเท่านั้น — ไม่สร้างใหม่เอง */
function getCtx(): AudioContext | null {
  if (!_ctx || _ctx.state === 'closed') return null
  return _ctx
}

/** Resume context ถ้าจำเป็น */
async function tryResume(): Promise<boolean> {
  const ctx = getCtx()
  if (!ctx) return false
  if ((ctx.state as string) === 'running') return true
  try {
    await ctx.resume()
    return (ctx.state as string) === 'running'
  } catch { return false }
}

/**
 * unlockAudio() — เรียกจาก user gesture (click/touch/keydown/mousemove)
 * สร้าง AudioContext ภายใน gesture → ได้ state "running" ทันที บน Chrome/Firefox/Safari
 */
export async function unlockAudio(): Promise<void> {
  if (typeof window === 'undefined') return
  if (_ctx && (_ctx.state as string) === 'running') return   // unlock แล้ว ไม่ทำซ้ำ

  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return

    // สร้างใน gesture handler → running ทันที
    if (!_ctx || _ctx.state === 'closed') {
      _ctx = new Ctx()
    }
    if (_ctx.state === 'suspended') {
      await _ctx.resume()
    }

    // เล่น silent buffer → unlock ให้สมบูรณ์บน iOS/Safari
    const buf = _ctx.createBuffer(1, 1, 22050)
    const src = _ctx.createBufferSource()
    src.buffer = buf
    src.connect(_ctx.destination)
    src.start(0)
  } catch { /* ignore */ }

  // Prime SpeechSynthesis ด้วย gesture เดียวกัน
  if ('speechSynthesis' in window) {
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
 * เสียงกริ่ง admin — square wave hi-lo × 3 รอบ (~2 วินาที)
 * ต้องเรียก unlockAudio() ก่อน (ผ่าน gesture) มิเช่นนั้นเงียบ
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

    const schedule: [number, number][] = []
    for (let r = 0; r < 3; r++) {
      const base = r * ((beepDur + gap) * 4 + pause)
      schedule.push(
        [1400, base],
        [950,  base + (beepDur + gap)],
        [1400, base + (beepDur + gap) * 2],
        [950,  base + (beepDur + gap) * 3],
      )
    }

    schedule.forEach(([freq, offset]) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type            = 'square'
      osc.frequency.value = freq
      const t = ctx.currentTime + offset + 0.02
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(1.0, t + 0.005)
      gain.gain.setValueAtTime(1.0, t + beepDur - 0.02)
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

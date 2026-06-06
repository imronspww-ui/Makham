/**
 * sound.ts — Singleton AudioContext + notification beep
 *
 * กฎของ browser: AudioContext ต้อง resume() จาก user gesture ก่อน
 * → ให้ unlockAudio() ถูกเรียกเมื่อผู้ใช้ tap/click ครั้งแรก
 * → playNotificationBeep() จะ resume อีกครั้งก่อนเล่นเสมอ (safe fallback)
 */

let _ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!_ctx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    try { _ctx = new Ctx() } catch { return null }
  }
  return _ctx
}

/** เรียกทันทีที่ user tap/click ครั้งแรก — unlock AudioContext */
export async function unlockAudio(): Promise<void> {
  const ctx = getCtx()
  if (!ctx) return
  try {
    if (ctx.state === 'suspended') await ctx.resume()
    // play silent 1-frame buffer → fully unlock บน iOS
    const buf = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start(0)
  } catch { /* ignore */ }
}

type BeepType = 'new-order' | 'cooking' | 'delivering' | 'completed' | 'cancelled'

interface BeepConfig { freqs: number[]; durs: number[] }

const BEEP_MAP: Record<BeepType, BeepConfig> = {
  'new-order':  { freqs: [440, 550, 660],       durs: [0.14, 0.14, 0.28] },
  'cooking':    { freqs: [660, 660],             durs: [0.15, 0.35]       },
  'delivering': { freqs: [550, 660],             durs: [0.18, 0.40]       },
  'completed':  { freqs: [440, 550, 660, 880],   durs: [0.10, 0.10, 0.10, 0.50] },
  'cancelled':  { freqs: [440, 330, 220],        durs: [0.20, 0.20, 0.50] },
}

export async function playNotificationBeep(type: BeepType = 'cooking'): Promise<void> {
  const ctx = getCtx()
  if (!ctx) return

  // พยายาม resume เสมอก่อนเล่น (safe for suspended state)
  try {
    if (ctx.state !== 'running') await ctx.resume()
  } catch { return }

  const cfg  = BEEP_MAP[type]
  let   time = ctx.currentTime + 0.05  // tiny pre-buffer

  for (let i = 0; i < cfg.freqs.length; i++) {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type           = 'sine'
    osc.frequency.value = cfg.freqs[i]
    gain.gain.setValueAtTime(0.28, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + cfg.durs[i])

    osc.start(time)
    osc.stop(time + cfg.durs[i])
    time += cfg.durs[i] + 0.06
  }
}

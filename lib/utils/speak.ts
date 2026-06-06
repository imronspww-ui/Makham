/**
 * speak() — เล่นเสียงพูดภาษาไทยผ่าน SpeechSynthesis
 *
 * - browser มี focus → เล่นทันที
 * - ไม่มี focus     → queue ไว้ เล่นเมื่อ window ได้ focus กลับมา
 */

let _pendingText: string | null = null
let _listenersAttached = false

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const v = window.speechSynthesis.getVoices()
    if (v.length > 0) { resolve(v); return }
    const h = () => {
      resolve(window.speechSynthesis.getVoices())
      window.speechSynthesis.removeEventListener('voiceschanged', h)
    }
    window.speechSynthesis.addEventListener('voiceschanged', h)
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500)
  })
}

async function doSpeak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()

    // iOS bug เฉพาะ: SpeechSynthesis หยุดเองหลังใช้ไปสักพัก
    // pause/resume ก่อนพูดทุกครั้งบน iOS เท่านั้น — ไม่ทำบน Android/Desktop
    if (isIOS()) {
      window.speechSynthesis.pause()
      window.speechSynthesis.resume()
    }

    const voices    = await loadVoices()
    const thaiVoice = voices.find((v) => v.lang.startsWith('th'))
    if (!thaiVoice) return  // ไม่มี Thai voice → เงียบ (เสียง beep ดูแลแทน)

    const utt   = new SpeechSynthesisUtterance(text)
    utt.voice   = thaiVoice
    utt.lang    = 'th-TH'
    utt.rate    = 0.88
    utt.pitch   = 1.05
    utt.volume  = 1.0
    window.speechSynthesis.speak(utt)
  } catch { /* ignore */ }
}

/** hasFocus() ไม่น่าเชื่อถือบน iOS → ถือ visible = active */
function isActive(): boolean {
  if (typeof document === 'undefined') return false
  return document.hasFocus() || document.visibilityState === 'visible'
}

function attachListeners() {
  if (_listenersAttached || typeof window === 'undefined') return
  _listenersAttached = true

  function tryFlush() {
    if (isActive() && _pendingText) {
      doSpeak(_pendingText)
      _pendingText = null
    }
  }

  window.addEventListener('focus', tryFlush)
  document.addEventListener('visibilitychange', tryFlush)
}

export function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  attachListeners()

  if (isActive()) {
    doSpeak(text)
  } else {
    _pendingText = text
  }
}

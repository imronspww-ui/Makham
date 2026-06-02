/**
 * speak() — เล่นเสียงพูดภาษาไทย
 *
 * browser จะ suspend SpeechSynthesis เมื่อ window ไม่มี focus
 * → queue ไว้ แล้วเล่นอัตโนมัติเมื่อ tab กลับมา visible
 */

let _pendingText: string | null = null
let _listenersAttached = false

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const v = window.speechSynthesis.getVoices()
    if (v.length > 0) { resolve(v); return }
    const h = () => { resolve(window.speechSynthesis.getVoices()); window.speechSynthesis.removeEventListener('voiceschanged', h) }
    window.speechSynthesis.addEventListener('voiceschanged', h)
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 3000)
  })
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

async function doSpeak(text: string) {
  // iOS/iPadOS: SpeechSynthesis ไม่น่าเชื่อถือ → ข้ามไป (ใช้เสียงกริ่งแทน)
  if (isIOS()) return
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()

    // iOS bug: SpeechSynthesis หยุดทำงานเองหลังใช้งานไปสักพัก
    // ต้อง pause/resume ก่อนพูดทุกครั้ง
    if (isIOS()) {
      window.speechSynthesis.pause()
      window.speechSynthesis.resume()
    }

    const voices    = await loadVoices()
    const thaiVoice = voices.find((v) => v.lang.startsWith('th'))
    if (!thaiVoice) return   // ไม่มี Thai voice → เงียบ (เสียงกริ่งดูแลแทน)

    const utt   = new SpeechSynthesisUtterance(text)
    utt.voice   = thaiVoice
    utt.lang    = 'th-TH'
    utt.rate    = 0.88
    utt.pitch   = 1.05
    utt.volume  = 1.0
    window.speechSynthesis.speak(utt)
  } catch { /* ignore */ }
}

/** Chrome block SpeechSynthesis เมื่อ window ไม่มี focus (ไม่ใช่แค่ tab hidden)
 *  iOS: hasFocus() ไม่น่าเชื่อถือ → ถือว่า active เสมอ */
function isActive(): boolean {
  if (typeof document === 'undefined') return false
  if (isIOS()) return true          // iOS: พยายามพูดเสมอ
  return document.hasFocus()
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

  // window focus: กลับจาก app อื่น / click OS notification / กด taskbar
  window.addEventListener('focus', tryFlush)
  // visibilitychange: กลับจาก tab อื่น
  document.addEventListener('visibilitychange', tryFlush)
}

/**
 * เล่นเสียงพูดภาษาไทย
 * - browser มี focus → เล่นทันที
 * - ไม่มี focus     → queue ไว้ เล่นเมื่อ window ได้ focus กลับมา
 */
export function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  attachListeners()

  if (isActive()) {
    doSpeak(text)
  } else {
    _pendingText = text
  }
}

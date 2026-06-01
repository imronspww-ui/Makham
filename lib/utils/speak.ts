/**
 * speak() — เล่นเสียงพูดภาษาไทย
 *
 * browser จะ suspend SpeechSynthesis เมื่อ window ไม่มี focus
 * → queue ไว้ แล้วเล่นอัตโนมัติเมื่อ tab กลับมา visible
 */

let _pendingText: string | null = null
let _listenerAttached = false

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const v = window.speechSynthesis.getVoices()
    if (v.length > 0) { resolve(v); return }
    const h = () => { resolve(window.speechSynthesis.getVoices()); window.speechSynthesis.removeEventListener('voiceschanged', h) }
    window.speechSynthesis.addEventListener('voiceschanged', h)
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 3000)
  })
}

async function doSpeak(text: string) {
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

/** attach visibility listener ครั้งเดียว */
function attachVisibilityListener() {
  if (_listenerAttached || typeof document === 'undefined') return
  _listenerAttached = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && _pendingText) {
      doSpeak(_pendingText)
      _pendingText = null
    }
  })
}

/**
 * เรียกแทน SpeechSynthesisUtterance โดยตรง
 * - visible → เล่นทันที
 * - hidden  → queue แล้วเล่นเมื่อกลับมา
 */
export function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  attachVisibilityListener()

  if (document.visibilityState === 'visible') {
    doSpeak(text)
  } else {
    _pendingText = text   // เขียนทับถ้ามีอยู่แล้ว (เก็บแค่อันล่าสุด)
  }
}

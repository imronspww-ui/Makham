/**
 * speak() — เล่นเสียงพูดภาษาไทยผ่าน SpeechSynthesis
 *
 * Priority: Thai voice → Default voice → First available voice
 * - browser มี focus → เล่นทันที
 * - ไม่มี focus     → queue ไว้ เล่นเมื่อ window ได้ focus กลับมา
 * - iOS bug: ต้อง pause/resume ก่อนพูด (เฉพาะ iOS)
 */

let _pendingText: string | null = null
let _listenersAttached = false

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

async function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const immediate = window.speechSynthesis.getVoices()
  if (immediate.length > 0) return immediate

  return new Promise((resolve) => {
    const handler = () => {
      resolve(window.speechSynthesis.getVoices())
      window.speechSynthesis.removeEventListener('voiceschanged', handler)
    }
    window.speechSynthesis.addEventListener('voiceschanged', handler)
    // fallback — บางเบราว์เซอร์ไม่ยิง voiceschanged
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500)
  })
}

async function doSpeak(text: string): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()

    // iOS bug: SpeechSynthesis หยุดเองหลังใช้ — pause/resume ก่อนพูด (iOS เท่านั้น)
    if (isIOS()) {
      window.speechSynthesis.pause()
      window.speechSynthesis.resume()
    }

    const voices = await loadVoices()

    // เลือก voice: Thai > Default > First available
    const voice =
      voices.find((v) => v.lang.startsWith('th')) ??
      voices.find((v) => v.default) ??
      voices[0] ??
      null

    if (!voice) return  // ไม่มี voice เลย → เงียบ

    const utt    = new SpeechSynthesisUtterance(text)
    utt.voice    = voice
    utt.lang     = voice.lang.startsWith('th') ? 'th-TH' : voice.lang
    utt.rate     = voice.lang.startsWith('th') ? 0.88 : 0.95
    utt.pitch    = 1.05
    utt.volume   = 1.0
    window.speechSynthesis.speak(utt)
  } catch { /* ignore */ }
}

function isVisible(): boolean {
  if (typeof document === 'undefined') return false
  return document.visibilityState === 'visible'
}

function attachListeners() {
  if (_listenersAttached || typeof window === 'undefined') return
  _listenersAttached = true

  function tryFlush() {
    if (isVisible() && _pendingText) {
      doSpeak(_pendingText)
      _pendingText = null
    }
  }

  window.addEventListener('focus', tryFlush)
  document.addEventListener('visibilitychange', tryFlush)
}

export function speak(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  attachListeners()

  if (isVisible()) {
    doSpeak(text)
  } else {
    _pendingText = text
  }
}

// Tiny WebAudio sound effects (no audio files needed). Respects the sound preference.
import { loadPrefs } from './settings'

let ctx
function audio() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)() } catch { return null } }
  if (ctx?.state === 'suspended') ctx.resume?.()
  return ctx
}
function tone(freq, start, dur, type = 'sine', vol = 0.12) {
  const a = audio(); if (!a) return
  const o = a.createOscillator(), g = a.createGain()
  o.type = type; o.frequency.value = freq
  g.gain.setValueAtTime(vol, a.currentTime + start)
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur)
  o.connect(g); g.connect(a.destination)
  o.start(a.currentTime + start); o.stop(a.currentTime + start + dur + 0.02)
}
const play = (fn) => { if (loadPrefs().sound) { try { fn() } catch { /* ignore */ } } }

export const sfx = {
  click: () => play(() => tone(520, 0, 0.08, 'triangle')),
  collect: () => play(() => { tone(660, 0, 0.1); tone(990, 0.08, 0.14) }),
  good: () => play(() => { tone(523, 0, 0.12); tone(659, 0.1, 0.12); tone(784, 0.2, 0.2) }),
  bad: () => play(() => { tone(220, 0, 0.2, 'sawtooth', 0.08); tone(165, 0.15, 0.25, 'sawtooth', 0.08) }),
  win: () => play(() => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, 'triangle'))),
  beep: () => play(() => tone(880, 0, 0.12, 'square', 0.06)),
  launch: () => play(() => { for (let i = 0; i < 12; i++) tone(90 + i * 18, i * 0.12, 0.2, 'sawtooth', 0.05) }),
}

// Optional text-to-speech (browser built-in)
export function speak(text) {
  try {
    if (!('speechSynthesis' in window)) return false
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.95; u.pitch = 1.15
    window.speechSynthesis.speak(u)
    return true
  } catch { return false }
}
export function stopSpeaking() { try { window.speechSynthesis?.cancel() } catch { /* ignore */ } }

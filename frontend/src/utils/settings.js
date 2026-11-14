// Small per-device preferences (sound, reduced motion, narration). Safe if storage is blocked.
const KEY = 'astrokids.prefs'
const defaults = { sound: true, reduceMotion: false, narration: false }

export function loadPrefs() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return { ...defaults } }
}
export function savePrefs(p) { try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* ignore */ } }

export function prefersReducedMotion() {
  try { return loadPrefs().reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

let webglCache = null
/** Detects WebGL once per page and frees the probe context straight away (browsers cap live contexts). */
export function hasWebGL() {
  if (webglCache !== null) return webglCache
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    webglCache = !!(window.WebGLRenderingContext && gl)
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch { webglCache = false }
  return webglCache
}

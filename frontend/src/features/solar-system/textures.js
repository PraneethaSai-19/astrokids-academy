import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

function rand(seed) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}
const hash = (str) => [...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)

const BANDS = {
  jupiter: ['#D8A878', '#C48E5E', '#EBCBA3', '#B07A4C', '#E3BE92'],
  saturn: ['#E6CF8C', '#D2B672', '#F1E0AE', '#C9A95F'],
  uranus: ['#8FD9E0', '#7CCBD3', '#A4E4EA'],
  neptune: ['#4D6FE0', '#3A57C0', '#6A88F0'],
}

/** Procedural planet surfaces drawn on a small canvas (no external image files needed). */
export function makePlanetTexture(slug, color) {
  const w = 256, h = 128
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const g = c.getContext('2d')
  const r = rand(hash(slug))
  g.fillStyle = color; g.fillRect(0, 0, w, h)

  if (BANDS[slug]) {
    const cols = BANDS[slug]
    let y = 0
    while (y < h) {
      const bh = 6 + r() * 16
      g.fillStyle = cols[Math.floor(r() * cols.length)]
      g.globalAlpha = 0.85
      g.beginPath(); g.moveTo(0, y)
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.08 + y) * 2)
      g.lineTo(w, y + bh); g.lineTo(0, y + bh); g.closePath(); g.fill()
      y += bh
    }
    g.globalAlpha = 1
    if (slug === 'jupiter') { // Great Red Spot
      g.fillStyle = '#C4553A'; g.beginPath(); g.ellipse(170, 84, 16, 9, 0, 0, Math.PI * 2); g.fill()
      g.strokeStyle = '#EBCBA3'; g.lineWidth = 2; g.stroke()
    }
  } else if (slug === 'earth') {
    g.fillStyle = '#2E6FD0'; g.fillRect(0, 0, w, h)
    g.fillStyle = '#4FA35A'
    for (let i = 0; i < 9; i++) {
      g.beginPath(); g.ellipse(r() * w, 20 + r() * 88, 14 + r() * 26, 8 + r() * 14, r() * 3, 0, Math.PI * 2); g.fill()
    }
    g.fillStyle = '#fff'; g.globalAlpha = 0.9
    g.fillRect(0, 0, w, 7); g.fillRect(0, h - 7, w, 7)
    g.globalAlpha = 0.45
    for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(r() * w, r() * h, 12 + r() * 20, 3 + r() * 4, 0, 0, Math.PI * 2); g.fill() }
  } else if (slug === 'sun') {
    const grad = g.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, '#FFD86A'); grad.addColorStop(1, '#FF9F2E'); g.fillStyle = grad; g.fillRect(0, 0, w, h)
    g.fillStyle = '#FFF3B0'; g.globalAlpha = 0.5
    for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(r() * w, r() * h, 2 + r() * 6, 0, Math.PI * 2); g.fill() }
  } else { // rocky: Mercury, Venus, Mars - craters / swirls
    const dark = slug === 'venus' ? '#C99A4E' : slug === 'mars' ? '#A8452A' : '#7D7773'
    const light = slug === 'venus' ? '#F3D08A' : slug === 'mars' ? '#E98A5D' : '#CFC8C3'
    for (let i = 0; i < 70; i++) {
      const x = r() * w, y = r() * h, rad = 2 + r() * 9
      g.globalAlpha = 0.5; g.fillStyle = r() > 0.5 ? dark : light
      g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill()
      if (slug !== 'venus') { g.globalAlpha = 0.35; g.strokeStyle = light; g.lineWidth = 1.5; g.stroke() }
    }
    if (slug === 'mars') { g.globalAlpha = 0.9; g.fillStyle = '#fff'; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6) }
  }
  g.globalAlpha = 1
  const t = new CanvasTexture(c)
  t.wrapS = RepeatWrapping
  t.colorSpace = SRGBColorSpace
  return t
}

export function makeRingTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 8
  const g = c.getContext('2d')
  const cols = ['#E6D3A0', '#C9B27A', '#F1E4BC', '#B69E66', '#E0CA92']
  for (let x = 0; x < 256; x++) {
    g.fillStyle = cols[Math.floor(x / 9 + Math.sin(x * 0.4) * 1.2 + 10) % cols.length]
    g.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(x * 0.21))
    g.fillRect(x, 0, 1, 8)
  }
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace
  return t
}

/** Name label drawn on a canvas, used as a Sprite so it always follows its planet and faces the camera. */
export function makeLabelTexture(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64
  const g = c.getContext('2d')
  g.font = '900 38px Nunito, system-ui, sans-serif'
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.lineWidth = 8; g.strokeStyle = 'rgba(6,11,31,0.95)'; g.lineJoin = 'round'
  g.strokeText(text, 128, 34)
  g.fillStyle = '#ffffff'; g.fillText(text, 128, 34)
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace
  return t
}

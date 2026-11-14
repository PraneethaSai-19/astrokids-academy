import { useEffect, useRef, useState } from 'react'
import { Heart, Star } from 'lucide-react'
import { DPad, useGameInput, useGameLoop } from './controls'
import { sfx } from '../../utils/sound'

const ASTRO_R = 16

function drawStar(g, x, y, r, rot) {
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2
    const rad = i % 2 ? r * 0.45 : r
    g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad)
  }
  g.closePath()
}

export default function ZeroGravityGame({ config, onComplete }) {
  const canvas = useRef(null)
  const input = useGameInput(true)
  const W = config.world.width, H = config.world.height
  const state = useRef(null)
  const [hud, setHud] = useState({ stars: 0, lives: config.lives, msg: 'Fly with arrow keys, WASD or the buttons!' })
  const [done, setDone] = useState(false)

  const fresh = () => ({
    x: config.start.x, y: config.start.y, vx: 0, vy: 0, stars: config.stars.map((s) => ({ ...s, got: false })),
    rocks: config.obstacles.map((o) => ({ ...o })), hits: 0, collected: 0, invuln: 0, t: 0, finished: false, msgT: 0, parts: [],
    bg: Array.from({ length: 60 }, (_, i) => ({ x: (i * 197) % W, y: (i * 89) % H, s: 1 + (i % 3) })),
  })
  useEffect(() => { state.current = fresh() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const say = (msg) => setHud((h) => ({ ...h, msg }))

  const finish = (s, reached) => {
    if (s.finished) return
    s.finished = true
    setDone(true)
    onComplete({ stars_collected: s.collected, reached_station: reached, hits: s.hits, duration_seconds: Math.round(s.t * 10) / 10 })
  }

  useGameLoop((dt) => {
    const s = state.current
    if (!s || s.finished) { draw(); return }
    s.t += dt
    const ax = (input.current.right ? 1 : 0) - (input.current.left ? 1 : 0)
    const ay = (input.current.down ? 1 : 0) - (input.current.up ? 1 : 0)
    s.vx += ax * config.thrust * dt
    s.vy += ay * config.thrust * dt
    const drag = Math.max(0, 1 - config.drag * 0.2 * dt)  // very little drag: you keep drifting!
    s.vx *= drag; s.vy *= drag
    const sp = Math.hypot(s.vx, s.vy)
    if (sp > config.max_speed) { s.vx *= config.max_speed / sp; s.vy *= config.max_speed / sp }
    s.x += s.vx * dt; s.y += s.vy * dt
    // soft walls
    if (s.x < ASTRO_R) { s.x = ASTRO_R; s.vx = Math.abs(s.vx) * 0.5 }
    if (s.x > W - ASTRO_R) { s.x = W - ASTRO_R; s.vx = -Math.abs(s.vx) * 0.5 }
    if (s.y < ASTRO_R) { s.y = ASTRO_R; s.vy = Math.abs(s.vy) * 0.5 }
    if (s.y > H - ASTRO_R) { s.y = H - ASTRO_R; s.vy = -Math.abs(s.vy) * 0.5 }
    if (ax || ay) s.parts.push({ x: s.x - s.vx * 0.05, y: s.y - s.vy * 0.05, l: 0.5 })
    s.parts = s.parts.filter((p) => (p.l -= dt) > 0)
    if (s.invuln > 0) s.invuln -= dt

    s.rocks.forEach((r) => {
      r.x += r.vx * dt; r.y += r.vy * dt
      if (r.y < r.r || r.y > H - r.r) r.vy *= -1
      if (r.x < r.r || r.x > W * 0.8 - r.r) r.vx *= -1
      if (s.invuln <= 0 && Math.hypot(r.x - s.x, r.y - s.y) < r.r + ASTRO_R - 4) {
        s.hits += 1; s.invuln = 1.5
        const ang = Math.atan2(s.y - r.y, s.x - r.x); s.vx = Math.cos(ang) * 140; s.vy = Math.sin(ang) * 140
        sfx.bad()
        const left = config.lives - s.hits
        setHud((h) => ({ ...h, lives: left, msg: left > 0 ? 'Bonk! Space rocks are hard. Steer gently!' : 'Too many bumps...' }))
        if (left <= 0) finish(s, false)
      }
    })
    s.stars.forEach((st) => {
      if (!st.got && Math.hypot(st.x - s.x, st.y - s.y) < 28) {
        st.got = true; s.collected += 1; sfx.collect()
        setHud((h) => ({ ...h, stars: s.collected, msg: s.collected === s.stars.length ? 'All stars! Now fly to the space station!' : `Star ${s.collected} of ${s.stars.length}!` }))
      }
    })
    const st = config.station
    if (Math.hypot(st.x - s.x, st.y - s.y) < st.radius) {
      if (s.collected === s.stars.length) { sfx.good(); finish(s, true) }
      else if (s.t - s.msgT > 2) { s.msgT = s.t; say(`Collect all ${s.stars.length} stars first! You have ${s.collected}.`) }
    }
    draw()
  }, !done)

  function draw() {
    const c = canvas.current, s = state.current
    if (!c || !s) return
    const g = c.getContext('2d')
    g.clearRect(0, 0, W, H)
    const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, '#0B1433'); grad.addColorStop(1, '#1B2B5C')
    g.fillStyle = grad; g.fillRect(0, 0, W, H)
    s.bg.forEach((b) => { g.fillStyle = `rgba(255,255,255,${0.3 + (b.s - 1) * 0.25})`; g.fillRect(b.x, b.y, b.s, b.s) })
    // planet in the corner
    const pg = g.createRadialGradient(150, 480, 10, 150, 500, 140); pg.addColorStop(0, '#FFB8D0'); pg.addColorStop(1, '#6E4FB5')
    g.fillStyle = pg; g.beginPath(); g.arc(120, 520, 110, 0, 7); g.fill()
    // station
    const st = config.station, ready = s.collected === s.stars.length
    g.save(); g.translate(st.x, st.y)
    g.shadowColor = ready ? '#A8E6CF' : 'transparent'; g.shadowBlur = ready ? 30 : 0
    g.fillStyle = '#D9E4F5'; g.strokeStyle = '#101C3D'; g.lineWidth = 4
    g.beginPath(); g.roundRect(-34, -22, 68, 44, 12); g.fill(); g.stroke()
    g.fillStyle = ready ? '#A8E6CF' : '#66CDEB'; g.fillRect(-90, -9, 52, 18); g.fillRect(38, -9, 52, 18)
    g.strokeRect(-90, -9, 52, 18); g.strokeRect(38, -9, 52, 18)
    g.fillStyle = '#FFCB69'; g.beginPath(); g.arc(0, 0, 11, 0, 7); g.fill(); g.stroke()
    g.restore()
    g.fillStyle = '#fff'; g.font = 'bold 18px Nunito, sans-serif'; g.textAlign = 'center'
    g.fillText('SPACE STATION', st.x, st.y + 52)
    // stars
    s.stars.forEach((t) => {
      if (t.got) return
      g.save(); g.shadowColor = '#FFCB69'; g.shadowBlur = 18; g.fillStyle = '#FFCB69'
      drawStar(g, t.x, t.y + Math.sin(s.t * 3 + t.x) * 3, 18, s.t); g.fill(); g.restore()
    })
    // rocks
    s.rocks.forEach((r) => {
      g.fillStyle = '#8B7E7A'; g.strokeStyle = '#4B403D'; g.lineWidth = 3
      g.beginPath(); g.arc(r.x, r.y, r.r, 0, 7); g.fill(); g.stroke()
      g.fillStyle = '#6E6360'; g.beginPath(); g.arc(r.x - r.r * 0.3, r.y - r.r * 0.2, r.r * 0.25, 0, 7); g.fill()
      g.beginPath(); g.arc(r.x + r.r * 0.3, r.y + r.r * 0.3, r.r * 0.18, 0, 7); g.fill()
    })
    // jet trail
    s.parts.forEach((p) => { g.fillStyle = `rgba(255,203,105,${p.l})`; g.beginPath(); g.arc(p.x, p.y, 5 * p.l * 2, 0, 7); g.fill() })
    // astronaut
    if (s.invuln <= 0 || Math.floor(s.t * 12) % 2 === 0) {
      g.save(); g.translate(s.x, s.y); g.rotate(Math.max(-0.5, Math.min(0.5, s.vx / 400)))
      g.fillStyle = '#9AA6C8'; g.fillRect(-16, -6, 8, 20)
      g.fillStyle = '#66CDEB'; g.strokeStyle = '#101C3D'; g.lineWidth = 3
      g.beginPath(); g.roundRect(-11, -2, 22, 24, 8); g.fill(); g.stroke()
      g.fillStyle = '#fff'; g.beginPath(); g.arc(0, -8, 13, 0, 7); g.fill(); g.stroke()
      g.fillStyle = '#FFCB69'; g.beginPath(); g.ellipse(0, -8, 8, 6, 0, 0, 7); g.fill()
      g.restore()
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xl font-black">
        <span className="flex items-center gap-1"><Star className="h-6 w-6 fill-star text-star" />{hud.stars} / {config.stars.length}</span>
        <span className="flex items-center gap-1">{Array.from({ length: config.lives }, (_, i) => <Heart key={i} className={`h-6 w-6 ${i < hud.lives ? 'fill-blush text-blush' : 'text-white/30'}`} />)}</span>
      </div>
      <canvas ref={canvas} width={W} height={H} className="w-full rounded-3xl border-2 border-white/20 bg-navy-900" aria-label="Zero gravity game area" />
      <p className="rounded-2xl bg-white/10 p-3 text-center text-lg font-extrabold" aria-live="polite">{hud.msg}</p>
      <div className="flex justify-center md:hidden"><DPad input={input} /></div>
      <p className="hidden text-center text-base font-bold text-white/70 md:block">Keyboard: Arrow keys or W A S D</p>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Flame, Fuel } from 'lucide-react'
import { setDir, useGameInput, useGameLoop } from './controls'
import { sfx } from '../../utils/sound'

export default function MoonLandingGame({ config, onComplete }) {
  const canvas = useRef(null)
  const input = useGameInput(true)
  const W = config.world.width, H = config.world.height, GY = config.ground_y
  const s = useRef(null)
  const [hud, setHud] = useState({ vy: 0, vx: 18 / 10, fuel: config.fuel, alt: 0 })
  const [phase, setPhase] = useState('fly')   // fly | landed | crashed
  const [note, setNote] = useState('Hold UP to fire the main engine. Use LEFT and RIGHT to stop drifting. Land on a green pad!')

  useEffect(() => {
    s.current = { x: config.lander.x, y: config.lander.y, vx: config.lander.vx, vy: 0, fuel: config.fuel, t: 0, done: false, flame: 0, ex: [], hudT: 0 }
    const stars = Array.from({ length: 70 }, (_, i) => ({ x: (i * 211) % W, y: (i * 97) % (GY - 20), r: 1 + (i % 3) * 0.6 }))
    s.current.stars = stars
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useGameLoop((dt) => {
    const m = s.current
    if (!m) return
    if (!m.done) {
      m.t += dt
      const thrust = input.current.up && m.fuel > 0
      const left = input.current.left && m.fuel > 0, right = input.current.right && m.fuel > 0
      m.vy += config.gravity * dt
      if (thrust) { m.vy -= config.main_thrust * dt; m.fuel -= config.fuel_burn_main * dt }
      if (left) { m.vx -= config.side_thrust * dt; m.fuel -= config.fuel_burn_side * dt }
      if (right) { m.vx += config.side_thrust * dt; m.fuel -= config.fuel_burn_side * dt }
      m.fuel = Math.max(0, m.fuel)
      m.flame = thrust ? 1 : Math.max(0, m.flame - dt * 6)
      m.x += m.vx * dt; m.y += m.vy * dt
      if (m.x < 20) { m.x = 20; m.vx = 0 } if (m.x > W - 20) { m.x = W - 20; m.vx = 0 }
      if (m.y < 20) { m.y = 20; m.vy = Math.max(0, m.vy) }
      m.hudT += dt
      if (m.hudT > 0.1) { m.hudT = 0; setHud({ vy: m.vy / 10, vx: m.vx / 10, fuel: m.fuel, alt: Math.max(0, (GY - m.y - 24) / 10) }) }
      if (m.y + 24 >= GY) {   // touchdown
        m.done = true; m.y = GY - 24
        const vs = Math.abs(m.vy) / 10, hs = Math.abs(m.vx) / 10
        const zone = config.zones.find((z) => m.x >= z.x0 && m.x < z.x1)
        const safe = zone?.type === 'safe' && m.x - config.lander.half_width >= zone.x0 && m.x + config.lander.half_width <= zone.x1 && vs <= config.safe_vertical_speed && hs <= config.safe_horizontal_speed
        setPhase(safe ? 'landed' : 'crashed')
        if (safe) { sfx.win(); setNote('The Eagle has landed! Great flying, Commander!') } else {
          sfx.bad()
          m.ex = Array.from({ length: 22 }, () => ({ a: Math.random() * 6.28, v: 40 + Math.random() * 120, l: 1 }))
          setNote(zone?.type !== 'safe' ? `You touched down on the ${zone?.label}. Aim for a green pad!` : vs > config.safe_vertical_speed ? `Too fast: ${vs.toFixed(1)} m/s. Use more thrust to slow down (safe is under ${config.safe_vertical_speed}).` : 'You slid sideways. Use side thrusters to stop drifting.')
        }
        setHud((h) => ({ ...h, vy: vs, vx: hs, fuel: m.fuel, alt: 0 }))
        setTimeout(() => onComplete({ landing_x: m.x, vertical_speed: vs, horizontal_speed: hs, fuel_left: Math.round(m.fuel * 10) / 10, duration_seconds: Math.max(3.1, Math.round(m.t * 10) / 10) }), 1600)
      }
    } else m.ex.forEach((p) => { p.l -= dt })
    draw()
  }, true)

  function draw() {
    const c = canvas.current, m = s.current
    if (!c || !m) return
    const g = c.getContext('2d')
    g.fillStyle = '#070C22'; g.fillRect(0, 0, W, H)
    m.stars.forEach((st) => { g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(st.x, st.y, st.r, st.r) })
    // Earth in the sky
    const eg = g.createRadialGradient(760, 90, 4, 760, 90, 44); eg.addColorStop(0, '#9BD1FF'); eg.addColorStop(1, '#2E6FD0')
    g.fillStyle = eg; g.beginPath(); g.arc(760, 90, 40, 0, 7); g.fill()
    g.fillStyle = '#4FA35A'; g.beginPath(); g.ellipse(750, 84, 14, 9, 0.4, 0, 7); g.fill()
    // ground zones
    config.zones.forEach((z) => {
      const col = z.type === 'safe' ? '#7BD99B' : z.type === 'crater' ? '#4A4560' : '#8D7C7A'
      g.fillStyle = z.type === 'safe' ? '#BFC4D6' : '#A7A2B5'; g.fillRect(z.x0, GY, z.x1 - z.x0, H - GY)
      if (z.type === 'safe') { g.fillStyle = col; g.fillRect(z.x0 + 4, GY - 6, z.x1 - z.x0 - 8, 8); g.fillStyle = '#101C3D'; g.font = 'bold 15px Nunito, sans-serif'; g.textAlign = 'center'; g.fillText('LANDING PAD', (z.x0 + z.x1) / 2, GY + 26) }
      if (z.type === 'crater') { g.fillStyle = col; g.beginPath(); g.ellipse((z.x0 + z.x1) / 2, GY + 4, (z.x1 - z.x0) / 2 - 8, 26, 0, 0, Math.PI); g.fill(); g.fillStyle = '#FFB8D0'; g.font = 'bold 15px Nunito, sans-serif'; g.textAlign = 'center'; g.fillText('CRATER - UNSAFE', (z.x0 + z.x1) / 2, GY + 44) }
      if (z.type === 'rocks') { g.fillStyle = col; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(z.x0 + 15 + i * ((z.x1 - z.x0 - 30) / 4), GY - 4 - (i % 2) * 7, 12 + (i % 3) * 3, Math.PI, 0); g.fill() } g.fillStyle = '#FFB8D0'; g.font = 'bold 15px Nunito, sans-serif'; g.textAlign = 'center'; g.fillText('ROCKS - UNSAFE', (z.x0 + z.x1) / 2, GY + 44) }
    })
    // lander
    if (phase !== 'crashed') {
      g.save(); g.translate(m.x, m.y)
      if (m.flame > 0.1) { g.fillStyle = '#FFCB69'; g.beginPath(); g.moveTo(-9, 20); g.lineTo(0, 46 + Math.random() * 12); g.lineTo(9, 20); g.fill(); g.fillStyle = '#FF8A65'; g.beginPath(); g.moveTo(-5, 20); g.lineTo(0, 34 + Math.random() * 8); g.lineTo(5, 20); g.fill() }
      if (input.current.left && m.fuel > 0 && !m.done) { g.fillStyle = '#66CDEB'; g.fillRect(22, -4, 14, 5) }
      if (input.current.right && m.fuel > 0 && !m.done) { g.fillStyle = '#66CDEB'; g.fillRect(-36, -4, 14, 5) }
      g.strokeStyle = '#D9E4F5'; g.lineWidth = 4; g.beginPath(); g.moveTo(-14, 14); g.lineTo(-26, 24); g.moveTo(14, 14); g.lineTo(26, 24); g.stroke()
      g.fillStyle = '#FFCB69'; g.strokeStyle = '#101C3D'; g.lineWidth = 3
      g.beginPath(); g.roundRect(-18, -4, 36, 22, 6); g.fill(); g.stroke()
      g.fillStyle = '#E9EFFB'; g.beginPath(); g.arc(0, -10, 16, Math.PI, 0); g.fill(); g.stroke()
      g.fillStyle = '#66CDEB'; g.beginPath(); g.arc(0, -11, 8, 0, 7); g.fill()
      g.restore()
    } else {
      m.ex.forEach((p) => { if (p.l > 0) { g.fillStyle = `rgba(255,${120 + p.l * 100},60,${p.l})`; g.beginPath(); g.arc(m.x + Math.cos(p.a) * p.v * (1 - p.l) * 1.2, m.y + Math.sin(p.a) * p.v * (1 - p.l) * 1.2, 7 * p.l + 2, 0, 7); g.fill() } })
    }
  }

  const holdBtn = (k) => ({
    onPointerDown: (e) => { e.preventDefault(); setDir(input, k, true) }, onPointerUp: () => setDir(input, k, false),
    onPointerLeave: () => setDir(input, k, false), onPointerCancel: () => setDir(input, k, false), onContextMenu: (e) => e.preventDefault(),
  })
  const vyOk = Math.abs(hud.vy) <= config.safe_vertical_speed, vxOk = Math.abs(hud.vx) <= config.safe_horizontal_speed

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        <div className={`rounded-2xl p-2 ${vyOk ? 'bg-mint/25 text-mint' : 'bg-blush/25 text-blush'}`}><p className="text-sm font-extrabold">Falling speed</p><p className="text-2xl font-black">{Math.abs(hud.vy).toFixed(1)} m/s</p></div>
        <div className={`rounded-2xl p-2 ${vxOk ? 'bg-mint/25 text-mint' : 'bg-blush/25 text-blush'}`}><p className="text-sm font-extrabold">Sideways speed</p><p className="text-2xl font-black">{Math.abs(hud.vx).toFixed(1)} m/s</p></div>
        <div className="rounded-2xl bg-white/10 p-2"><p className="text-sm font-extrabold">Height</p><p className="text-2xl font-black">{hud.alt.toFixed(0)} m</p></div>
        <div className="rounded-2xl bg-white/10 p-2"><p className="flex items-center justify-center gap-1 text-sm font-extrabold"><Fuel className="h-4 w-4" />Fuel</p>
          <div className="mt-2 h-4 overflow-hidden rounded-full bg-navy-900"><div className={`h-full ${hud.fuel < 25 ? 'bg-blush' : 'bg-star'}`} style={{ width: `${hud.fuel}%` }} /></div></div>
      </div>
      <canvas ref={canvas} width={W} height={H} className="w-full rounded-3xl border-2 border-white/20" aria-label="Moon landing game area" />
      <p className="rounded-2xl bg-white/10 p-3 text-center text-lg font-extrabold" aria-live="polite">{note}</p>
      <div className="flex items-center justify-center gap-3">
        <button className="btn btn-blue touch-none-game !h-16 !w-20" aria-label="Thrust left" {...holdBtn('left')}><ArrowLeft className="h-8 w-8" /></button>
        <button className="btn btn-yellow touch-none-game !h-16 !px-8" aria-label="Main engine thrust" {...holdBtn('up')}><Flame className="h-8 w-8" />Thrust</button>
        <button className="btn btn-blue touch-none-game !h-16 !w-20" aria-label="Thrust right" {...holdBtn('right')}><ArrowRight className="h-8 w-8" /></button>
      </div>
      <p className="hidden text-center text-base font-bold text-white/70 md:block">Keyboard: UP / W / Space = thrust · LEFT / RIGHT or A / D = side thrusters</p>
    </div>
  )
}

import { useEffect, useRef } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react'

const MIN_HOLD_MS = 80
const downAt = {}

/** Set a direction flag. A release is delayed so even a very quick tap lasts a few frames. */
export function setDir(input, dir, on) {
  if (on) {
    downAt[dir] = performance.now()
    input.current[dir] = true
  } else {
    const wait = Math.max(0, MIN_HOLD_MS - (performance.now() - (downAt[dir] || 0)))
    if (wait === 0) input.current[dir] = false
    else setTimeout(() => { if (performance.now() - downAt[dir] >= MIN_HOLD_MS - 5) input.current[dir] = false }, wait)
  }
}

const KEYMAP = {
  ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ' ': 'up',
}

/** Shared input state (keyboard + on-screen buttons). `input.current.up` etc. are read by game loops. */
export function useGameInput(enabled = true) {
  const input = useRef({ up: false, down: false, left: false, right: false })
  useEffect(() => {
    if (!enabled) return undefined
    const down = (e) => {
      const k = KEYMAP[e.key]
      if (!k) return
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault()
      if (!e.repeat) setDir(input, k, true)
    }
    const up = (e) => { const k = KEYMAP[e.key]; if (k) setDir(input, k, false) }
    const blur = () => { input.current = { up: false, down: false, left: false, right: false } }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); blur() }
  }, [enabled])
  return input
}

function PadButton({ dir, icon: Icon, input, label, className = '' }) {
  const set = (v) => (e) => { e.preventDefault(); setDir(input, dir, v) }
  return (
    <button type="button" aria-label={label} onPointerDown={set(true)} onPointerUp={set(false)} onPointerLeave={set(false)} onPointerCancel={set(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={`touch-none-game grid h-16 w-16 place-items-center rounded-2xl border-2 border-white/30 bg-white/15 text-white active:bg-star active:text-navy md:h-14 md:w-14 ${className}`}>
      <Icon className="h-8 w-8" />
    </button>
  )
}

/** On-screen directional pad for touch devices (also usable with a mouse). */
export function DPad({ input, show = ['up', 'down', 'left', 'right'] }) {
  const has = (d) => show.includes(d)
  return (
    <div className="grid grid-cols-3 grid-rows-2 gap-2" role="group" aria-label="Touch controls">
      <div />{has('up') ? <PadButton dir="up" icon={ArrowUp} input={input} label="Move up" /> : <div />}<div />
      {has('left') ? <PadButton dir="left" icon={ArrowLeft} input={input} label="Move left" /> : <div />}
      {has('down') ? <PadButton dir="down" icon={ArrowDown} input={input} label="Move down" /> : <div />}
      {has('right') ? <PadButton dir="right" icon={ArrowRight} input={input} label="Move right" /> : <div />}
    </div>
  )
}

/** Runs `step(dt)` every animation frame while `active`. dt is capped to avoid huge jumps after tab switches. */
export function useGameLoop(step, active) {
  const ref = useRef(step)
  ref.current = step
  useEffect(() => {
    if (!active) return undefined
    let raf, last = performance.now()
    const loop = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      ref.current(dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active])
}

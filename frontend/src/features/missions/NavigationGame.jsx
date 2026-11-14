import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Play, RotateCcw, Undo2, Rocket, Check } from 'lucide-react'
import { sfx } from '../../utils/sound'

const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }
const ARROW = { U: ArrowUp, D: ArrowDown, L: ArrowLeft, R: ArrowRight }

// Same rules as the server (which re-checks the final routes before giving any XP).
function simulate(level, moves) {
  const blocked = new Set(level.asteroids.map((a) => a.join(',')))
  let [x, y] = level.start
  const path = [[x, y]]
  if (moves.length > level.max_moves) return { reached: false, reason: 'out_of_fuel', path, step: level.max_moves }
  for (let i = 0; i < moves.length; i++) {
    const [dx, dy] = DIRS[moves[i]]
    x += dx; y += dy
    if (x < 0 || y < 0 || x >= level.cols || y >= level.rows) return { reached: false, reason: 'off_map', path, step: i + 1 }
    path.push([x, y])
    if (blocked.has(`${x},${y}`)) return { reached: false, reason: 'asteroid', path, step: i + 1 }
    if (x === level.goal[0] && y === level.goal[1]) return { reached: true, reason: 'arrived', path, step: i + 1 }
  }
  return { reached: false, reason: 'not_reached', path, step: moves.length }
}
const MSG = {
  arrived: (l) => `Perfect landing on ${l.destination}!`,
  asteroid: (_l, r) => `Bonk! You hit an asteroid on move ${r.step}. Change your route and try again.`,
  off_map: (_l, r) => `Oops, on move ${r.step} you flew off the star map.`,
  not_reached: (l) => `You ran out of moves before reaching ${l.destination}. Add more steps!`,
  out_of_fuel: (l) => `That route is too long. Your rocket only has fuel for ${l.max_moves} moves.`,
}

export default function NavigationGame({ config, onComplete }) {
  const levels = config.levels
  const [li, setLi] = useState(0)
  const [routes, setRoutes] = useState({})       // solved routes by level id
  const [moves, setMoves] = useState([])
  const [flight, setFlight] = useState(null)     // { path, idx, result }
  const [message, setMessage] = useState('')
  const timer = useRef(null)
  const level = levels[li]

  useEffect(() => () => clearInterval(timer.current), [])
  useEffect(() => { setMoves([]); setFlight(null); setMessage(level.hint) }, [li]) // eslint-disable-line react-hooks/exhaustive-deps

  const add = (m) => { if (flight || moves.length >= level.max_moves) return; sfx.click(); setMoves((a) => [...a, m]) }
  const launch = () => {
    if (flight || moves.length === 0) return
    const result = simulate(level, moves)
    setFlight({ path: result.path, idx: 0, result })
    sfx.launch()
    let i = 0
    clearInterval(timer.current)
    timer.current = setInterval(() => {
      i += 1
      setFlight((f) => (f ? { ...f, idx: Math.min(i, f.path.length - 1) } : f))
      if (i >= result.path.length - 1) {
        clearInterval(timer.current)
        setTimeout(() => {
          setMessage(MSG[result.reason](level, result))
          if (result.reached) {
            sfx.good()
            const nextRoutes = { ...routes, [level.id]: moves }
            setRoutes(nextRoutes)
            if (Object.keys(nextRoutes).length === levels.length) onComplete({ routes: nextRoutes })
          } else sfx.bad()
        }, 250)
      }
    }, 330)
  }
  const reset = () => { clearInterval(timer.current); setFlight(null); setMoves([]); setMessage(level.hint) }

  const solved = !!routes[level.id]
  const flying = !!flight && flight.idx < flight.path.length - 1
  const allDone = Object.keys(routes).length === levels.length
  const ship = flight ? flight.path[flight.idx] : level.start
  const crashed = flight && flight.idx >= flight.path.length - 1 && !flight.result.reached && flight.result.reason === 'asteroid'
  const planned = (() => { // preview of the planned path (before launch)
    const pts = [], blocked = []
    let [x, y] = level.start
    for (const m of moves) { x += DIRS[m][0]; y += DIRS[m][1]; pts.push(`${x},${y}`); blocked.push(0) }
    return new Set(pts)
  })()
  const asteroidSet = new Set(level.asteroids.map((a) => a.join(',')))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {levels.map((l, i) => (
          <button key={l.id} onClick={() => !flying && setLi(i)} aria-current={i === li}
            className={`btn !min-h-[44px] !px-4 !py-2 !text-base ${i === li ? 'btn-yellow' : 'btn-ghost'}`}>
            {routes[l.id] ? <Check className="h-5 w-5" /> : null}Planet {i + 1}: {l.destination}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border-2 border-white/15 bg-navy-900/60 p-3">
        <p className="mb-2 text-center text-xl font-black">Fly to <span style={{ color: level.color }}>{level.destination}</span> · Fuel: {level.max_moves - moves.length} moves left</p>
        <div className="mx-auto grid max-w-2xl gap-1.5" style={{ gridTemplateColumns: `repeat(${level.cols}, minmax(0, 1fr))` }} role="grid" aria-label="Star map">
          {Array.from({ length: level.rows * level.cols }, (_, n) => {
            const x = n % level.cols, y = Math.floor(n / level.cols), key = `${x},${y}`
            const isShip = ship[0] === x && ship[1] === y
            const isGoal = level.goal[0] === x && level.goal[1] === y
            const isAst = asteroidSet.has(key)
            const isStart = level.start[0] === x && level.start[1] === y
            return (
              <div key={key} role="gridcell" className={`relative grid aspect-square place-items-center rounded-xl border border-white/10 ${planned.has(key) && !flight ? 'bg-star/25' : 'bg-white/5'}`}>
                {isGoal && <span className="h-[70%] w-[70%] rounded-full shadow-glow" style={{ background: `radial-gradient(circle at 30% 30%, #fff8, ${level.color} 55%, #0006)` }} aria-label={level.destination} />}
                {isAst && <span className={`h-[72%] w-[72%] rounded-full border-4 border-[#4B403D] bg-[#8B7E7A] ${crashed && isShip ? '' : 'animate-float'}`} aria-label="asteroid" />}
                {isStart && !isShip && <span className="text-xs font-extrabold text-white/50">START</span>}
                {isShip && (
                  <span className={`absolute inset-0 grid place-items-center transition-all duration-300 ${crashed ? 'scale-125' : ''}`} aria-label="your rocket">
                    <Rocket className={`h-[60%] w-[60%] rotate-45 ${crashed ? 'text-blush' : 'text-star'}`} />
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="card">
        <p className="mb-2 text-lg font-extrabold">Your route ({moves.length}/{level.max_moves}):</p>
        <div className="flex min-h-[3rem] flex-wrap gap-1.5" aria-live="polite">
          {moves.length === 0 && <span className="text-base font-bold text-white/60">Press the arrows to plan your flight...</span>}
          {moves.map((m, i) => { const A = ARROW[m]; return <span key={i} className={`grid h-10 w-10 place-items-center rounded-xl ${flight && i < flight.idx ? 'bg-mint text-navy' : 'bg-galaxy text-navy'}`}><A className="h-6 w-6" /></span> })}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {['L', 'U', 'D', 'R'].map((m) => { const A = ARROW[m]; return (
            <button key={m} className="btn btn-blue !min-h-[56px] !w-16 !px-0" onClick={() => add(m)} disabled={!!flight || solved} aria-label={`Add move ${{ L: 'left', U: 'up', D: 'down', R: 'right' }[m]}`}><A className="h-7 w-7" /></button>
          ) })}
          <button className="btn btn-ghost" onClick={() => !flight && setMoves((a) => a.slice(0, -1))} disabled={!!flight || solved}><Undo2 className="h-5 w-5" />Undo</button>
          <button className="btn btn-ghost" onClick={reset} disabled={solved && !flight}><RotateCcw className="h-5 w-5" />Clear</button>
          <button className="btn btn-yellow" onClick={launch} disabled={!!flight || moves.length === 0 || solved}><Play className="h-6 w-6" />Launch!</button>
        </div>
      </div>
      <p className={`rounded-2xl p-3 text-center text-lg font-extrabold ${solved ? 'bg-mint/25 text-mint' : 'bg-white/10'}`} aria-live="polite">
        {solved ? `Route to ${level.destination} complete! ${li < levels.length - 1 ? 'Pick the next planet above.' : ''}` : message}
      </p>
      {solved && !flying && li < levels.length - 1 && !allDone && (
        <div className="text-center"><button className="btn btn-purple" onClick={() => setLi(li + 1)}><Rocket className="h-5 w-5" />Next planet: {levels[li + 1].destination}</button></div>
      )}
      {flight && flight.idx >= flight.path.length - 1 && !flight.result.reached && (
        <div className="text-center"><button className="btn btn-purple" onClick={reset}><RotateCcw className="h-5 w-5" />Fix my route</button></div>
      )}
    </div>
  )
}

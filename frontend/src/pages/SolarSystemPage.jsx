import { Component, lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Globe2, Pause, Play, Rocket, Thermometer, Moon, Ruler, Sun, Volume2, Square, Zap, Box, Check } from 'lucide-react'
import { useApp } from '../context/AuthContext'
import { api, errorMessage } from '../services/api'
import { ErrorBox, Loading, PageTitle } from '../components/ui'
import Fallback2D from '../features/solar-system/Fallback2D'
import { hasWebGL, prefersReducedMotion } from '../utils/settings'
import { speak, stopSpeaking } from '../utils/sound'

const SolarScene = lazy(() => import('../features/solar-system/SolarScene'))

class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(e) { console.warn('3D scene failed, using 2D fallback', e) }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false }) }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-navy-900/50 p-3">
      <p className="flex items-center gap-1 text-sm font-extrabold text-planet"><Icon className="h-4 w-4" />{label}</p>
      <p className="text-base font-black leading-snug">{value}</p>
    </div>
  )
}

export default function SolarSystemPage() {
  const { childId, showReward, prefs, setPrefs } = useApp()
  const [planets, setPlanets] = useState(null)
  const [visited, setVisited] = useState(new Set())
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [paused, setPaused] = useState(prefersReducedMotion())
  const [mode, setMode] = useState(() => (hasWebGL() ? '3d' : '2d'))
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const lowPower = useMemo(() => /Mobi|Android/i.test(navigator.userAgent) || (navigator.hardwareConcurrency || 8) <= 4, [])

  useEffect(() => {
    Promise.all([api.planets(), api.visitedPlanets(childId)])
      .then(([p, v]) => { setPlanets(p); setVisited(new Set(v.map((x) => x.slug))) })
      .catch((e) => setError(errorMessage(e)))
    return () => stopSpeaking()
  }, [childId])

  const planet = planets?.find((p) => p.slug === selected)
  useEffect(() => { stopSpeaking(); setSpeaking(false) }, [selected])

  const explore = async () => {
    if (!planet) return
    setBusy(true)
    try {
      const r = await api.explorePlanet(childId, planet.slug)
      setVisited((v) => new Set(v).add(planet.slug))
      if (r.first_visit) showReward(r, { title: `${planet.name} explored!` })
      else showReward({ ...r, xp_earned: 0 }, {})
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }

  const narrate = () => {
    if (speaking) { stopSpeaking(); setSpeaking(false); return }
    const text = `${planet.name}. ${planet.tagline}. ${planet.description} Fun fact: ${planet.fun_facts[0]}`
    if (speak(text)) setSpeaking(true)
  }
  useEffect(() => {
    if (planet && prefs.narration) { speak(`${planet.name}. ${planet.tagline}. ${planet.description}`); setSpeaking(true) }
  }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!planets) return error ? <ErrorBox message={error} /> : <Loading text="Charting the solar system..." />

  const fallback = <Fallback2D planets={planets} selected={selected} onSelect={setSelected} />
  return (
    <div>
      <PageTitle icon={Globe2} title="3D Solar System" subtitle={`Explored ${visited.size} of ${planets.length} · tap a planet to visit it`}>
        <div className="flex flex-wrap gap-2">
          {mode === '3d' && (
            <button className="btn btn-ghost !min-h-[44px] !px-4 !text-base" onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
              {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}{paused ? 'Play orbits' : 'Pause orbits'}
            </button>
          )}
          <button className="btn btn-ghost !min-h-[44px] !px-4 !text-base" onClick={() => setMode((m) => (m === '3d' ? '2d' : '3d'))}
            disabled={mode === '2d' && !hasWebGL()} title={!hasWebGL() ? 'WebGL is not available on this device' : ''}>
            {mode === '3d' ? <><Zap className="h-5 w-5" />Light 2D view</> : <><Box className="h-5 w-5" />3D view</>}
          </button>
        </div>
      </PageTitle>
      <ErrorBox message={error} />
      {notice && <p className="mb-3 rounded-2xl bg-star/20 p-3 text-lg font-extrabold text-star" role="status">{notice}</p>}
      {mode === '2d' && !hasWebGL() && !notice && <p className="mb-3 rounded-2xl bg-white/10 p-3 text-base font-bold">3D graphics are not available on this device, so you are seeing the 2D solar system.</p>}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="relative h-[52vh] min-h-[22rem] overflow-hidden rounded-3xl border-2 border-white/15 bg-[#060b1f] lg:h-[68vh]">
          {mode === '3d' ? (
            <SceneBoundary fallback={fallback} resetKey={mode}>
              <Suspense fallback={<Loading text="Warming up the 3D engines..." />}>
                <SolarScene planets={planets} selected={selected} onSelect={setSelected} paused={paused} lowPower={lowPower}
                  onLost={() => { setMode('2d'); setNotice('The 3D view stopped (your device ran out of graphics memory), so here is the lighter 2D view.') }} />
              </Suspense>
            </SceneBoundary>
          ) : fallback}
          {mode === '3d' && <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-sm font-bold text-white/60">Drag to look around · scroll or pinch to zoom · tap a planet</p>}
        </div>

        <aside className="card max-h-[68vh] overflow-y-auto" aria-live="polite">
          {!planet ? (
            <div className="py-6 text-center">
              <Sun className="mx-auto h-14 w-14 text-star animate-float" />
              <h2 className="mt-2 text-2xl font-black">Pick a world!</h2>
              <p className="text-lg font-bold text-white/80">Tap a planet in space, or choose one below.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-14 w-14 shrink-0 rounded-full" style={{ background: `radial-gradient(circle at 30% 30%, #fff8, ${planet.color} 50%, #0007 140%)` }} />
                <div><h2 className="text-3xl font-black">{planet.name}</h2><p className="text-lg font-extrabold text-galaxy">{planet.tagline}</p></div>
              </div>
              <p className="text-lg font-bold leading-snug">{planet.description}</p>
              <div className="grid grid-cols-2 gap-2">
                <Stat icon={Ruler} label="Distance from Sun" value={planet.distance_from_sun} />
                <Stat icon={Thermometer} label="Temperature" value={planet.temperature} />
                <Stat icon={Globe2} label="Size" value={`${planet.diameter_km.toLocaleString()} km · ${planet.size_comparison}`} />
                <Stat icon={Moon} label="Moons" value={planet.moons == null ? 'Not a planet - it is a star!' : planet.moons} />
                <Stat icon={Sun} label="One day" value={planet.day_length} />
                <Stat icon={Rocket} label="One year" value={planet.year_length} />
              </div>
              <p className="text-sm font-bold text-white/60">Facts based on NASA Solar System Exploration data. <a className="text-planet underline" href={`https://science.nasa.gov/solar-system/`} target="_blank" rel="noreferrer">Learn more at NASA</a></p>
              <div>
                <h3 className="mb-1 text-xl font-black text-star">Fun facts</h3>
                <ul className="list-disc space-y-1 pl-6 text-lg font-bold">{planet.fun_facts.map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button className="btn btn-yellow flex-1" onClick={explore} disabled={busy}>
                  {visited.has(planet.slug) ? <Check className="h-6 w-6" /> : <Rocket className="h-6 w-6" />}
                  {visited.has(planet.slug) ? 'Explored!' : `Explore ${planet.name.replace('The ', '')} (+${planet.xp_reward} XP)`}
                </button>
                <button className="btn btn-ghost" onClick={narrate} aria-pressed={speaking}>
                  {speaking ? <Square className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}{speaking ? 'Stop' : 'Read to me'}
                </button>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-base font-bold text-white/80">
                <input type="checkbox" className="h-5 w-5 accent-star" checked={prefs.narration} onChange={(e) => setPrefs({ narration: e.target.checked })} />
                Read each planet aloud automatically
              </label>
            </div>
          )}
        </aside>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Choose a planet">
        {planets.map((p) => (
          <button key={p.slug} onClick={() => setSelected(p.slug)} aria-pressed={selected === p.slug}
            className={`btn !min-h-[44px] !px-4 !py-2 !text-base ${selected === p.slug ? 'btn-yellow' : 'btn-ghost'}`}>
            <span className="h-4 w-4 rounded-full" style={{ background: p.color }} />{p.name.replace('The ', '')}
            {visited.has(p.slug) && <Check className="h-4 w-4 text-mint" />}
          </button>
        ))}
      </div>
    </div>
  )
}

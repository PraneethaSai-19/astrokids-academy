import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Check, FlaskConical, Info, Rocket, RotateCcw, Save, ShieldCheck, X } from 'lucide-react'
import { useApp } from '../context/AuthContext'
import { api, errorMessage } from '../services/api'
import { ErrorBox, Loading, PageTitle, Spinner } from '../components/ui'
import RocketSVG from '../components/RocketSVG'
import { sfx } from '../utils/sound'
import { prefersReducedMotion } from '../utils/settings'

const BODY_COLORS = ['#FFFFFF', '#FFCB69', '#66CDEB', '#A8E6CF', '#C99BFA', '#FF8A65']
const ACCENT_COLORS = ['#FFB8D0', '#FF8A65', '#66CDEB', '#C99BFA', '#FFCB69', '#A8E6CF']
const SLOT_LABEL = { nose: 'Nose cone spot', body: 'Body spot', fuel: 'Fuel tank spot', engine: 'Engine spot', fins: 'Fins spot' }

export default function RocketLab() {
  const { childId, showReward } = useApp()
  const [catalog, setCatalog] = useState(null)
  const [slots, setSlots] = useState({})        // slot -> part id
  const [extras, setExtras] = useState([])
  const [bodyColor, setBodyColor] = useState('#FFFFFF')
  const [accent, setAccent] = useState('#FFB8D0')
  const [name, setName] = useState('My Rocket')
  const [info, setInfo] = useState(null)
  const [drag, setDrag] = useState(null)
  const [overSlot, setOverSlot] = useState(null)
  const [message, setMessage] = useState({ type: 'info', text: 'Drag parts into the spots, or tap a part and then tap a spot.' })
  const [check, setCheck] = useState(null)
  const [selected, setSelected] = useState(null)
  const [stage, setStage] = useState('build')     // build | countdown | flying | success
  const [count, setCount] = useState(3)
  const [launchRes, setLaunchRes] = useState(null)
  const [builds, setBuilds] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pendingReward = useRef(null)

  useEffect(() => {
    Promise.all([api.rocketParts(), api.rocketBuilds(childId)]).then(([c, b]) => { setCatalog(c); setBuilds(b) }).catch((e) => setError(errorMessage(e)))
  }, [childId])

  if (!catalog) return error ? <ErrorBox message={error} /> : <Loading text="Opening the Rocket Lab..." />
  const partById = Object.fromEntries(catalog.parts.map((p) => [p.id, p]))
  const placedIds = new Set([...Object.values(slots), ...extras])
  const payload = () => ({ name: name.trim() || 'My Rocket', components: { ...slots, extras }, body_color: bodyColor, accent_color: accent })

  const tryPlace = (partId, slot) => {
    const part = partById[partId]
    if (!part || placedIds.has(partId)) return
    if (part.slot === 'extra') {
      if (slot !== 'extra') { sfx.bad(); setMessage({ type: 'bad', text: `The ${part.name} does not fit in a rocket spot. Drop it in the "Extra parts" box if you want to try it!` }); return }
      sfx.good(); setExtras((e) => [...e, partId]); setInfo(part)
      setMessage({ type: 'info', text: `${part.name} added... hmm, will it help a rocket? Press Test Rocket to find out!` }); setCheck(null); return
    }
    if (slot === 'extra') { sfx.bad(); setMessage({ type: 'bad', text: `The ${part.name} belongs in the ${SLOT_LABEL[part.slot].toLowerCase()}, not in the extras box.` }); return }
    if (part.slot !== slot) {
      sfx.bad(); setMessage({ type: 'bad', text: `The ${part.name} does not go there! Try the ${SLOT_LABEL[part.slot].toLowerCase()}.` }); return
    }
    sfx.good(); setSlots((s) => ({ ...s, [slot]: partId })); setInfo(part); setCheck(null)
    setMessage({ type: 'good', text: `Snap! ${part.name} attached. ${part.description}` })
  }
  const clickSlot = (slot) => { if (selected) { tryPlace(selected, slot); setSelected(null) } }
  const removeSlot = (slot) => { sfx.click(); setSlots((s) => { const n = { ...s }; delete n[slot]; return n }); setCheck(null) }
  const reset = () => { sfx.click(); setSlots({}); setExtras([]); setCheck(null); setSelected(null); setInfo(null); setMessage({ type: 'info', text: 'Fresh start! Drag parts into the spots.' }) }

  const test = async () => {
    setBusy(true); setError('')
    try {
      const r = await api.rocketValidate(childId, payload())
      setCheck(r)
      if (r.valid) { sfx.good(); setMessage({ type: 'good', text: 'All systems GO! Your rocket passed every check. Ready to launch!' }) }
      else { sfx.bad(); setMessage({ type: 'bad', text: r.issues[0].message }) }
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }

  const save = async () => {
    setBusy(true)
    try { const r = await api.rocketSave(childId, payload()); setBuilds((b) => [r.build, ...b]); setMessage({ type: 'good', text: `Saved "${r.build.name}" to your rocket collection!` }) }
    catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }

  const launch = async () => {
    setBusy(true); setError('')
    try {
      const r = await api.rocketLaunch(childId, payload())
      setCheck(r.validation); setBuilds((b) => [r.build, ...b])
      if (!r.success) {
        sfx.bad(); setMessage({ type: 'bad', text: `Launch cancelled! ${r.validation.issues[0].message}` }); return
      }
      pendingReward.current = r; setLaunchRes(r)
      setStage('countdown'); setCount(3); sfx.beep()
      const fast = prefersReducedMotion()
      let c = 3
      const tick = setInterval(() => {
        c -= 1
        if (c > 0) { setCount(c); sfx.beep() } else {
          clearInterval(tick); setCount(0); setStage('flying'); sfx.launch()
          setTimeout(() => { setStage('success'); showReward(pendingReward.current, { title: 'Successful launch!' }) }, fast ? 600 : 3200)
        }
      }, fast ? 300 : 900)
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }

  const loadBuild = (b) => {
    const { extras: ex = [], ...rest } = b.components
    setSlots(rest); setExtras(ex); setBodyColor(b.body_color); setAccent(b.accent_color); setName(b.name); setCheck(null)
    setMessage({ type: 'info', text: `Loaded "${b.name}".` })
  }
  const backToBuild = () => { setStage('build'); setLaunchRes(null) }

  const msgStyle = { good: 'bg-mint/20 text-mint', bad: 'bg-blush/20 text-blush', info: 'bg-white/10' }[message.type]
  const launching = stage === 'countdown' || stage === 'flying'

  return (
    <div>
      <PageTitle icon={FlaskConical} title="Rocket Lab" subtitle="Build it. Test it. Launch it!" />
      <ErrorBox message={error} />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr_1fr]">
        {/* Parts palette */}
        <section className="card order-2 lg:order-1" aria-label="Rocket components">
          <h2 className="mb-2 text-2xl font-black">Components</h2>
          <div className="grid grid-cols-2 gap-2">
            {catalog.parts.map((p) => {
              const used = placedIds.has(p.id)
              return (
                <button key={p.id} draggable={!used && !launching} disabled={launching}
                  onDragStart={(e) => { setDrag(p.id); e.dataTransfer.setData('text/plain', p.id); e.dataTransfer.effectAllowed = 'move'; setInfo(p) }}
                  onDragEnd={() => { setDrag(null); setOverSlot(null) }}
                  onClick={() => { sfx.click(); setInfo(p); if (!used) setSelected(selected === p.id ? null : p.id) }}
                  aria-pressed={selected === p.id} aria-label={`${p.name}${used ? ' (in rocket)' : ''}`}
                  className={`rounded-2xl border-2 p-3 text-center text-base font-extrabold transition ${used ? 'border-white/10 bg-white/5 opacity-40' : selected === p.id ? 'border-star bg-star/25' : 'cursor-grab border-white/25 bg-white/10 hover:bg-white/20'}`}>
                  <MiniPart part={p} accent={accent} body={bodyColor} />
                  {p.name}
                </button>
              )
            })}
          </div>
          <div className="mt-4 space-y-3">
            <div><p className="label">Rocket body colour</p><div className="flex flex-wrap gap-2">{BODY_COLORS.map((c) => <Swatch key={c} c={c} on={bodyColor === c} set={setBodyColor} />)}</div></div>
            <div><p className="label">Accent colour (nose, fins, tank)</p><div className="flex flex-wrap gap-2">{ACCENT_COLORS.map((c) => <Swatch key={c} c={c} on={accent === c} set={setAccent} />)}</div></div>
            <div><label className="label" htmlFor="rname">Rocket name</label><input id="rname" className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} /></div>
          </div>
        </section>

        {/* Assembly */}
        <section className="card order-1 lg:order-2" aria-label="Rocket assembly area">
          <div className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="space-y-2">
              {catalog.slots.map((slot) => {
                const pid = slots[slot]; const part = pid && partById[pid]
                return (
                  <div key={slot} onDragOver={(e) => { e.preventDefault(); setOverSlot(slot) }} onDragLeave={() => setOverSlot(null)}
                    onDrop={(e) => { e.preventDefault(); setOverSlot(null); tryPlace(e.dataTransfer.getData('text/plain') || drag, slot) }}
                    onClick={() => clickSlot(slot)} role="button" tabIndex={0} aria-label={SLOT_LABEL[slot]}
                    onKeyDown={(e) => { if (e.key === 'Enter' && selected) clickSlot(slot) }}
                    className={`flex min-h-[3.6rem] items-center justify-between gap-2 rounded-2xl border-4 border-dashed px-3 py-2 transition ${part ? 'border-mint/70 bg-mint/10' : overSlot === slot || (selected && partById[selected]?.slot === slot) ? 'border-star bg-star/15' : 'border-white/25 bg-white/5'}`}>
                    <span className="text-base font-extrabold">{part ? <span className="flex items-center gap-1 text-mint"><Check className="h-5 w-5" />{part.name}</span> : <span className="text-white/70">{SLOT_LABEL[slot]}</span>}</span>
                    {part && !launching && <button className="rounded-full bg-white/15 p-1" aria-label={`Remove ${part.name}`} onClick={(e) => { e.stopPropagation(); removeSlot(slot) }}><X className="h-4 w-4" /></button>}
                  </div>
                )
              })}
              <div onDragOver={(e) => { e.preventDefault(); setOverSlot('extra') }} onDragLeave={() => setOverSlot(null)}
                onDrop={(e) => { e.preventDefault(); setOverSlot(null); tryPlace(e.dataTransfer.getData('text/plain') || drag, 'extra') }}
                onClick={() => clickSlot('extra')} role="button" tabIndex={0} aria-label="Extra parts box"
                className={`rounded-2xl border-4 border-dashed px-3 py-2 ${overSlot === 'extra' ? 'border-star bg-star/15' : 'border-white/15 bg-white/5'}`}>
                <p className="text-sm font-extrabold text-white/70">Extra parts box (try wheels or a propeller!)</p>
                <div className="flex flex-wrap gap-1">{extras.map((id) => <span key={id} className="flex items-center gap-1 rounded-full bg-blush/25 px-2 py-0.5 text-sm font-extrabold text-blush">{partById[id].name}<button aria-label={`Remove ${partById[id].name}`} onClick={(e) => { e.stopPropagation(); setExtras((x) => x.filter((i) => i !== id)); setCheck(null) }}><X className="h-3 w-3" /></button></span>)}</div>
              </div>
            </div>
            <div className="relative h-72 w-32 sm:h-80 sm:w-36">
              <motion.div className="h-full w-full" animate={stage === 'flying' ? { y: '-140%' } : { y: 0 }} transition={{ duration: 3, ease: 'easeIn' }}>
                <RocketSVG parts={slots} bodyColor={bodyColor} accentColor={accent} flame={stage === 'flying' || stage === 'countdown'} className="h-full w-full" />
              </motion.div>
              {stage === 'countdown' && <div className="absolute inset-0 grid place-items-center"><AnimatePresence mode="wait"><motion.span key={count} initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="text-7xl font-black text-star drop-shadow">{count}</motion.span></AnimatePresence></div>}
            </div>
          </div>
          <p className={`mt-3 rounded-2xl p-3 text-center text-lg font-extrabold ${msgStyle}`} aria-live="polite">{message.text}</p>
          {check && (
            <ul className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3" aria-label="Checklist">
              {check.checklist.map((c) => <li key={c.slot} className={`flex items-center gap-1 rounded-xl px-2 py-1 text-sm font-extrabold ${c.ok ? 'bg-mint/20 text-mint' : 'bg-blush/20 text-blush'}`}>{c.ok ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}{c.label}</li>)}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button className="btn btn-ghost" onClick={reset} disabled={launching}><RotateCcw className="h-5 w-5" />Reset</button>
            <button className="btn btn-blue" onClick={test} disabled={busy || launching}><ShieldCheck className="h-5 w-5" />Test Rocket</button>
            <button className="btn btn-mint" onClick={save} disabled={busy || launching}><Save className="h-5 w-5" />Save</button>
            <button className="btn btn-yellow" onClick={launch} disabled={busy || launching}>{busy ? <Spinner /> : <Rocket className="h-6 w-6" />}Launch Rocket</button>
          </div>
        </section>

        {/* Info */}
        <section className="card order-3" aria-label="Component information">
          <h2 className="mb-2 flex items-center gap-2 text-2xl font-black"><Info className="h-6 w-6 text-planet" />Part info</h2>
          {info ? (
            <div className="space-y-2"><div className="mx-auto h-28 w-28"><MiniPart part={info} accent={accent} body={bodyColor} big /></div>
              <h3 className="text-2xl font-black text-star">{info.name}</h3>
              <p className="text-lg font-bold">{info.description}</p>
              <p className="text-base font-extrabold text-white/70">{info.essential ? 'Every real rocket needs this part.' : 'Not needed for a rocket - a trick part!'}</p></div>
          ) : <p className="text-lg font-bold text-white/80">Tap or drag a component to learn what it does.</p>}
          <h3 className="mb-1 mt-5 text-xl font-black">My rockets</h3>
          {builds.length === 0 ? <p className="text-base font-bold text-white/60">No saved rockets yet.</p> : (
            <ul className="space-y-1">{builds.slice(0, 5).map((b) => (
              <li key={b.id}><button onClick={() => loadBuild(b)} className="flex w-full items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-left text-base font-extrabold hover:bg-white/20">
                <span>{b.name}</span><span className={b.launch_success ? 'text-mint' : b.is_valid ? 'text-planet' : 'text-white/50'}>{b.launch_success ? 'Launched' : b.is_valid ? 'Ready' : 'Unfinished'}</span></button></li>))}</ul>
          )}
        </section>
      </div>

      <AnimatePresence>
        {stage === 'success' && launchRes && (
          <motion.div className="fixed inset-0 z-40 grid place-items-center bg-navy-900/85 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true">
            <motion.div initial={{ scale: 0.7 }} animate={{ scale: 1 }} className="card max-w-md text-center">
              <h2 className="text-4xl font-black text-star">Liftoff!</h2>
              <p className="my-2 text-xl font-bold">{name} reached space safely. Mission control is cheering!</p>
              <p className="text-2xl font-extrabold text-mint">{launchRes.xp_earned > 0 ? `+${launchRes.xp_earned} XP` : 'Great launch! (XP for launching is earned once.)'}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-3"><button className="btn btn-yellow" onClick={backToBuild}><Rocket className="h-5 w-5" />Build another</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Swatch({ c, on, set }) {
  return <button aria-label={`Colour ${c}`} aria-pressed={on} onClick={() => { sfx.click(); set(c) }} className={`grid h-10 w-10 place-items-center rounded-full border-4 ${on ? 'scale-110 border-white' : 'border-white/20'}`} style={{ background: c }}>{on && <Check className="h-5 w-5 text-navy" />}</button>
}

function MiniPart({ part, accent, body, big = false }) {
  const size = big ? 110 : 56
  const only = { [part.slot]: part.id }
  if (part.slot === 'extra') {
    return (
      <svg viewBox="0 0 80 80" width={size} height={size} className="mx-auto mb-1" aria-hidden="true">
        {part.id === 'wheels'
          ? <><circle cx="40" cy="40" r="26" fill="#2B2F45" stroke="#101C3D" strokeWidth="4" /><circle cx="40" cy="40" r="10" fill="#9AA6C8" /></>
          : <><rect x="36" y="30" width="8" height="40" fill="#9AA6C8" /><ellipse cx="40" cy="26" rx="34" ry="7" fill="#FF8A65" stroke="#101C3D" strokeWidth="3" /></>}
      </svg>
    )
  }
  const viewBoxes = { nose: '30 0 100 130', body: '30 100 100 130', fuel: '30 190 100 110', engine: '30 270 100 60', fins: '0 220 160 100' }
  return (
    <div className="mx-auto mb-1" style={{ width: size, height: size }} aria-hidden="true">
      <RocketSVG parts={only} bodyColor={body} accentColor={accent} ghost={false} viewBox={viewBoxes[part.slot]} width={size} height={size} className="mx-auto" />
    </div>
  )
}

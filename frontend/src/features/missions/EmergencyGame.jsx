import { useState } from 'react'
import { AlertTriangle, ArrowRight, Check, Gauge, Link2, Siren, Trash2, X } from 'lucide-react'
import { api, errorMessage } from '../../services/api'
import { sfx } from '../../utils/sound'
import { ErrorBox } from '../../components/ui'

const ICONS = { alarm: Siren, gauge: Gauge, tether: Link2, debris: Trash2 }

export default function EmergencyGame({ config, childId, code, onComplete }) {
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const sc = config.scenarios[i]
  const Icon = ICONS[sc.icon] || AlertTriangle

  const pick = async (opt) => {
    if (result || busy) return
    setBusy(true); setError('')
    try {
      const r = await api.missionCheck(childId, code, { scenario_id: sc.id, option_id: opt.id })
      r.correct ? sfx.good() : sfx.bad()
      setAnswers((a) => ({ ...a, [sc.id]: opt.id }))
      setResult({ ...r, picked: opt.id })
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  const next = () => {
    if (i + 1 < config.scenarios.length) { setI(i + 1); setResult(null) } else onComplete({ answers })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2" aria-label="Progress">
        {config.scenarios.map((s, n) => <span key={s.id} className={`h-3 flex-1 rounded-full ${n < i || (n === i && result) ? 'bg-mint' : n === i ? 'bg-star' : 'bg-white/20'}`} />)}
      </div>
      <div className="card border-blush/50 bg-gradient-to-br from-blush/15 to-transparent">
        <div className="flex items-center gap-3">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-blush text-navy shadow-chunky animate-wiggle"><Icon className="h-9 w-9" /></span>
          <div><p className="text-base font-extrabold text-blush">Emergency {i + 1} of {config.scenarios.length}</p><h2 className="text-3xl font-black">{sc.title}</h2></div>
        </div>
        <p className="mt-3 text-xl font-bold leading-snug">{sc.story}</p>
        <p className="mt-2 text-lg font-extrabold text-star">What should a well-trained astronaut do?</p>
      </div>
      <ErrorBox message={error} />
      <div className="grid gap-3">
        {sc.options.map((o) => {
          const isPick = result?.picked === o.id, isRight = result && result.correct_option === o.id
          return (
            <button key={o.id} onClick={() => pick(o)} disabled={!!result || busy} aria-pressed={isPick}
              className={`flex items-center gap-3 rounded-2xl border-4 p-4 text-left text-lg font-extrabold transition ${isRight ? 'border-mint bg-mint/20' : isPick ? 'border-blush bg-blush/20' : 'border-white/20 bg-white/10 hover:bg-white/20'} disabled:cursor-default`}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20 text-xl font-black">{o.id.toUpperCase()}</span>
              <span className="flex-1">{o.text}</span>
              {isRight && <Check className="h-8 w-8 text-mint" />}{isPick && !isRight && <X className="h-8 w-8 text-blush" />}
            </button>
          )
        })}
      </div>
      {result && (
        <div className={`card ${result.correct ? 'border-mint/60' : 'border-blush/60'}`} aria-live="polite">
          <p className={`text-2xl font-black ${result.correct ? 'text-mint' : 'text-blush'}`}>{result.correct ? 'Safe choice! Well done!' : 'Not the safest choice.'}</p>
          <p className="mt-1 text-lg font-bold">{result.explanation}</p>
          <button className="btn btn-yellow mt-3" onClick={next}>{i + 1 < config.scenarios.length ? 'Next emergency' : 'Finish mission'}<ArrowRight className="h-6 w-6" /></button>
        </div>
      )}
    </div>
  )
}

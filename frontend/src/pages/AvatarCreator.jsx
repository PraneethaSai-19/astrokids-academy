import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Save } from 'lucide-react'
import { useApp } from '../context/AuthContext'
import { api, errorMessage } from '../services/api'
import SpaceBackground from '../components/SpaceBackground'
import Astronaut, { ACCESSORIES, BACKPACKS, DEFAULT_AVATAR, HELMETS, SUIT_COLORS, VISOR_COLORS } from '../components/Astronaut'
import { ErrorBox, Spinner } from '../components/ui'
import { sfx } from '../utils/sound'

function Swatches({ label, value, options, onChange }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-3">
        {options.map((c) => (
          <button key={c} type="button" onClick={() => { sfx.click(); onChange(c) }} aria-label={`${label} ${c}`} aria-pressed={value === c}
            className={`grid h-12 w-12 place-items-center rounded-full border-4 transition ${value === c ? 'scale-110 border-white' : 'border-white/20'}`} style={{ background: c }}>
            {value === c && <Check className="h-6 w-6 text-navy" />}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
function Choices({ label, value, options, onChange }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => { sfx.click(); onChange(o.id) }}
            className={`btn !min-h-[44px] !px-4 !py-2 !text-base ${value === o.id ? 'btn-yellow' : 'btn-ghost'}`}>{o.label}</button>
        ))}
      </div>
    </fieldset>
  )
}

export default function AvatarCreator() {
  const { profile, childId, refreshProfile } = useApp()
  const navigate = useNavigate()
  const [av, setAv] = useState(profile?.avatar || DEFAULT_AVATAR)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (v) => setAv((a) => ({ ...a, [k]: v }))

  const save = async () => {
    setBusy(true); setError('')
    try { await api.saveAvatar(childId, av); await refreshProfile(); sfx.good(); navigate('/home') }
    catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }

  return (
    <div className="relative min-h-screen px-4 py-8">
      <SpaceBackground />
      <div className="mx-auto max-w-5xl">
        <h1 className="text-center text-4xl font-black text-star">Design your astronaut!</h1>
        <p className="mb-6 text-center text-xl font-bold text-planet">{profile ? `Looking good, ${profile.nickname}!` : ''}</p>
        <div className="grid gap-6 md:grid-cols-[1fr_1.3fr]">
          <div className="card flex flex-col items-center justify-center bg-navy-700/60">
            <div className="grid h-80 w-full place-items-center rounded-3xl" style={{ background: 'radial-gradient(circle, rgba(201,155,250,.35), transparent 70%)' }}>
              <Astronaut avatar={av} size={260} float />
            </div>
            <p className="text-2xl font-black">{profile?.nickname}</p>
          </div>
          <div className="card space-y-5">
            <Swatches label="Suit colour" value={av.suit_color} options={SUIT_COLORS} onChange={set('suit_color')} />
            <Choices label="Helmet" value={av.helmet_style} options={HELMETS} onChange={set('helmet_style')} />
            <Swatches label="Visor colour" value={av.visor_color} options={VISOR_COLORS} onChange={set('visor_color')} />
            <Choices label="Backpack" value={av.backpack_style} options={BACKPACKS} onChange={set('backpack_style')} />
            <Choices label="Accessory" value={av.accessory} options={ACCESSORIES} onChange={set('accessory')} />
            <ErrorBox message={error} />
            <button className="btn btn-yellow w-full" onClick={save} disabled={busy}>{busy ? <Spinner /> : <Save className="h-6 w-6" />} Save astronaut</button>
          </div>
        </div>
      </div>
    </div>
  )
}

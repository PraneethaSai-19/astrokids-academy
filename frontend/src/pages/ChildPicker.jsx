import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Plus } from 'lucide-react'
import { useApp } from '../context/AuthContext'
import { errorMessage } from '../services/api'
import SpaceBackground from '../components/SpaceBackground'
import Astronaut from '../components/Astronaut'
import { ErrorBox } from '../components/ui'

export default function ChildPicker() {
  const { kids, parent, setChildId, addChild, logout } = useApp()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(kids.length === 0)
  const [nick, setNick] = useState('')
  const [age, setAge] = useState('6-8')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const choose = (k) => { setChildId(k.id); navigate(k.has_avatar ? '/home' : '/avatar') }
  const create = async (e) => {
    e.preventDefault(); setError('')
    if (!/^[A-Za-z0-9 _-]{2,20}$/.test(nick.trim())) return setError('Nickname: 2-20 letters, numbers, spaces, - or _.')
    setBusy(true)
    try { await addChild(nick.trim(), age); navigate('/avatar') } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-8">
      <SpaceBackground />
      <div className="w-full max-w-3xl text-center">
        <h1 className="text-4xl font-black text-star md:text-5xl">Who is training today?</h1>
        <p className="mt-1 text-xl font-bold text-planet">Hi {parent?.display_name}! Pick an astronaut.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          {kids.map((k) => (
            <button key={k.id} onClick={() => choose(k)} className="card w-48 transition hover:scale-105 hover:bg-white/20" aria-label={`Play as ${k.nickname}`}>
              <div className="mx-auto h-32 w-32 overflow-hidden"><Astronaut avatar={k.avatar} size={120} /></div>
              <p className="text-2xl font-black">{k.nickname}</p>
              <p className="text-base font-extrabold text-star">{k.level?.level_name} · {k.total_xp} XP</p>
            </button>
          ))}
          {!adding && kids.length < 6 && (
            <button onClick={() => setAdding(true)} className="card grid w-48 place-items-center border-dashed text-planet hover:bg-white/20">
              <Plus className="h-12 w-12" /><span className="text-xl font-black">Add astronaut</span>
            </button>
          )}
        </div>
        {adding && (
          <form onSubmit={create} className="card mx-auto mt-6 max-w-md space-y-3 text-left">
            <h2 className="text-2xl font-black">New astronaut</h2>
            <ErrorBox message={error} />
            <div><label className="label" htmlFor="nn">Astronaut nickname</label>
              <input id="nn" className="input" value={nick} onChange={(e) => setNick(e.target.value)} maxLength={20} placeholder="e.g. StarKid" /></div>
            <div><label className="label" htmlFor="ag">Age group</label>
              <select id="ag" className="input" value={age} onChange={(e) => setAge(e.target.value)}>
                <option value="6-8">6 - 8 years</option><option value="9-10">9 - 10 years</option></select></div>
            <button className="btn btn-yellow w-full" disabled={busy}>Create astronaut</button>
          </form>
        )}
        <button className="btn btn-ghost mt-8" onClick={async () => { await logout(); navigate('/') }}><LogOut className="h-5 w-5" /> Log out</button>
      </div>
    </div>
  )
}

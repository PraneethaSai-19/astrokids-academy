import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Check, ShieldCheck, X } from 'lucide-react'
import { useApp } from '../context/AuthContext'
import { errorMessage } from '../services/api'
import SpaceBackground from '../components/SpaceBackground'
import AstroBotMascot from '../components/AstroBotMascot'
import { ErrorBox, Spinner } from '../components/ui'

const rules = (pw) => [
  { ok: pw.length >= 8, text: 'At least 8 characters' },
  { ok: /[A-Za-z]/.test(pw), text: 'Has a letter' },
  { ok: /\d/.test(pw), text: 'Has a number' },
]

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register'
  const { login, register } = useApp()
  const navigate = useNavigate()
  const loc = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [age, setAge] = useState('6-8')
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const pwRules = rules(password)
  const nickOk = /^[A-Za-z0-9 _-]{2,20}$/.test(nickname)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (isRegister) {
      if (!pwRules.every((r) => r.ok)) return setError('Please choose a stronger password (see the checklist).')
      if (nickname && !nickOk) return setError('Astronaut nickname: 2-20 letters, numbers, spaces, - or _.')
      if (!agree) return setError('A parent or guardian needs to tick the box to create the account.')
    }
    setBusy(true)
    try {
      if (isRegister) {
        await register({
          email, password, display_name: name || 'Parent', accept_parent_terms: agree,
          child: nickname ? { nickname: nickname.trim(), age_group: age } : null,
        })
      } else await login(email, password)
      navigate(loc.state?.from && loc.state.from !== '/' ? loc.state.from : '/who', { replace: true })
    } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-8">
      <SpaceBackground />
      <div className="grid w-full max-w-4xl items-center gap-6 md:grid-cols-[1fr_1.2fr]">
        <div className="hidden flex-col items-center text-center md:flex">
          <AstroBotMascot size={200} talking />
          <h2 className="mt-3 text-3xl font-black text-star">{isRegister ? 'Join the Academy!' : 'Welcome back!'}</h2>
          <p className="mt-2 text-lg font-bold text-planet">
            {isRegister ? 'A grown-up creates the account. Then your astronaut can start training!' : 'Ready for your next mission, cadet?'}
          </p>
        </div>
        <form onSubmit={submit} className="card space-y-4" noValidate>
          <h1 className="text-3xl font-black">{isRegister ? 'Parent sign-up' : 'Parent login'}</h1>
          <p className="flex items-start gap-2 rounded-2xl bg-mint/15 p-3 text-base font-bold text-mint">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0" />
            Accounts are managed by a parent or guardian. We only store an email and a nickname — never a child's real name, photo or school.
          </p>
          <ErrorBox message={error} />
          {isRegister && (
            <div><label className="label" htmlFor="name">Your name (parent)</label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" placeholder="e.g. Sam" /></div>
          )}
          <div><label className="label" htmlFor="email">Parent email</label>
            <input id="email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="parent@example.com" /></div>
          <div><label className="label" htmlFor="pw">Password</label>
            <input id="pw" type="password" className="input" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder="Password" />
            {isRegister && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {pwRules.map((r) => (
                  <li key={r.text} className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-extrabold ${r.ok ? 'bg-mint/25 text-mint' : 'bg-white/10 text-white/70'}`}>
                    {r.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}{r.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {isRegister && (
            <>
              <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
                <div><label className="label" htmlFor="nick">Astronaut nickname</label>
                  <input id="nick" className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} placeholder="e.g. StarKid (not a real name)" /></div>
                <div><label className="label" htmlFor="age">Age group</label>
                  <select id="age" className="input" value={age} onChange={(e) => setAge(e.target.value)}>
                    <option value="6-8">6 - 8 years</option><option value="9-10">9 - 10 years</option>
                  </select></div>
              </div>
              <label className="flex cursor-pointer items-start gap-3 text-base font-bold">
                <input type="checkbox" className="mt-1 h-6 w-6 accent-star" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                I am a parent or guardian and I will manage this account for my child.
              </label>
            </>
          )}
          <button className="btn btn-yellow w-full" disabled={busy} type="submit">
            {busy ? <Spinner /> : null}{isRegister ? 'Create account' : 'Log in'}
          </button>
          <p className="text-center text-base font-bold">
            {isRegister ? <>Already registered? <Link className="text-planet underline" to="/login">Log in</Link></>
              : <>New here? <Link className="text-planet underline" to="/register">Create a parent account</Link></>}
          </p>
        </form>
      </div>
    </div>
  )
}

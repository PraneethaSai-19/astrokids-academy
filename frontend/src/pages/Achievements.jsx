import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Award, Check, Lock, ScrollText } from 'lucide-react'
import { useApp } from '../context/AuthContext'
import { api, errorMessage } from '../services/api'
import { BadgeMedal, ErrorBox, Loading, PageTitle, XPBar } from '../components/ui'

export default function Achievements() {
  const { childId, profile } = useApp()
  const [badges, setBadges] = useState(null)
  const [progress, setProgress] = useState([])
  const [xp, setXp] = useState([])
  const [cert, setCert] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.badges(childId), api.missionProgress(childId), api.xpHistory(childId), api.certStatus(childId)])
      .then(([b, p, x, c]) => { setBadges(b); setProgress(p); setXp(x); setCert(c) }).catch((e) => setError(errorMessage(e)))
  }, [childId])

  if (!badges) return error ? <ErrorBox message={error} /> : <Loading text="Polishing the trophies..." />
  const earned = badges.filter((b) => b.earned)
  const done = progress.filter((p) => p.completed).length

  return (
    <div className="space-y-6">
      <PageTitle icon={Award} title="Trophy Room" subtitle={`${earned.length} of ${badges.length} badges earned`} />
      <section className="card"><XPBar level={profile?.level} /></section>

      <section className="card flex flex-wrap items-center justify-between gap-4 border-star/50">
        <div className="flex items-center gap-3"><ScrollText className="h-12 w-12 text-star" />
          <div><h2 className="text-2xl font-black">Junior Astronaut Certificate</h2>
            <p className="text-lg font-bold text-white/80">{cert?.eligible ? 'You did it! Your certificate is ready.' : `Finish all ${cert?.missions_required} missions to unlock it (${cert?.missions_completed} done).`}</p></div></div>
        <Link to="/certificate" className={`btn ${cert?.eligible ? 'btn-yellow' : 'btn-ghost'}`}>{cert?.eligible ? 'Get my certificate' : 'View progress'}</Link>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-black">Badges</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {badges.map((b, i) => (
            <motion.div key={b.code} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
              className={`card flex flex-col items-center text-center ${b.earned ? '' : 'opacity-80'}`}>
              <BadgeMedal badge={b} locked={!b.earned} big />
              <h3 className="mt-2 text-lg font-black leading-tight">{b.name}</h3>
              {b.earned ? <p className="mt-1 flex items-center gap-1 text-sm font-extrabold text-mint"><Check className="h-4 w-4" />Earned! +{b.xp_bonus} XP</p>
                : <p className="mt-1 flex items-start gap-1 text-sm font-bold text-white/70"><Lock className="mt-0.5 h-4 w-4 shrink-0" />{b.how_to_earn}</p>}
            </motion.div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 text-2xl font-black">Missions {done}/{progress.length}</h2>
          <ul className="space-y-3">{progress.map((p) => (
            <li key={p.code}>
              <div className="flex justify-between text-base font-extrabold"><span className="flex items-center gap-1">{p.completed && <Check className="h-5 w-5 text-mint" />}{p.title}</span><span className="text-star">{p.xp_awarded}/{p.xp_reward} XP</span></div>
              <div className="mt-1 h-3 overflow-hidden rounded-full bg-navy-900/70"><div className={`h-full rounded-full ${p.completed ? 'bg-mint' : 'bg-planet'}`} style={{ width: p.completed ? '100%' : `${Math.min(90, p.best_score)}%` }} /></div>
              <p className="text-sm font-bold text-white/60">{p.attempts ? `${p.attempts} attempt${p.attempts > 1 ? 's' : ''} · best score ${p.best_score}` : 'Not played yet'}</p>
            </li>))}</ul>
        </section>
        <section className="card">
          <h2 className="mb-3 text-2xl font-black">XP history</h2>
          {xp.length === 0 ? <p className="text-lg font-bold text-white/70">Earn XP by playing missions, exploring planets and launching rockets.</p> : (
            <ul className="max-h-80 divide-y divide-white/10 overflow-y-auto">{xp.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 py-2 text-base font-bold"><span>{e.description}</span><span className="font-black text-star">+{e.amount}</span></li>))}</ul>
          )}
        </section>
      </div>
    </div>
  )
}

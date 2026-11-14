import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, Check, Gamepad2, Play, Star, History } from 'lucide-react'
import { useApp } from '../context/AuthContext'
import { api, errorMessage } from '../services/api'
import { ErrorBox, Loading, PageTitle } from '../components/ui'
import QuizPlayer from '../features/missions/QuizPlayer'

export default function MissionsPage() {
  const { childId } = useApp()
  const [missions, setMissions] = useState(null)
  const [progress, setProgress] = useState({})
  const [quizzes, setQuizzes] = useState([])
  const [best, setBest] = useState({})
  const [history, setHistory] = useState([])
  const [quizSlug, setQuizSlug] = useState(null)
  const [error, setError] = useState('')

  const load = () => Promise.all([api.missions(), api.missionProgress(childId), api.quizzes(), api.quizBest(childId), api.missionHistory(childId)])
    .then(([m, p, q, b, h]) => { setMissions(m); setProgress(Object.fromEntries(p.map((x) => [x.code, x]))); setQuizzes(q); setBest(b); setHistory(h) })
    .catch((e) => setError(errorMessage(e)))
  useEffect(() => { load() }, [childId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!missions) return error ? <ErrorBox message={error} onRetry={load} /> : <Loading text="Loading missions..." />
  const done = Object.values(progress).filter((p) => p.completed).length

  if (quizSlug) return (<div><PageTitle icon={Brain} title="Space Quiz" /><QuizPlayer slug={quizSlug} onClose={() => setQuizSlug(null)} onDone={load} /></div>)

  return (
    <div className="space-y-8">
      <PageTitle icon={Gamepad2} title="Training Missions" subtitle={`${done} of ${missions.length} missions complete`} />
      <ErrorBox message={error} />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {missions.map((m, i) => {
          const p = progress[m.code]
          return (
            <motion.article key={m.code} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="card flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <span className="grid h-14 w-14 place-items-center rounded-2xl text-2xl font-black text-navy shadow-chunky" style={{ background: m.color }}>{m.order_index}</span>
                {p?.completed
                  ? <span className="flex items-center gap-1 rounded-full bg-mint/25 px-3 py-1 text-base font-extrabold text-mint"><Check className="h-5 w-5" />Complete</span>
                  : <span className="rounded-full bg-white/10 px-3 py-1 text-base font-extrabold">{m.difficulty}</span>}
              </div>
              <h2 className="mt-3 text-2xl font-black">{m.title}</h2>
              <p className="mt-1 flex-1 text-lg font-bold text-white/85">{m.short_description}</p>
              <div className="mt-3 flex items-center justify-between text-base font-extrabold">
                <span className="flex items-center gap-1 text-star"><Star className="h-5 w-5 fill-star" />{m.xp_reward} XP</span>
                <span className="text-white/70">{p?.attempts ? `Best score ${p.best_score} · ${p.attempts} play${p.attempts > 1 ? 's' : ''}` : 'Not played yet'}</span>
              </div>
              <Link to={`/missions/${m.code}`} className="btn btn-yellow mt-4"><Play className="h-6 w-6" />{p?.completed ? 'Play again' : 'Start mission'}</Link>
            </motion.article>
          )
        })}
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-2xl font-black"><Brain className="h-7 w-7 text-galaxy" />Space Quizzes</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {quizzes.map((q) => (
            <div key={q.slug} className="card flex items-center gap-4">
              <div className="flex-1"><h3 className="text-xl font-black">{q.title}</h3><p className="text-base font-bold text-white/80">{q.description}</p>
                <p className="text-sm font-extrabold text-planet">{q.question_count} questions · up to {q.question_count * q.xp_per_correct} XP · {best[q.slug] ? `best ${best[q.slug].best_percent}%` : 'not played'}</p></div>
              <button className="btn btn-purple" onClick={() => setQuizSlug(q.slug)}><Play className="h-5 w-5" />Play</button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-2xl font-black"><History className="h-7 w-7 text-planet" />Mission history</h2>
        {history.length === 0 ? <p className="text-lg font-bold text-white/70">Your mission log is empty. Play a mission to start it!</p> : (
          <ul className="card divide-y divide-white/10 !p-2">
            {history.slice(0, 8).map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-base font-bold">
                <span>{h.mission_title}</span>
                <span className={h.success ? 'text-mint' : 'text-blush'}>{h.success ? 'Success' : 'Try again'} · score {h.score}{h.xp_earned ? ` · +${h.xp_earned} XP` : ''}</span>
                <span className="text-sm text-white/60">{new Date(h.created_at + 'Z').toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

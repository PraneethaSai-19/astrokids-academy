import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Play, RotateCcw, Star, Trophy, Info, Frown } from 'lucide-react'
import { useApp } from '../context/AuthContext'
import { api, errorMessage } from '../services/api'
import { ErrorBox, Loading, Spinner } from '../components/ui'
import ZeroGravityGame from '../features/missions/ZeroGravityGame'
import NavigationGame from '../features/missions/NavigationGame'
import EquipmentGame from '../features/missions/EquipmentGame'
import MoonLandingGame from '../features/missions/MoonLandingGame'
import EmergencyGame from '../features/missions/EmergencyGame'
import { sfx } from '../utils/sound'

const GAMES = {
  zero_gravity: ZeroGravityGame, space_navigation: NavigationGame, equipment_expert: EquipmentGame,
  moon_landing: MoonLandingGame, emergency_rescue: EmergencyGame,
}

export default function MissionPlay() {
  const { code } = useParams()
  const { childId, showReward } = useApp()
  const [mission, setMission] = useState(null)
  const [stage, setStage] = useState('intro')   // intro | play | submitting | result
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { setMission(null); setStage('intro'); api.mission(code).then(setMission).catch((e) => setError(errorMessage(e))) }, [code])

  const submit = async (data) => {
    setStage('submitting'); setError('')
    try {
      const r = await api.missionComplete(childId, code, data)
      setResult(r); setStage('result')
      r.success ? sfx.win() : sfx.bad()
      if (r.success) showReward(r, { title: `${mission.title} complete!` })
    } catch (e) { setError(errorMessage(e)); setStage('result'); setResult(null) }
  }

  if (!mission) return error ? <ErrorBox message={error} /> : <Loading text="Preparing mission..." />
  const Game = GAMES[code]

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/missions" className="mb-3 inline-flex items-center gap-1 text-lg font-extrabold text-planet"><ArrowLeft className="h-5 w-5" />All missions</Link>
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-2xl text-2xl font-black text-navy shadow-chunky" style={{ background: mission.color }}>{mission.order_index}</span>
        <div><h1 className="text-3xl font-black md:text-4xl">{mission.title}</h1><p className="flex items-center gap-1 text-lg font-extrabold text-star"><Star className="h-5 w-5 fill-star" />{mission.xp_reward} XP reward</p></div>
      </div>

      {stage === 'intro' && (
        <div className="card space-y-4">
          <h2 className="flex items-center gap-2 text-2xl font-black"><Info className="h-6 w-6 text-planet" />How to play</h2>
          <ol className="list-decimal space-y-2 pl-6 text-xl font-bold">{mission.instructions.map((t) => <li key={t}>{t}</li>)}</ol>
          <p className="rounded-2xl bg-galaxy/20 p-3 text-lg font-bold"><span className="font-black text-galaxy">What you will learn: </span>{mission.learning_goal}</p>
          <p className="text-sm font-bold text-white/60">A fun training game, not real astronaut training!</p>
          <button className="btn btn-yellow !px-10 !text-2xl" onClick={() => { sfx.click(); setStage('play') }}><Play className="h-7 w-7" />Play</button>
        </div>
      )}

      {stage === 'play' && <Game key={attempt} config={mission.config} childId={childId} code={code} onComplete={submit} />}
      {stage === 'submitting' && <Loading text="Mission Control is checking your result..." />}

      {stage === 'result' && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card space-y-4 text-center" aria-live="polite">
          <ErrorBox message={error} />
          {result && (
            <>
              <div className={`mx-auto grid h-24 w-24 place-items-center rounded-full ${result.success ? 'bg-star text-navy' : 'bg-blush text-navy'}`}>{result.success ? <Trophy className="h-14 w-14" /> : <Frown className="h-14 w-14" />}</div>
              <h2 className={`text-4xl font-black ${result.success ? 'text-star' : 'text-blush'}`}>{result.success ? 'Mission complete!' : 'Mission not complete yet'}</h2>
              <p className="text-xl font-bold">{result.feedback}</p>
              <div className="mx-auto grid max-w-md grid-cols-3 gap-3">
                <div className="rounded-2xl bg-navy-900/50 p-3"><p className="text-3xl font-black text-star">{result.score}</p><p className="text-sm font-extrabold">Score</p></div>
                <div className="rounded-2xl bg-navy-900/50 p-3"><p className="text-3xl font-black text-planet">{result.best_score}</p><p className="text-sm font-extrabold">Best</p></div>
                <div className="rounded-2xl bg-navy-900/50 p-3"><p className="text-3xl font-black text-mint">+{result.xp_earned}</p><p className="text-sm font-extrabold">XP</p></div>
              </div>
              {result.already_rewarded && <p className="text-lg font-bold text-white/70">You already earned the XP for this mission. Great practice!</p>}
              {result.details?.levels && (
                <ul className="mx-auto max-w-md space-y-1 text-left text-base font-bold">{result.details.levels.map((l) => <li key={l.level_id} className={l.reached ? 'text-mint' : 'text-blush'}>{l.destination}: {l.message}</li>)}</ul>
              )}
            </>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <button className="btn btn-yellow" onClick={() => { setAttempt((a) => a + 1); setStage('play') }}><RotateCcw className="h-6 w-6" />{result?.success ? 'Play again' : 'Try again'}</button>
            <Link to="/missions" className="btn btn-ghost">Back to missions</Link>
            {result?.success && result.new_badges?.length === 0 && <Link to="/achievements" className="btn btn-purple">See achievements</Link>}
          </div>
        </motion.div>
      )}
      {stage === 'play' && <div className="mt-4 text-center"><button className="btn btn-ghost !min-h-[44px] !text-base" onClick={() => setStage('intro')}>Quit mission</button></div>}
    </div>
  )
}

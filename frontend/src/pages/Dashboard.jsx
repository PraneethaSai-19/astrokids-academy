import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Award, Bot, CalendarCheck, Gamepad2, Globe2, Rocket, UserRound, Check } from 'lucide-react'
import { useApp } from '../context/AuthContext'
import { api } from '../services/api'
import Astronaut from '../components/Astronaut'
import { BadgeMedal, Loading, XPBar } from '../components/ui'
import NasaPicture from '../components/NasaPicture'

const CARDS = [
  { to: '/planets', title: 'Explore Planets', text: 'Fly through the 3D solar system', icon: Globe2, color: 'bg-planet' },
  { to: '/missions', title: 'Training Missions', text: '5 astronaut games to play', icon: Gamepad2, color: 'bg-galaxy' },
  { to: '/rocket-lab', title: 'Rocket Lab', text: 'Build and launch a rocket', icon: Rocket, color: 'bg-blush' },
  { to: '/astrobot', title: 'AstroBot', text: 'Ask the robot anything about space', icon: Bot, color: 'bg-mint' },
  { to: '/achievements', title: 'Achievements', text: 'Badges, trophies and XP', icon: Award, color: 'bg-star' },
  { to: '/profile', title: 'Profile', text: 'Change your astronaut', icon: UserRound, color: 'bg-planet' },
]

export default function Dashboard() {
  const { profile, childId } = useApp()
  const [badges, setBadges] = useState(null)
  useEffect(() => { if (childId) api.badges(childId).then(setBadges).catch(() => setBadges([])) }, [childId])
  if (!profile) return <Loading text="Loading your academy..." />
  const s = profile.stats, daily = profile.daily
  const earned = (badges || []).filter((b) => b.earned)
  return (
    <div className="space-y-6">
      <section className="card grid items-center gap-4 bg-gradient-to-br from-navy-700/80 to-navy-600/50 md:grid-cols-[auto_1fr]">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto h-48 w-40 overflow-hidden">
          <Astronaut avatar={profile.avatar} size={170} float />
        </motion.div>
        <div>
          <h1 className="text-3xl font-black md:text-4xl">Welcome back, <span className="text-star">{profile.nickname}</span>!</h1>
          <p className="mb-4 text-xl font-bold text-planet">Mission Control is ready. What will you explore today?</p>
          <XPBar level={profile.level} />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['Missions', `${s.missions_completed}/${s.missions_total}`], ['Planets', s.planets_explored], ['Badges', s.badges_earned], ['Rockets', s.rockets_launched]].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-navy-900/50 p-3 text-center"><p className="text-2xl font-black text-star">{v}</p><p className="text-sm font-extrabold">{k}</p></div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className={`card ${daily?.completed ? 'border-mint/60' : 'border-star/60'}`}>
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-star text-navy shadow-chunky">{daily?.completed ? <Check className="h-8 w-8" /> : <CalendarCheck className="h-8 w-8" />}</div>
            <div>
              <p className="text-base font-extrabold text-star">Daily Mission · +{daily?.xp_bonus} bonus XP</p>
              <h2 className="text-2xl font-black">{daily?.title}</h2>
            </div>
          </div>
          <p className="mt-2 text-lg font-bold">{daily?.description}</p>
          <p className={`mt-2 text-lg font-extrabold ${daily?.completed ? 'text-mint' : 'text-white/70'}`}>{daily?.completed ? 'Completed today! Great job!' : 'Not done yet - you can do it!'}</p>
        </section>
        <section className="card">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-2xl font-black">Achievements</h2><Link to="/achievements" className="text-lg font-extrabold text-planet underline">See all</Link></div>
          {!badges ? <Loading text="" /> : earned.length === 0 ? (
            <p className="text-lg font-bold text-white/80">No badges yet. Finish a mission or launch a rocket to earn your first one!</p>
          ) : (
            <div className="flex flex-wrap gap-4">{earned.slice(0, 6).map((b) => (
              <div key={b.code} className="flex w-24 flex-col items-center text-center"><BadgeMedal badge={b} /><span className="mt-1 text-sm font-extrabold leading-tight">{b.name}</span></div>
            ))}</div>
          )}
        </section>
      </div>

      <NasaPicture />

      <section>
        <h2 className="mb-3 text-2xl font-black">Where to next?</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map(({ to, title, text, icon: Icon, color }, i) => (
            <motion.div key={to} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Link to={to} className="card flex items-center gap-4 transition hover:-translate-y-1 hover:bg-white/20">
                <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl ${color} text-navy shadow-chunky`}><Icon className="h-9 w-9" /></span>
                <span><span className="block text-2xl font-black">{title}</span><span className="block text-base font-bold text-white/80">{text}</span></span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}

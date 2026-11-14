import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Palette, Repeat, UserRound, Volume2, Zap } from 'lucide-react'
import { useApp } from '../context/AuthContext'
import Astronaut from '../components/Astronaut'
import { Loading, PageTitle, XPBar } from '../components/ui'

export default function ProfilePage() {
  const { profile, logout, prefs, setPrefs, setChildId } = useApp()
  const navigate = useNavigate()
  if (!profile) return <Loading text="Loading profile..." />
  const s = profile.stats
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageTitle icon={UserRound} title="My Astronaut Profile" />
      <section className="card grid items-center gap-4 md:grid-cols-[auto_1fr]">
        <div className="mx-auto h-56 w-48 overflow-hidden"><Astronaut avatar={profile.avatar} size={200} float /></div>
        <div className="space-y-3">
          <h2 className="text-4xl font-black text-star">{profile.nickname}</h2>
          <p className="text-xl font-extrabold text-planet">{profile.level.level_name} · age group {profile.age_group}</p>
          <XPBar level={profile.level} />
          <div className="flex flex-wrap gap-2">
            <Link to="/avatar" className="btn btn-yellow"><Palette className="h-5 w-5" />Change my astronaut</Link>
            <button className="btn btn-ghost" onClick={() => { setChildId(null); navigate('/who') }}><Repeat className="h-5 w-5" />Switch astronaut</button>
          </div>
        </div>
      </section>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['Missions', `${s.missions_completed}/${s.missions_total}`], ['Planets', `${s.planets_explored}/9`], ['Badges', s.badges_earned], ['Rockets', s.rockets_launched]].map(([k, v]) => (
          <div key={k} className="card text-center !p-3"><p className="text-3xl font-black text-star">{v}</p><p className="text-base font-extrabold">{k}</p></div>))}
      </section>
      <section className="card">
        <h2 className="mb-3 text-2xl font-black">Level ladder</h2>
        <ol className="space-y-2">{profile.levels.map((l) => (
          <li key={l.level} className={`flex items-center justify-between rounded-2xl px-4 py-2 text-lg font-extrabold ${l.level === profile.level.level ? 'bg-star text-navy' : l.level < profile.level.level ? 'bg-mint/20 text-mint' : 'bg-white/10'}`}><span>Level {l.level}: {l.name}</span><span>{l.xp} XP</span></li>))}</ol>
      </section>
      <section className="card space-y-3">
        <h2 className="text-2xl font-black">Settings</h2>
        <label className="flex cursor-pointer items-center justify-between gap-3 text-lg font-extrabold"><span className="flex items-center gap-2"><Volume2 className="h-6 w-6 text-planet" />Sound effects</span><input type="checkbox" role="switch" className="h-7 w-7 accent-star" checked={prefs.sound} onChange={(e) => setPrefs({ sound: e.target.checked })} /></label>
        <label className="flex cursor-pointer items-center justify-between gap-3 text-lg font-extrabold"><span className="flex items-center gap-2"><Zap className="h-6 w-6 text-planet" />Reduce motion (calmer animations)</span><input type="checkbox" role="switch" className="h-7 w-7 accent-star" checked={prefs.reduceMotion} onChange={(e) => setPrefs({ reduceMotion: e.target.checked })} /></label>
      </section>
      <div className="text-center"><button className="btn btn-pink" onClick={async () => { await logout(); navigate('/') }}><LogOut className="h-5 w-5" />Log out</button></div>
    </div>
  )
}

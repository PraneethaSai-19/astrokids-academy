import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Award, Bot, Globe2, Home, Rocket, Shield, UserRound, Volume2, VolumeX, Gamepad2 } from 'lucide-react'
import { useApp } from '../context/AuthContext'
import SpaceBackground from './SpaceBackground'
import Astronaut from './Astronaut'
import RewardModal from './RewardModal'

export const NAV = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/planets', label: 'Explore Planets', short: 'Planets', icon: Globe2 },
  { to: '/missions', label: 'Training Missions', short: 'Missions', icon: Gamepad2 },
  { to: '/rocket-lab', label: 'Rocket Lab', short: 'Rocket', icon: Rocket },
  { to: '/astrobot', label: 'AstroBot', icon: Bot },
  { to: '/achievements', label: 'Achievements', short: 'Trophies', icon: Award },
  { to: '/profile', label: 'Profile', icon: UserRound },
]

export default function Layout() {
  const { profile, prefs, setPrefs } = useApp()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen pb-24 xl:pb-8">
      <SpaceBackground planets={false} count={50} />
      <header className="sticky top-0 z-30 border-b-2 border-white/10 bg-navy/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
          <button onClick={() => navigate('/home')} className="flex items-center gap-2 text-left" aria-label="AstroKids Academy home">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-galaxy shadow-chunky"><Rocket className="h-6 w-6 text-navy" /></span>
            <span className="leading-tight"><span className="block text-xl font-black">AstroKids</span><span className="block text-sm font-extrabold text-planet">Academy</span></span>
          </button>
          <nav className="ml-4 hidden flex-1 items-center gap-1 xl:flex" aria-label="Main navigation">
            {NAV.map(({ to, label, short, icon: Icon }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) => `flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-base font-extrabold transition ${isActive ? 'bg-star text-navy' : 'text-white/90 hover:bg-white/10'}`}>
                <Icon className="h-5 w-5" /><span className="2xl:hidden">{short || label}</span><span className="hidden 2xl:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button className="btn btn-ghost !min-h-[44px] !px-3" onClick={() => setPrefs({ sound: !prefs.sound })}
              aria-label={prefs.sound ? 'Turn sound off' : 'Turn sound on'} title="Sound">
              {prefs.sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>
            <NavLink to="/parents" className="btn btn-ghost !min-h-[44px] !px-3" aria-label="Parent area" title="Parent area">
              <Shield className="h-5 w-5" /><span className="hidden text-base 2xl:inline">Parents</span>
            </NavLink>
            {profile && (
              <button onClick={() => navigate('/profile')} className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3" aria-label="Open profile">
                <span className="h-10 w-10 overflow-hidden rounded-full bg-navy-700"><Astronaut avatar={profile.avatar} size={46} className="-mt-1" /></span>
                <span className="hidden text-left leading-tight 2xl:block">
                  <span className="block text-base font-black">{profile.nickname}</span>
                  <span className="block text-xs font-extrabold text-star">{profile.total_xp} XP</span>
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6"><Outlet /></main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-white/10 bg-navy/95 backdrop-blur-md xl:hidden" aria-label="Main navigation">
        <ul className="mx-auto grid max-w-xl grid-cols-7">
          {NAV.map(({ to, label, short, icon: Icon }) => (
            <li key={to}>
              <NavLink to={to} className={({ isActive }) => `flex min-h-[60px] flex-col items-center justify-center gap-0.5 px-0.5 text-[11px] font-extrabold ${isActive ? 'text-star' : 'text-white/80'}`}>
                <Icon className="h-6 w-6" /><span className="truncate">{short || label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <RewardModal />
    </div>
  )
}

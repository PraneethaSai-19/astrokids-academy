import { motion } from 'framer-motion'
import {
  Award, Brain, Crown, Feather, Globe2, Moon, Rocket, Sparkles, Wrench, Star, Loader2, AlertTriangle,
} from 'lucide-react'

export function Loading({ text = 'Loading...', full = false }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-center ${full ? 'min-h-screen' : 'py-16'}`} role="status">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2.4, ease: 'linear' }}
        className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full bg-planet" />
        <div className="absolute -inset-3 rounded-full border-4 border-star/80" style={{ transform: 'scaleY(.35) rotate(-20deg)' }} />
        <Rocket className="absolute -right-2 -top-2 h-6 w-6 text-blush" />
      </motion.div>
      <p className="text-xl font-extrabold text-planet">{text}</p>
    </div>
  )
}

export function ErrorBox({ message, onRetry }) {
  if (!message) return null
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border-2 border-blush/60 bg-blush/15 p-4 text-lg font-bold text-blush">
      <AlertTriangle className="mt-1 h-6 w-6 shrink-0" />
      <div className="flex-1">{message}
        {onRetry && <button className="btn btn-ghost ml-0 mt-2 !py-1 !text-base" onClick={onRetry}>Try again</button>}
      </div>
    </div>
  )
}

export function PageTitle({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {Icon && <div className="grid h-14 w-14 place-items-center rounded-2xl bg-galaxy text-navy shadow-chunky"><Icon className="h-8 w-8" /></div>}
        <div>
          <h1 className="text-3xl font-black leading-tight md:text-4xl">{title}</h1>
          {subtitle && <p className="text-lg font-bold text-planet">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

export function XPBar({ level, className = '' }) {
  if (!level) return null
  const pct = level.progress_percent ?? 0
  return (
    <div className={className}>
      <div className="mb-1 flex justify-between text-base font-extrabold">
        <span>Level {level.level}: {level.level_name}</span>
        <span className="text-star">{level.total_xp} XP</span>
      </div>
      <div className="h-5 overflow-hidden rounded-full bg-navy-900/70 ring-2 ring-white/20" role="progressbar"
        aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="XP progress">
        <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#66CDEB,#C99BFA,#FFB8D0)' }}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} />
      </div>
      <p className="mt-1 text-sm font-bold text-white/70">
        {level.next_level_name ? `${level.xp_to_next} XP to become ${level.next_level_name}` : 'Top level reached!'}
      </p>
    </div>
  )
}

const BADGE_ICONS = { rocket: Rocket, globe: Globe2, feather: Feather, wrench: Wrench, moon: Moon, crown: Crown, brain: Brain, sparkles: Sparkles }
export function BadgeIcon({ badge, size = 'h-9 w-9' }) {
  const Icon = BADGE_ICONS[badge.icon] || Award
  return <Icon className={size} />
}

export function BadgeMedal({ badge, locked = false, big = false }) {
  return (
    <div className={`relative grid place-items-center rounded-full ${big ? 'h-24 w-24' : 'h-20 w-20'} ${locked ? 'bg-white/10 text-white/40' : 'text-navy shadow-glow'}`}
      style={locked ? {} : { background: `radial-gradient(circle at 30% 30%, #fff, ${badge.color})` }}>
      <BadgeIcon badge={badge} size={big ? 'h-12 w-12' : 'h-9 w-9'} />
      {!locked && <Star className="absolute -right-1 -top-1 h-6 w-6 fill-star text-star" />}
    </div>
  )
}

export function Spinner() { return <Loader2 className="h-5 w-5 animate-spin" /> }

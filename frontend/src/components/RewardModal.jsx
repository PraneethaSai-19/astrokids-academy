import { useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useApp } from '../context/AuthContext'
import { BadgeMedal } from './ui'
import { sfx } from '../utils/sound'

const CONFETTI = ['#FFCB69', '#FFB8D0', '#66CDEB', '#A8E6CF', '#C99BFA']

export default function RewardModal() {
  const { reward, closeReward } = useApp()
  const bits = useMemo(() => Array.from({ length: 26 }, (_, i) => ({
    i, x: (i * 37) % 100, d: (i % 7) * 0.12, c: CONFETTI[i % 5], r: (i * 53) % 360,
  })), [])
  useEffect(() => { if (reward) sfx.win() }, [reward])

  return (
    <AnimatePresence>
      {reward && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-navy-900/80 p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Rewards">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {bits.map((b) => (
              <motion.span key={b.i} className="absolute h-3 w-2 rounded-sm" style={{ left: `${b.x}%`, background: b.c, top: -20, rotate: b.r }}
                animate={{ y: '110vh', rotate: b.r + 540 }} transition={{ duration: 2.6, delay: b.d, ease: 'easeIn' }} />
            ))}
          </div>
          <motion.div className="card relative w-full max-w-md bg-navy-700/95 text-center"
            initial={{ scale: 0.7, y: 40 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }}>
            <h2 className="text-4xl font-black text-star">
              {reward.title || (reward.leveled_up ? 'Level Up!' : 'Awesome!')}
            </h2>
            {reward.leveled_up && (
              <p className="mt-2 text-2xl font-extrabold text-galaxy">You are now a {reward.level.level_name}!</p>
            )}
            <div className="mt-4 space-y-2 text-xl font-extrabold">
              {reward.xp_earned > 0 && <p className="rounded-2xl bg-planet/20 py-2">+{reward.xp_earned} XP earned</p>}
              {reward.daily_bonus > 0 && <p className="rounded-2xl bg-mint/20 py-2">+{reward.daily_bonus} XP Daily Challenge bonus!</p>}
            </div>
            {reward.new_badges?.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-lg font-black text-blush">New badge{reward.new_badges.length > 1 ? 's' : ''} unlocked!</p>
                <div className="flex flex-wrap justify-center gap-4">
                  {reward.new_badges.map((b) => (
                    <motion.div key={b.code} initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', delay: 0.3 }} className="flex w-28 flex-col items-center gap-1">
                      <BadgeMedal badge={b} big />
                      <span className="text-sm font-black leading-tight">{b.name}</span>
                      <span className="text-xs font-bold text-star">+{b.xp_bonus} XP</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-4 text-base font-bold text-white/70">Total: {reward.total_xp} XP</p>
            <button className="btn btn-yellow mt-4 w-full" autoFocus onClick={closeReward}>Keep exploring!</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

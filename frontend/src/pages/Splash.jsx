import { motion } from 'framer-motion'
import { Rocket } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AuthContext'
import SpaceBackground from '../components/SpaceBackground'
import Astronaut from '../components/Astronaut'
import RocketSVG from '../components/RocketSVG'

export default function Splash() {
  const navigate = useNavigate()
  const { parent } = useApp()
  const start = () => navigate(parent ? '/home' : '/login')
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10 text-center">
      <SpaceBackground />
      {/* rocket flying across */}
      <motion.div className="pointer-events-none absolute w-20" aria-hidden="true"
        initial={{ x: '-20vw', y: '90vh', rotate: 40 }} animate={{ x: '110vw', y: '-20vh', rotate: 40 }}
        transition={{ duration: 5, delay: 0.6, ease: 'easeIn' }}>
        <RocketSVG parts={{ nose: 1, body: 1, fuel: 1, engine: 1, fins: 1 }} flame ghost={false} />
      </motion.div>

      <div className="relative z-10 flex max-w-3xl flex-col items-center">
        <motion.div initial={{ y: -300, opacity: 0, scale: 0.4 }} animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 60, damping: 11, delay: 0.2 }}>
          <Astronaut size={210} float avatar={{ suit_color: '#FFB8D0', helmet_style: 'classic', visor_color: '#FFCB69', backpack_style: 'rocket', accessory: 'antenna' }} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-base font-extrabold text-planet">
            <Rocket className="h-5 w-5" /> Junior Astronaut Mission Trainer
          </div>
          <h1 className="text-5xl font-black leading-tight drop-shadow md:text-7xl">
            <span className="text-star">Astro</span><span className="text-blush">Kids</span> <span className="text-planet">Academy</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-xl font-extrabold text-galaxy md:text-2xl">
            Train Like an Astronaut. Explore Like a Scientist!
          </p>
          <button className="btn btn-yellow mt-8 !px-10 !py-4 !text-2xl" onClick={start}>
            <Rocket className="h-7 w-7" /> Start Your Journey
          </button>
          <p className="mt-4 text-base font-bold text-white/70">For astronauts aged 6 to 10 · grown-up set-up required</p>
        </motion.div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { ExternalLink, ImageOff, Telescope } from 'lucide-react'
import { api } from '../services/api'

/** NASA Astronomy Picture of the Day, fetched through our backend. Degrades gracefully if NASA is offline. */
const FACTS = [
  'A day on Venus (243 Earth days) is longer than its year (225 Earth days)!',
  "Sunlight takes about 8 minutes and 20 seconds to travel from the Sun to Earth.",
  "Saturn is so light for its size that, on average, it is less dense than water.",
  "Mars has the tallest volcano we know of, Olympus Mons, about 2.5 times taller than Mount Everest.",
  "Neptune takes about 165 Earth years to travel once around the Sun.",
  "Jupiter's Great Red Spot is a giant storm that is bigger than the whole Earth.",
]

function FactFallback({ waiting }) {
  const fact = FACTS[new Date().getDate() % FACTS.length]
  return (
    <div className="space-y-2 p-5">
      <p className="text-lg font-bold text-white/80" role="status">
        {waiting ? 'NASA is answering slowly, so the picture will appear when it arrives.' : "Today's picture from NASA is not available right now."} Here is a space fact meanwhile:
      </p>
      <p className="rounded-2xl bg-white/10 p-3 text-xl font-extrabold text-star">{fact}</p>
      <p className="text-sm font-bold text-white/60">Facts based on <a className="text-planet underline" href="https://science.nasa.gov/solar-system/" target="_blank" rel="noreferrer">NASA Solar System Exploration</a> data. <a className="text-planet underline" href="https://apod.nasa.gov/apod/astropix.html" target="_blank" rel="noreferrer">See NASA's picture of the day</a></p>
    </div>
  )
}

export default function NasaPicture() {
  const [apod, setApod] = useState(null)       // null = loading
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    let stop = false, tries = 0, timer
    const load = () => api.nasaApod().then((a) => {
      if (stop) return
      setApod(a)
      if (a.loading && ++tries < 12) timer = setTimeout(load, 6000)   // NASA is slow: ask again in a few seconds
    }).catch(() => !stop && setApod({ available: false }))
    load()
    return () => { stop = true; clearTimeout(timer) }
  }, [])

  return (
    <section className="card overflow-hidden !p-0" aria-label="NASA Picture of the Day">
      <div className="flex items-center gap-2 bg-navy-700/70 px-5 py-3">
        <Telescope className="h-6 w-6 text-planet" />
        <h2 className="text-xl font-black">{apod?.available && apod.source !== 'NASA Astronomy Picture of the Day' ? 'NASA Space Picture' : 'NASA Picture of the Day'}</h2>
      </div>
      {(apod === null || apod?.loading) && <FactFallback waiting />}
      {apod && !apod.available && !apod.loading && <FactFallback />}
      {apod?.available && (
        <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
          {!imgFailed ? (
            <img src={apod.image_url} alt={apod.title} loading="lazy" onError={() => setImgFailed(true)} className="h-56 w-full object-cover md:h-80" />
          ) : <div className="grid h-56 place-items-center bg-navy-900/60 md:h-80"><ImageOff className="h-10 w-10 text-white/40" /></div>}
          <div className="space-y-2 p-5">
            <h3 className="text-2xl font-black text-star">{apod.title}</h3>
            <p className="text-lg font-bold leading-snug">{apod.summary}</p>
            <p className="text-sm font-bold text-white/60">{apod.credit} · Data: {apod.source}</p>
            <a href={apod.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-base font-extrabold text-planet underline">Read more at NASA <ExternalLink className="h-4 w-4" /></a>
          </div>
        </div>
      )}
    </section>
  )
}

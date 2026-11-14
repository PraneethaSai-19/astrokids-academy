// 2D fallback used when WebGL is unavailable (or the child switches to "light mode").
const SIZES = { sun: 92, mercury: 22, venus: 34, earth: 36, mars: 28, jupiter: 72, saturn: 62, uranus: 48, neptune: 46 }

export default function Fallback2D({ planets, selected, onSelect }) {
  return (
    <div className="relative h-full min-h-[22rem] overflow-x-auto rounded-3xl bg-navy-900/60 p-4" role="group" aria-label="Solar system (2D view)">
      <div className="flex min-w-max items-center gap-5 px-4 py-8">
        {planets.map((p, i) => {
          const size = SIZES[p.slug] || 40
          const sel = selected === p.slug
          return (
            <button key={p.slug} onClick={() => onSelect(p.slug)} aria-pressed={sel} aria-label={`Select ${p.name}`}
              className="group flex flex-col items-center gap-2 focus:outline-none">
              <span className={`relative block rounded-full transition group-hover:scale-110 group-focus-visible:ring-4 group-focus-visible:ring-white ${sel ? 'ring-4 ring-star scale-110' : ''}`}
                style={{
                  width: size, height: size, animation: `float ${4 + (i % 3)}s ease-in-out infinite`,
                  background: `radial-gradient(circle at 30% 30%, #fff8, ${p.color} 45%, #0006 130%)`,
                  boxShadow: p.slug === 'sun' ? '0 0 40px #FFB938' : 'none',
                }}>
                {p.slug === 'saturn' && <span className="absolute left-1/2 top-1/2 h-4 w-[170%] -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-full border-4 border-[#E6D3A0]" />}
              </span>
              <span className="text-base font-extrabold">{p.name.replace('The ', '')}</span>
            </button>
          )
        })}
      </div>
      <p className="px-4 text-center text-sm font-bold text-white/60">Sizes are drawn bigger than real to fit. Tap a planet to learn about it!</p>
    </div>
  )
}

import { memo, useMemo } from 'react'

function rng(seed) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

/** Static galaxy backdrop: gradient, twinkling stars and a few drifting planets (pure CSS/SVG, no images). */
function SpaceBackground({ planets = true, count = 70 }) {
  const stars = useMemo(() => {
    const r = rng(42)
    return Array.from({ length: count }, (_, i) => ({
      id: i, x: r() * 100, y: r() * 100, s: 1 + r() * 2.5, d: r() * 4, o: 0.3 + r() * 0.7,
      c: ['#fff', '#FFCB69', '#66CDEB', '#FFB8D0'][Math.floor(r() * 4)],
    }))
  }, [count])
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden stars-bg" aria-hidden="true">
      {stars.map((s) => (
        <span key={s.id} className="absolute rounded-full animate-twinkle"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, background: s.c, opacity: s.o, animationDelay: `${s.d}s` }} />
      ))}
      {planets && (
        <>
          <div className="absolute -left-16 top-1/4 h-44 w-44 rounded-full animate-float opacity-80"
            style={{ background: 'radial-gradient(circle at 30% 30%, #FFB8D0, #C99BFA 60%, #6E4FB5)' }} />
          <div className="absolute -right-10 bottom-16 h-56 w-56 rounded-full animate-float opacity-70"
            style={{ background: 'radial-gradient(circle at 30% 30%, #A8E6CF, #66CDEB 55%, #2F6FA8)', animationDelay: '1.5s' }}>
            <div className="absolute left-1/2 top-1/2 h-8 w-80 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-full border-4 border-star/60" />
          </div>
          <div className="absolute right-1/3 top-10 h-12 w-12 rounded-full animate-float opacity-80"
            style={{ background: 'radial-gradient(circle at 30% 30%, #FFE29A, #FFCB69 60%, #D98E2B)', animationDelay: '.8s' }} />
        </>
      )}
    </div>
  )
}
export default memo(SpaceBackground)

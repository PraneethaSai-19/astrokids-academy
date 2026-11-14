import { memo } from 'react'

/**
 * Rocket drawn from the chosen parts. Each part is optional so the builder can show a partial assembly.
 * Coordinates: viewBox 0 0 160 360, parts stacked top-to-bottom.
 */
function RocketSVG({ parts = {}, bodyColor = '#FFFFFF', accentColor = '#FFB8D0', flame = false, className = '', ghost = true, viewBox = '0 0 160 360', width, height }) {
  const has = (s) => !!parts[s]
  const stroke = '#101C3D'
  const g = (shown, children) => <g opacity={shown ? 1 : ghost ? 0.18 : 0}>{children}</g>
  return (
    <svg viewBox={viewBox} width={width} height={height} className={className} role="img" aria-label="Rocket">
      {flame && (
        <g>
          <path d="M60 300 Q80 372 100 300Z" fill="#FFCB69"><animate attributeName="d" dur="0.25s" repeatCount="indefinite" values="M60 300 Q80 372 100 300Z;M64 300 Q80 392 96 300Z;M60 300 Q80 372 100 300Z" /></path>
          <path d="M68 300 Q80 350 92 300Z" fill="#FF8A65"><animate attributeName="d" dur="0.2s" repeatCount="indefinite" values="M68 300 Q80 350 92 300Z;M70 300 Q80 365 90 300Z;M68 300 Q80 350 92 300Z" /></path>
        </g>
      )}
      {/* fins */}
      {g(has('fins'), <>
        <path d="M44 230 L10 300 L44 290Z" fill={accentColor} stroke={stroke} strokeWidth="4" strokeLinejoin="round" />
        <path d="M116 230 L150 300 L116 290Z" fill={accentColor} stroke={stroke} strokeWidth="4" strokeLinejoin="round" />
        <path d="M80 250 L80 300" stroke={stroke} strokeWidth="0" />
      </>)}
      {/* engine */}
      {g(has('engine'), <>
        <path d="M54 286 L106 286 L116 312 L44 312Z" fill="#9AA6C8" stroke={stroke} strokeWidth="4" strokeLinejoin="round" />
        <rect x="62" y="296" width="36" height="8" rx="4" fill="#5B6A99" />
      </>)}
      {/* fuel tank */}
      {g(has('fuel'), <>
        <rect x="44" y="204" width="72" height="84" rx="10" fill={accentColor} stroke={stroke} strokeWidth="4" />
        <rect x="54" y="216" width="52" height="10" rx="5" fill="#fff" opacity=".6" />
        <path d="M80 236 c10 12 14 20 0 32 c-14 -12 -10 -20 0 -32z" fill="#FFCB69" stroke={stroke} strokeWidth="3" />
      </>)}
      {/* body */}
      {g(has('body'), <>
        <rect x="44" y="110" width="72" height="100" fill={bodyColor} stroke={stroke} strokeWidth="4" />
        <circle cx="80" cy="152" r="20" fill="#66CDEB" stroke={stroke} strokeWidth="5" />
        <ellipse cx="73" cy="145" rx="6" ry="4" fill="#fff" opacity=".7" />
        <rect x="44" y="188" width="72" height="8" fill={accentColor} opacity=".8" />
      </>)}
      {/* nose */}
      {g(has('nose'), <>
        <path d="M44 112 C44 66 66 30 80 12 C94 30 116 66 116 112Z" fill={accentColor} stroke={stroke} strokeWidth="4" strokeLinejoin="round" />
        <path d="M62 100 C64 70 72 50 80 36" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".5" />
      </>)}
    </svg>
  )
}
export default memo(RocketSVG)

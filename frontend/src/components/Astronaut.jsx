import { memo } from 'react'

export const SUIT_COLORS = ['#66CDEB', '#FFB8D0', '#A8E6CF', '#C99BFA', '#FFCB69', '#FF8A65', '#FFFFFF', '#8C9EFF']
export const VISOR_COLORS = ['#FFCB69', '#66CDEB', '#FFB8D0', '#A8E6CF', '#C99BFA']
export const HELMETS = [
  { id: 'classic', label: 'Classic' }, { id: 'bubble', label: 'Bubble' },
  { id: 'visor', label: 'Visor' }, { id: 'cat', label: 'Kitty' },
]
export const BACKPACKS = [
  { id: 'oxygen', label: 'Oxygen' }, { id: 'jetpack', label: 'Jetpack' },
  { id: 'rocket', label: 'Rocket' }, { id: 'none', label: 'None' },
]
export const ACCESSORIES = [
  { id: 'none', label: 'None' }, { id: 'antenna', label: 'Antenna' }, { id: 'star_badge', label: 'Star badge' },
  { id: 'flag', label: 'Flag' }, { id: 'headphones', label: 'Headset' },
]
export const DEFAULT_AVATAR = {
  suit_color: '#66CDEB', helmet_style: 'classic', visor_color: '#FFCB69', backpack_style: 'oxygen', accessory: 'none',
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const c = (v) => Math.max(0, Math.min(255, v + amt))
  const r = c(n >> 16), g = c((n >> 8) & 255), b = c(n & 255)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/** Cute cartoon astronaut, fully drawn in SVG and driven by the avatar config. */
function AstronautBase({ avatar = DEFAULT_AVATAR, size = 200, float = false, className = '' }) {
  const a = { ...DEFAULT_AVATAR, ...avatar }
  const dark = shade(a.suit_color, -45)
  const light = shade(a.suit_color, 30)
  const uid = `${a.suit_color}${a.visor_color}`.replace(/#/g, '')
  return (
    <svg viewBox="0 0 200 240" width={size} height={size * 1.2} role="img" aria-label="Astronaut avatar"
      className={`${float ? 'animate-float' : ''} ${className}`}>
      <defs>
        <radialGradient id={`v${uid}`} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor={shade(a.visor_color, 60)} /><stop offset="1" stopColor={a.visor_color} />
        </radialGradient>
        <radialGradient id={`h${uid}`} cx="35%" cy="25%" r="85%">
          <stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#D9E4F5" />
        </radialGradient>
      </defs>
      {/* backpack */}
      {a.backpack_style === 'oxygen' && (<g><rect x="42" y="100" width="34" height="78" rx="16" fill="#D9E4F5" stroke={dark} strokeWidth="4" /><rect x="124" y="100" width="34" height="78" rx="16" fill="#D9E4F5" stroke={dark} strokeWidth="4" /><rect x="50" y="112" width="18" height="10" rx="4" fill={a.suit_color} /><rect x="132" y="112" width="18" height="10" rx="4" fill={a.suit_color} /></g>)}
      {a.backpack_style === 'jetpack' && (<g><rect x="38" y="104" width="124" height="70" rx="20" fill="#9AA6C8" stroke={dark} strokeWidth="4" /><rect x="50" y="170" width="26" height="16" rx="6" fill="#FFCB69" /><rect x="124" y="170" width="26" height="16" rx="6" fill="#FFCB69" /><circle cx="63" cy="130" r="8" fill="#FF8A65" /><circle cx="137" cy="130" r="8" fill="#66CDEB" /></g>)}
      {a.backpack_style === 'rocket' && (<g><path d="M100 76 C118 92 124 118 124 150 L76 150 C76 118 82 92 100 76Z" fill="#FFB8D0" stroke={dark} strokeWidth="4" /><path d="M76 150 L58 176 L84 164Z M124 150 L142 176 L116 164Z" fill="#FF8A65" stroke={dark} strokeWidth="3" /><circle cx="100" cy="116" r="9" fill="#66CDEB" stroke={dark} strokeWidth="3" /></g>)}
      {/* legs */}
      <rect x="66" y="170" width="28" height="48" rx="14" fill={a.suit_color} stroke={dark} strokeWidth="4" />
      <rect x="106" y="170" width="28" height="48" rx="14" fill={a.suit_color} stroke={dark} strokeWidth="4" />
      <rect x="62" y="208" width="36" height="22" rx="11" fill="#FFFFFF" stroke={dark} strokeWidth="4" />
      <rect x="102" y="208" width="36" height="22" rx="11" fill="#FFFFFF" stroke={dark} strokeWidth="4" />
      {/* arms */}
      <rect x="30" y="110" width="30" height="62" rx="15" fill={a.suit_color} stroke={dark} strokeWidth="4" transform="rotate(14 45 110)" />
      <rect x="140" y="110" width="30" height="62" rx="15" fill={a.suit_color} stroke={dark} strokeWidth="4" transform="rotate(-14 155 110)" />
      <circle cx="37" cy="172" r="13" fill="#FFFFFF" stroke={dark} strokeWidth="4" />
      <circle cx="163" cy="172" r="13" fill="#FFFFFF" stroke={dark} strokeWidth="4" />
      {/* torso */}
      <rect x="58" y="100" width="84" height="84" rx="30" fill={a.suit_color} stroke={dark} strokeWidth="4" />
      <ellipse cx="80" cy="118" rx="12" ry="7" fill={light} opacity=".6" />
      <rect x="76" y="128" width="48" height="32" rx="10" fill="#FFFFFF" opacity=".9" stroke={dark} strokeWidth="3" />
      <circle cx="88" cy="144" r="5" fill="#FF8A65" /><circle cx="102" cy="144" r="5" fill="#FFCB69" /><circle cx="116" cy="144" r="5" fill="#A8E6CF" />
      {/* helmet */}
      {a.helmet_style === 'cat' && (<g><path d="M52 52 L56 14 L84 38Z" fill="#E9EFFB" stroke={dark} strokeWidth="4" strokeLinejoin="round" /><path d="M148 52 L144 14 L116 38Z" fill="#E9EFFB" stroke={dark} strokeWidth="4" strokeLinejoin="round" /><path d="M60 40 L62 26 L74 36Z M140 40 L138 26 L126 36Z" fill="#FFB8D0" /></g>)}
      <circle cx="100" cy="64" r={a.helmet_style === 'bubble' ? 54 : 50} fill={`url(#h${uid})`} stroke={dark} strokeWidth="4" />
      {a.helmet_style === 'visor' ? (
        <rect x="54" y="42" width="92" height="46" rx="23" fill={`url(#v${uid})`} stroke={dark} strokeWidth="4" />
      ) : (
        <ellipse cx="100" cy="66" rx={a.helmet_style === 'bubble' ? 42 : 38} ry={a.helmet_style === 'bubble' ? 38 : 32} fill={`url(#v${uid})`} stroke={dark} strokeWidth="4" />
      )}
      {/* face */}
      <circle cx="86" cy="64" r="5" fill="#101C3D" /><circle cx="114" cy="64" r="5" fill="#101C3D" />
      <circle cx="88" cy="62" r="1.8" fill="#fff" /><circle cx="116" cy="62" r="1.8" fill="#fff" />
      <path d="M90 76 Q100 86 110 76" fill="none" stroke="#101C3D" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="76" cy="74" rx="6" ry="4" fill="#FF8FA8" opacity=".6" /><ellipse cx="124" cy="74" rx="6" ry="4" fill="#FF8FA8" opacity=".6" />
      <path d="M72 46 Q84 38 96 44" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".7" />
      {/* accessories */}
      {a.accessory === 'antenna' && (<g><line x1="100" y1="14" x2="100" y2="-2" stroke={dark} strokeWidth="4" /><circle cx="100" cy="-4" r="8" fill="#FFCB69" stroke={dark} strokeWidth="3" /></g>)}
      {a.accessory === 'star_badge' && (<path d="M120 112 l4 9 10 1 -8 7 3 10 -9 -6 -9 6 3 -10 -8 -7 10 -1z" fill="#FFCB69" stroke={dark} strokeWidth="2.5" />)}
      {a.accessory === 'flag' && (<g><line x1="156" y1="120" x2="156" y2="60" stroke="#fff" strokeWidth="4" /><path d="M156 60 L186 70 L156 82Z" fill="#FF8A65" stroke={dark} strokeWidth="2.5" /></g>)}
      {a.accessory === 'headphones' && (<g><path d="M52 66 Q52 24 100 24 Q148 24 148 66" fill="none" stroke="#101C3D" strokeWidth="6" /><rect x="42" y="56" width="14" height="26" rx="7" fill="#FF8A65" stroke="#101C3D" strokeWidth="3" /><rect x="144" y="56" width="14" height="26" rx="7" fill="#FF8A65" stroke="#101C3D" strokeWidth="3" /></g>)}
    </svg>
  )
}
export default memo(AstronautBase)

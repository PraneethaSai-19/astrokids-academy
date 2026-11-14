import { memo } from 'react'

/** AstroBot: cute robot astronaut. `talking` animates the mouth/antenna, `thinking` shows dots. */
function AstroBotMascot({ size = 160, talking = false, thinking = false, className = '' }) {
  return (
    <svg viewBox="0 0 200 220" width={size} height={size * 1.1} role="img" aria-label="AstroBot the robot"
      className={`${talking || thinking ? '' : 'animate-float'} ${className}`}>
      <line x1="100" y1="16" x2="100" y2="36" stroke="#9AA6C8" strokeWidth="5" />
      <circle cx="100" cy="12" r="9" fill="#FFCB69" stroke="#101C3D" strokeWidth="3">
        {(talking || thinking) && <animate attributeName="r" values="9;12;9" dur="0.8s" repeatCount="indefinite" />}
      </circle>
      <rect x="62" y="150" width="30" height="46" rx="14" fill="#C99BFA" stroke="#101C3D" strokeWidth="4" />
      <rect x="108" y="150" width="30" height="46" rx="14" fill="#C99BFA" stroke="#101C3D" strokeWidth="4" />
      <rect x="56" y="186" width="42" height="20" rx="10" fill="#fff" stroke="#101C3D" strokeWidth="4" />
      <rect x="102" y="186" width="42" height="20" rx="10" fill="#fff" stroke="#101C3D" strokeWidth="4" />
      <g>
        <rect x="26" y="112" width="26" height="54" rx="13" fill="#66CDEB" stroke="#101C3D" strokeWidth="4" transform="rotate(12 39 112)" />
        <g style={{ transformOrigin: '160px 120px' }} className={talking ? 'animate-wiggle' : ''}>
          <rect x="148" y="112" width="26" height="54" rx="13" fill="#66CDEB" stroke="#101C3D" strokeWidth="4" transform="rotate(-12 161 112)" />
        </g>
      </g>
      <rect x="56" y="104" width="88" height="64" rx="26" fill="#66CDEB" stroke="#101C3D" strokeWidth="4" />
      <circle cx="100" cy="136" r="14" fill="#fff" stroke="#101C3D" strokeWidth="3" />
      <path d="M100 126 l3 7 7 .5 -5.5 5 2 7 -6.5 -4 -6.5 4 2 -7 -5.5 -5 7 -.5z" fill="#FFCB69" />
      <rect x="40" y="32" width="120" height="86" rx="40" fill="#F4F7FF" stroke="#101C3D" strokeWidth="4" />
      <rect x="54" y="46" width="92" height="58" rx="28" fill="#1B2B5C" stroke="#101C3D" strokeWidth="3" />
      <ellipse cx="82" cy="70" rx="11" ry="13" fill="#A8E6CF">
        <animate attributeName="ry" values="13;13;1.5;13" dur="4s" repeatCount="indefinite" keyTimes="0;0.9;0.95;1" />
      </ellipse>
      <ellipse cx="118" cy="70" rx="11" ry="13" fill="#A8E6CF">
        <animate attributeName="ry" values="13;13;1.5;13" dur="4s" repeatCount="indefinite" keyTimes="0;0.9;0.95;1" />
      </ellipse>
      {thinking ? (
        <g fill="#FFCB69">
          <circle cx="88" cy="94" r="3.5"><animate attributeName="opacity" values="1;.2;1" dur="1s" repeatCount="indefinite" /></circle>
          <circle cx="100" cy="94" r="3.5"><animate attributeName="opacity" values="1;.2;1" dur="1s" begin=".25s" repeatCount="indefinite" /></circle>
          <circle cx="112" cy="94" r="3.5"><animate attributeName="opacity" values="1;.2;1" dur="1s" begin=".5s" repeatCount="indefinite" /></circle>
        </g>
      ) : (
        <path d="M88 90 Q100 100 112 90" stroke="#A8E6CF" strokeWidth="4" strokeLinecap="round" fill="none">
          {talking && <animate attributeName="d" values="M88 90 Q100 100 112 90;M90 92 Q100 88 110 92;M88 90 Q100 100 112 90" dur="0.5s" repeatCount="indefinite" />}
        </path>
      )}
      <circle cx="34" cy="76" r="9" fill="#FFB8D0" stroke="#101C3D" strokeWidth="3" />
      <circle cx="166" cy="76" r="9" fill="#FFB8D0" stroke="#101C3D" strokeWidth="3" />
    </svg>
  )
}
export default memo(AstroBotMascot)

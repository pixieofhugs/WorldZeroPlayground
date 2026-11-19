import type { CSSProperties } from 'react'
import { K, S, T } from './Wisp'
import './dragon.css'

const ink = { stroke: K, strokeLinejoin: 'round' as const }

interface PartProps {
  className?: string
  width?: number
  height?: number
  style?: CSSProperties
}

const smoke = (sx: string, delay?: string): CSSProperties => ({ ['--sx' as string]: sx, animationDelay: delay })

/** The head, jaw, fire and eye, drawn in a 120x110 box. Its parts animate by class (`dragon.css`); a parent that wants it calm switches those off. */
export function DragonHead({ className, width = 120, height = 110, style }: PartProps) {
  return (
    <svg className={['dhead', className].filter(Boolean).join(' ')} viewBox="0 0 120 110" width={width} height={height} aria-hidden="true" style={style}>
      <g className="lunge">
        <path d="M102 110 C 106 82, 100 56, 84 42 L 62 50 C 70 66, 72 88, 70 110 Z" fill={S(4)} strokeWidth="2" {...ink} />
        <path d="M71 100 q7 -3 12 1 M71 88 q7 -3 12 1 M69 76 q7 -3 12 1 M66 64 q7 -3 11 2" fill="none" stroke={K} strokeWidth="1.5" strokeLinecap="round" opacity=".5" />
        <path d="M103 98 l10 -5 l-9 -7 Z M102 80 l10 -7 l-10 -5 Z M97 62 l10 -9 l-11 -3 Z" fill={S(3)} strokeWidth="1.5" {...ink} />
        <path d="M76 18 C 80 6, 90 2, 98 4 C 92 9, 89 15, 88 24 Z M64 15 C 63 6, 68 1, 75 0 C 72 6, 72 11, 73 16 Z" fill={T} strokeWidth="1.5" {...ink} />
        <g className="jaw">
          <path d="M66 44 L 18 46 C 11 47, 11 54, 19 55 L 48 57 C 58 57, 64 53, 68 48 Z" fill={S(4)} strokeWidth="2" {...ink} />
        </g>
        <g className="fire">
          <path d="M16 50 C 2 38, -22 40, -42 50 C -26 53, -8 63, 16 52 Z" fill={S(1)} />
          <path d="M14 50 C 4 44, -10 45, -24 50 C -12 52, -2 57, 14 52 Z" fill={S(3)} />
        </g>
        <path d="M20 43 l3 6 l3 -6 Z M31 44 l3 6 l3 -6 Z" fill={T} stroke={K} strokeWidth="1" />
        <path d="M88 44 C 94 30, 84 14, 66 15 C 54 16, 46 23, 36 25 L 17 27 C 8 28, 6 40, 14 43 L 42 46 C 54 54, 74 56, 88 44 Z" fill={S(4)} strokeWidth="2" {...ink} />
        <path d="M86 30 l14 -3 l-8 9 l10 3 l-14 5 Z" fill={S(4)} strokeWidth="1.5" {...ink} />
        <ellipse cx="16" cy="33" rx="1.6" ry="2.4" fill={K} />
        <circle cx="46" cy="40" r="4" fill={S(1)} opacity=".45" />
        <g className="deye">
          <circle cx="60" cy="29" r="9" fill={T} stroke={K} strokeWidth="1.5" />
          <circle className="dpup" cx="60" cy="29" r="4" fill={K} />
        </g>
        <path className="dbrow" d="M50 18 q9 -5 19 0" fill="none" stroke={K} strokeWidth="2" strokeLinecap="round" />
        <circle className="smoke" cx="12" cy="28" r="4" fill="var(--faction-default-card-muted)" style={smoke('-12px')} />
        <circle className="smoke" cx="12" cy="28" r="3" fill="var(--faction-default-card-muted)" style={smoke('-22px', '.7s')} />
      </g>
    </svg>
  )
}

/** The claws that grip the card's top edge. */
export function DragonClaw({ className, style }: PartProps) {
  return (
    <svg className={['dclaw', className].filter(Boolean).join(' ')} viewBox="0 0 28 16" width="28" height="16" aria-hidden="true" style={style}>
      <path d="M2 16 V8 a4 4 0 0 1 8 0 a4 4 0 0 1 8 0 a4 4 0 0 1 8 0 V16 Z" fill={S(4)} strokeWidth="1.5" {...ink} />
    </svg>
  )
}

/** The tail, drawn in a 96x72 box; it wags on its own clock. */
export function DragonTail({ className, width = 80, height = 60, style }: PartProps) {
  return (
    <svg className={['dtail', className].filter(Boolean).join(' ')} viewBox="0 0 96 72" width={width} height={height} aria-hidden="true" style={style}>
      <path d="M82 0 C 84 34, 64 62, 36 60 C 18 59, 5 48, 3 30 C 12 42, 24 44, 33 39 C 45 33, 50 20, 50 0 Z" fill={S(4)} strokeWidth="2" {...ink} />
      <path d="M52 10 q7 -3 12 1 M50 22 q7 -3 12 2 M44 33 q7 -1 10 5 M34 41 q5 1 6 8" fill="none" stroke={K} strokeWidth="1.5" strokeLinecap="round" opacity=".5" />
      <path d="M82 8 l11 4 l-9 7 Z M79 28 l11 7 l-11 4 Z M68 46 l8 10 l-12 -1 Z M50 57 l2 11 l-10 -6 Z" fill={S(3)} strokeWidth="1.5" {...ink} />
    </svg>
  )
}

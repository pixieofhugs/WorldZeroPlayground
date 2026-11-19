import type { CSSProperties, ReactNode } from 'react'
import { factionCssVar } from '../../utils/factions'
import { K, S, T } from './Wisp'
import './motion/wisp.css'

const ink = { stroke: K, strokeLinejoin: 'round' as const }

// Each faction's signature accessory, in a 24x20 box that sits on the blob.
const ACC: Record<string, ReactNode> = {
  ua: (
    <>
      <path d="M2 17 C 0 9, 19 5, 23 13 C 22 17.5, 6 18.5, 2 17 Z" fill="var(--faction-ua)" strokeWidth="1" {...ink} />
      <path d="M12 8 l.6 -3" stroke={K} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M15 16 L22 2" stroke={T} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M21.2 3.6 L23.6 -1 L23.8 2.4 Z" fill="var(--faction-coven)" stroke={K} strokeWidth=".6" />
    </>
  ),
  coven: (
    <>
      <path d="M-4 19 h32 l-9 -4 L12 -12 L5 15 Z" fill="var(--faction-coven)" strokeWidth="1" {...ink} />
      <path d="M5.4 13.6 h13.2" stroke={T} strokeWidth="2.4" strokeDasharray="1.8 1.1" />
      <circle cx="12" cy="-12" r="2.6" fill={T} stroke={K} strokeWidth=".8" />
    </>
  ),
  wow: (
    <>
      <path d="M1 19 V2 l5.5 6 l5.5 -13 l5.5 13 l5.5 -6 v17 Z" fill="var(--faction-ephemerists)" strokeWidth="1" {...ink} />
      <circle cx="12" cy="13.5" r="2.6" fill="var(--faction-wow)" stroke={K} strokeWidth=".6" />
      <circle cx="12" cy="-5" r="1.5" fill="var(--faction-ephemerists)" stroke={K} strokeWidth=".6" />
    </>
  ),
  snide: <path d="M6 19 L6.5 8 L9 13 L10.5 1 L13 12 L15.5 4 L16.5 13 L19 9 L18 19 Z" fill="var(--faction-snide)" strokeWidth="1" {...ink} />,
  ephemerists: (
    <>
      <path d="M-4 17 C 2 12.5, 22 12.5, 28 17 C 22 20.5, 2 20.5, -4 17 Z" fill="var(--faction-ephemerists)" strokeWidth="1" {...ink} />
      <path d="M5 15.4 C 3.6 8, 6 2.6, 9.2 2.6 C 11 2.6, 11.4 4.6, 12 4.6 C 12.6 4.6, 13 2.6, 14.8 2.6 C 18 2.6, 20.4 8, 19 15.4 C 15 17, 9 17, 5 15.4 Z" fill="var(--faction-ephemerists)" strokeWidth="1" {...ink} />
      <path d="M4.9 12.6 C 9 14.4, 15 14.4, 19.1 12.6" fill="none" stroke={K} strokeWidth="2.2" opacity=".75" />
      <path d="M19 12 l4.6 -7 l.6 5.6 Z" fill={S(1)} strokeWidth=".7" {...ink} />
    </>
  ),
  singularity: (
    <>
      <path d="M12 19 V6" stroke={K} strokeWidth="1.4" />
      <circle cx="12" cy="4.5" r="3" fill="var(--faction-singularity)" stroke={K} strokeWidth="1" />
      <path d="M6.5 2 q-2 2.5 0 5 M17.5 2 q2 2.5 0 5" fill="none" stroke="var(--faction-singularity)" strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),
  everymen: (
    <>
      <path d="M4 17 C 4 7, 20 7, 20 17 Z" fill={S(3)} strokeWidth="1" {...ink} />
      <path d="M12 7.5 V17 M9 9 v8 M15 9 v8" stroke={K} strokeWidth=".7" opacity=".5" />
      <rect x="1" y="16.4" width="22" height="2.6" rx="1.3" fill={S(3)} stroke={K} strokeWidth="1" />
    </>
  ),
}

interface FactionBuddyProps {
  slug: string
  /** Diameter: a number is px, a string (e.g. a clamp()) passes through. */
  size?: number | string
  /** Seconds between blinks, and the offset into that cycle: give each instance its own. */
  blinkPeriod?: number
  blinkOffset?: number
}

export default function FactionBuddy({ slug, size = 24, blinkPeriod = 4.3, blinkOffset = 0 }: FactionBuddyProps) {
  const vars = {
    '--s': typeof size === 'number' ? `${size}px` : size,
    '--c': factionCssVar(slug),
    '--bk': `${blinkPeriod}s`,
    '--bd': `${blinkOffset}s`,
  } as CSSProperties
  return (
    <span className="fb" data-faction={slug} style={vars} aria-hidden="true">
      <span className="bud">
        <i className="e l" />
        <i className="e r" />
        <i className="mth" />
      </span>
      <svg className="fhat" viewBox="0 0 24 20">
        {ACC[slug]}
      </svg>
    </span>
  )
}

import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { FACTION_RAINBOW_ORDER, factionCssVar } from '../../../utils/factions'
import '../../../factionFaces'
import FactionBuddy from '../FactionBuddy'
import Wisp from '../Wisp'
import type { BeatProps } from './types'
import './Beat7.css'

// ponytail: hand-placed for the seven in Era 1; any other roster size is spread evenly.
const X = [6, 18, 30, 40, 62, 76, 90]
const CX = [46, 47, 48, 46.5, 53, 52, 54]
// Nobody arrives, or blinks, in step.
const LD = [0, 0.09, 0.03, 0.14, 0.06, 0.11, 0.02]
const BK = [4.3, 3.7, 5.1, 4.6, 3.3, 5.6, 4.1]

const CLOUD = [[-48, -8, 62], [-18, -40, 72], [22, -34, 66], [54, -6, 60], [36, 24, 56], [-4, 28, 64], [-40, 22, 54], [0, -4, 84], [-66, -34, 40], [66, -40, 42], [-78, 14, 34]]
// x, y, jab x, jab y, roster index of the owner
const FISTS = [[-84, -20, -10, -4, 1], [80, -26, 10, -6, 3], [-46, -62, -6, -10, 5], [50, -60, 6, -10, 4], [-60, 44, -8, 6, 6], [64, 40, 8, 6, 0]]
const STAR = 'M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z'
const DOT = 'M0 -4 a4 4 0 1 0 .01 0 Z'
const SPARKS = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2 + (i % 2) * 0.2
  const r = 95 + (i % 4) * 28
  return { dx: Math.round(Math.cos(a) * r), dy: Math.round(Math.sin(a) * r * 0.7 - 30), dr: (i * 67) % 360, pd: (i % 5) * 0.32, s: i % 3 ? 16 : 11, d: i % 3 ? STAR : DOT }
})
const DUST = [-150, -100, -60, -24, 24, 60, 100, 150].map((dx, i) => ({ dx, s: 26 + (i % 3) * 10, pd: (i % 4) * 0.18 }))
const POWS = [
  { word: 'POW!', left: -120, top: -120, pr: -12, pd: 0 },
  { word: 'BONK!', left: 46, top: -104, pr: 10, pd: 0.75 },
  { word: 'WHAM!', left: 84, top: -52, pr: 6, pd: 1.3 },
]
const px = (n: number) => `${n}px`
const ink = 'var(--faction-default-on-fill)'
const cream = 'var(--faction-default-card-text)'
const num = (arr: number[], i: number) => arr[i % arr.length]

export default function Beat7({ confidence }: BeatProps) {
  const { t } = useTranslation('feed')
  const roster = FACTION_RAINBOW_ORDER
  const n = roster.length
  const colour = (i: number) => factionCssVar(roster[i % n])

  return (
    <div className="b7" aria-hidden="true">
      <span className="ground" />
      {roster.map((slug, i) => {
        const left = i < Math.ceil(n / 2)
        const tuned = n === X.length
        const x = tuned ? X[i] : 6 + (84 * i) / Math.max(n - 1, 1)
        const cx = tuned ? CX[i] : 46 + (8 * i) / Math.max(n - 1, 1)
        const vars = {
          '--hx': `${x}%`,
          '--cx': `${cx}%`,
          '--ld': `${num(LD, i).toFixed(2)}s`,
          '--lean': left ? '14deg' : '-14deg',
          '--spin': left ? '-720deg' : '720deg',
          '--tx': left ? '-20px' : '20px',
          '--hp': `${7 + ((i * 5) % 8)}px`,
        } as CSSProperties
        return (
          <span key={slug}>
            <span className={`bpos ${i % 2 ? 'r2' : 'r1'}`} style={{ left: `${x}%` }}>
              <span
                className="bub boing"
                data-faction={slug}
                style={{ '--fc': colour(i), '--bcf': factionCssVar(slug, 'card-font'), animationDelay: `${(0.4 + i * 0.42).toFixed(2)}s` } as CSSProperties}
              >
                {t(`factionSelect.${slug}.tagline` as never)}
              </span>
            </span>
            <span className="fx" style={vars}>
              <span>
                <span className="fling">
                  <span className="run">
                    <FactionBuddy slug={slug} blinkPeriod={num(BK, i)} blinkOffset={-i * 1.37} />
                  </span>
                </span>
                <span className="trail" />
                <span className="trail" style={{ animationDelay: `${(num(LD, i) + 0.12).toFixed(2)}s` }} />
              </span>
            </span>
          </span>
        )
      })}
      <span className="brawl">
        <span className="clw">
          {CLOUD.map(([x, y, s], i) => (
            <span key={i} className="cl" style={{ left: px(x), top: px(y), width: px(s), height: px(s), margin: `${-s / 2}px 0 0 ${-s / 2}px`, animationDelay: `${(-i * 0.07).toFixed(2)}s` }} />
          ))}
          {FISTS.map(([x, y, jx, jy, owner], i) => (
            <span key={i} className="fist" style={{ left: px(x), top: px(y), '--c': colour(owner), '--jx': px(jx), '--jy': px(jy), animationDelay: `${(i * 0.05).toFixed(2)}s` } as CSSProperties} />
          ))}
        </span>
        {DUST.map((d, i) => (
          <span key={i} className="dust" style={{ '--dx': px(d.dx), '--ds': px(d.s), '--pd': `${d.pd.toFixed(2)}s` } as CSSProperties} />
        ))}
        {SPARKS.map((k, i) => (
          <span key={i} className="pt" style={{ '--dx': px(k.dx), '--dy': px(k.dy), '--dr': `${k.dr}deg`, '--pd': `${k.pd.toFixed(2)}s` } as CSSProperties}>
            <svg viewBox="-8 -8 16 16" width={k.s} height={k.s} className="spk">
              <path d={k.d} stroke={ink} strokeWidth="1" style={{ fill: i % 2 ? colour(i) : `var(--faction-default-stop-${(i % 7) + 1})` }} />
            </svg>
          </span>
        ))}
        {POWS.map((p) => (
          <span key={p.word} className="pow" style={{ left: px(p.left), top: px(p.top), '--pr': `${p.pr}deg`, '--pd': `${p.pd}s` } as CSSProperties}>
            {p.word}
          </span>
        ))}
      </span>
      <span className="watch">
        <span className="flinch">
          <Wisp size={34} confidence={confidence} />
        </span>
        <span className="corn">
          <span className="kern" style={{ '--kx': '-10px' } as CSSProperties} />
          <span className="kern" style={{ '--kx': '8px', '--kd': '.65s', left: 16 } as CSSProperties} />
          <svg viewBox="0 0 30 34" width="26" height="30" className="cornsvg">
            <circle cx="9" cy="9" r="4.5" fill={cream} stroke={ink} strokeWidth="1.2" />
            <circle cx="16" cy="6.5" r="5" fill={cream} stroke={ink} strokeWidth="1.2" />
            <circle cx="22" cy="9.5" r="4.5" fill={cream} stroke={ink} strokeWidth="1.2" />
            <path d="M3 11 L7 33 H23 L27 11 Z" fill={cream} stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M11 11 L12.5 33 M19 11 L17.5 33" stroke="var(--faction-default-stop-1)" strokeWidth="3.5" />
            <path d="M3 11 L7 33 H23 L27 11 Z" fill="none" stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </span>
      </span>
    </div>
  )
}

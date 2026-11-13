import { useState, type CSSProperties, type ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteError } from './VoteShell'
import { VOTE_REFRAMES } from './voteReframes'
import { factionRoleVars } from '../../utils/factionRoles'
import { factionBodyVars } from '../../utils/factionBodyFace'

/**
 * UA vote UI (#821): a mandala that adds a turning petal ring per rank, from a
 * faint asterisk to a full bloom. The core is punched to the sheet colour so it
 * reads as an aperture. The only surface drawing the mandala at full strength
 * (#849); elsewhere `UaMandala` is faint texture.
 *
 * Motion is reduced-motion-gated CSS; fullness carries the rank when stilled.
 */

/** Per-rank fill (index 1-5); ramp direction differs per theme in CSS (#849). */
const RANK_COLOR = [
  '',
  'var(--faction-ua-rank-1)',
  'var(--faction-ua-rank-2)',
  'var(--faction-ua-rank-3)',
  'var(--faction-ua-rank-4)',
  'var(--faction-ua-rank-5)',
]

const TIERS = VOTE_REFRAMES['ua'].tiers

/** A tapered petal from radius `r0` at angle `ang`, `len` long, `wid` at base. */
function petalPath(c: number, ang: number, r0: number, len: number, wid: number): string {
  const ox = Math.cos(ang)
  const oy = Math.sin(ang)
  const px = -oy
  const py = ox
  const bx = c + ox * r0
  const by = c + oy * r0
  const tx = c + ox * (r0 + len)
  const ty = c + oy * (r0 + len)
  const s1x = bx + px * wid
  const s1y = by + py * wid
  const s2x = bx - px * wid
  const s2y = by - py * wid
  const m1x = tx + px * wid * 0.32
  const m1y = ty + py * wid * 0.32
  const m2x = tx - px * wid * 0.32
  const m2y = ty - py * wid * 0.32
  return `M ${bx} ${by} Q ${s1x} ${s1y} ${m1x} ${m1y} Q ${tx} ${ty} ${m2x} ${m2y} Q ${s2x} ${s2y} ${bx} ${by} Z`
}

function ringStyle(growDelay: number, spinDur: number, reverse: boolean): CSSProperties {
  return {
    ['--ua-grow-delay' as string]: `${growDelay}s`,
    ['--ua-spin-dur' as string]: `${spinDur}s`,
    ['--ua-spin-dir' as string]: reverse ? 'reverse' : 'normal',
  }
}

/** The mandala's SVG children; ornament geometry (§4a). */
function mandalaKids(rank: number, alive: boolean): ReactElement[] {
  const size = 22 + rank * 4
  const c = size / 2
  const maxR = c * 0.84
  const col = RANK_COLOR[rank]
  const deep = RANK_COLOR[Math.min(5, rank + 1)]
  const kids: ReactElement[] = []

  if (rank >= 3) {
    kids.push(<circle key="disc" cx={c} cy={c} r={c * 0.97} fill={col} opacity={0.1} />)
  }

  if (rank === 1) {
    const spokes = 12
    const lines: ReactElement[] = []
    for (let j = 0; j < spokes; j++) {
      const a = (j / spokes) * Math.PI * 2
      lines.push(
        <line
          key={j}
          x1={c + Math.cos(a) * 2.6}
          y1={c + Math.sin(a) * 2.6}
          x2={c + Math.cos(a) * (maxR * 0.92)}
          y2={c + Math.sin(a) * (maxR * 0.92)}
          stroke={col}
          strokeWidth={1.1}
          strokeLinecap="round"
          opacity={0.85}
        />,
      )
    }
    kids.push(
      <g key="aster" className="ua-mandala-ring" style={ringStyle(0, 42, false)}>
        {lines}
      </g>,
    )
    kids.push(<circle key="cd" cx={c} cy={c} r={2.4} fill={RANK_COLOR[5]} />)
  } else {
    const rings = rank - 1
    for (let ring = 1; ring <= rings; ring++) {
      const outer = ring === rings
      const pet = outer ? 6 + rank * 2 : 7 + ring * 3
      const rEnd = (ring / rings) * maxR
      const r0 = ((ring - 1) / rings) * maxR + 1.4
      const len = Math.max(2, (rEnd - r0) * (outer ? 1.22 : 1))
      const wid = outer ? 1.4 : Math.max(1.1, 2.6 - ring * 0.4)
      const fill = ring % 2 ? col : deep
      const petals: ReactElement[] = []
      for (let j = 0; j < pet; j++) {
        const a = (j / pet) * Math.PI * 2 + (ring % 2 ? Math.PI / pet : 0)
        petals.push(
          <path key={j} d={petalPath(c, a, r0, len, wid)} fill={fill} opacity={0.5 + (ring / rings) * 0.45} />,
        )
      }
      const spin = alive ? 16 - ring * 2 : 34 - ring * 4
      kids.push(
        <g key={`r${ring}`} className="ua-mandala-ring" style={ringStyle(ring * 0.06, spin, ring % 2 === 0)}>
          {petals}
        </g>,
      )
    }

    if (rank === 5) {
      const pet = 16
      const flames: ReactElement[] = []
      for (let j = 0; j < pet; j++) {
        const a = (j / pet) * Math.PI * 2 + Math.PI / pet
        flames.push(
          <path key={`fl${j}`} d={petalPath(c, a, maxR * 0.5, maxR * 0.56, 1.1)} fill={RANK_COLOR[5]} opacity={0.6} />,
        )
      }
      kids.push(
        <g key="flame" className="ua-mandala-ring" style={ringStyle(0.3, 11, true)}>
          {flames}
        </g>,
      )
    }

    const florets: ReactElement[] = []
    for (let j = 0; j < 8; j++) {
      florets.push(
        <path
          key={j}
          d={petalPath(c, (j / 8) * Math.PI * 2, 0, 2.2 + Math.min(rank, 3) * 0.5, 1.1)}
          fill={RANK_COLOR[5]}
          opacity={0.9}
        />,
      )
    }
    kids.push(<g key="cf">{florets}</g>)
  }

  kids.push(
    <circle key="core" cx={c} cy={c} r={1.1 + Math.min(rank, 3) * 0.28} fill="var(--faction-ua-vote-core)" />,
  )
  return kids
}

const RANKS = [1, 2, 3, 4, 5]

export default function UaVote({ praxisId, currentValue }: VoteUIProps) {
  const { t } = useTranslation('votes')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)
  const [hovered, setHovered] = useState(0)

  if (!user) {
    return <VoteLoginGate />
  }

  const active = hovered || selected

  return (
    <div
      /* Role map (#2659): all-or-nothing, though only the error line reads it. */
      style={{ ...factionBodyVars('ua'), ...factionRoleVars('ua', 'leaf-vote') }}
    >
      <div
        onMouseLeave={() => setHovered(0)}
        style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', gap: 'var(--space-md)' }}
      >
        {RANKS.map((rank) => {
          const size = 22 + rank * 4
          const emph = rank <= active
          const bloom = active === rank
          const alive = active === 5
          const picked = selected === rank
          return (
            <button
              // Remount so the bloom pop replays on each move.
              key={bloom ? `${rank}-a` : rank}
              disabled={saving}
              onClick={() => void vote(rank)}
              onMouseEnter={() => setHovered(rank)}
              aria-label={t('chrome.rateAria', { value: rank, label: TIERS[rank - 1].label })}
              aria-pressed={picked}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                minWidth: 44,
                minHeight: 44,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                cursor: saving ? 'default' : 'pointer',
              }}
            >
              <span
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-end',
                  filter: emph ? 'none' : 'saturate(0.45) opacity(0.5)',
                  transform: emph ? 'scale(1.08)' : 'scale(0.9)',
                  transformOrigin: 'bottom center',
                  transition: 'filter 0.28s ease, transform 0.28s ease',
                }}
              >
                <span
                  className={alive ? 'ua-mandala-alive' : undefined}
                  style={{
                    position: 'relative',
                    width: size,
                    height: size,
                    transformOrigin: 'center',
                    ['--ua-twist-dur' as string]: `${2 + rank * 0.22}s`,
                  }}
                >
                  {bloom && (
                    <span
                      className="ua-mandala-halo"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        border: '2px solid var(--faction-ua-rank-4)',
                        pointerEvents: 'none',
                        opacity: 0,
                      }}
                    />
                  )}
                  <svg
                    className={bloom ? 'ua-mandala-bloom' : undefined}
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    style={{ position: 'absolute', inset: 0 }}
                  >
                    {mandalaKids(rank, alive)}
                  </svg>
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <VoteError error={error} color="var(--leaf-vote-accent)" />
    </div>
  )
}

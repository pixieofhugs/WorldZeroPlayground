import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteError } from './VoteShell'
import { VOTE_REFRAMES } from './voteReframes'

/**
 * Everymen vote UI (#821): gears that heat cold → ember and turn (odd cw, even
 * ccw) as reached; rank 5 throws sparks. Motion is reduced-motion-gated CSS;
 * stilled, heat/glow still carry the rank.
 */

// Literal var() strings, not template-built: the #806 token guard scans literals.
const GEAR_HEAT = [
  'var(--faction-everymen-vote-heat-1)',
  'var(--faction-everymen-vote-heat-2)',
  'var(--faction-everymen-vote-heat-3)',
  'var(--faction-everymen-vote-heat-4)',
  'var(--faction-everymen-vote-heat-5)',
]
const GEAR_HUB = [
  'var(--faction-everymen-bill-mast-ink)',
  'var(--faction-everymen-bill-mast-ink)',
  'var(--faction-everymen-vote-hub-3)',
  'var(--faction-everymen-vote-hub-4)',
  'var(--faction-everymen-vote-hub-5)',
]
const GEAR_GLOW = [
  'none',
  'var(--faction-everymen-vote-glow-2)',
  'var(--faction-everymen-vote-glow-3)',
  'var(--faction-everymen-vote-glow-4)',
  'var(--faction-everymen-vote-glow-5)',
]

/** Gear diameters (px); ornament geometry. */
const GEAR_SIZES = [32, 35, 37, 40, 42]

/** Rank-5 spark [dx, dy] (px). */
const SPARK_DIRS: [number, number][] = [
  [-16, -20],
  [14, -22],
  [20, -6],
  [-20, -8],
  [6, -26],
  [-8, -24],
]

const TIERS = VOTE_REFRAMES['everymen'].tiers

/**
 * Eight teeth, filled or outlined. Deliberately not `everymenCogs` (#2121):
 * that mark is one solid path with no outline mode, and the unreached outline
 * is this widget's whole contrast.
 */
function teeth(fill: string, stroke: string | undefined) {
  return [0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
    <rect
      key={k}
      x={10.9}
      y={1.4}
      width={2.2}
      height={3.8}
      rx={0.5}
      transform={`rotate(${k * 45} 12 12)`}
      fill={fill}
      stroke={stroke}
      strokeWidth={stroke ? 0.8 : undefined}
    />
  ))
}

export default function EverymenVote({ praxisId, currentValue }: VoteUIProps) {
  const { t } = useTranslation('votes')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)
  const [hovered, setHovered] = useState(0)

  if (!user) {
    return <VoteLoginGate />
  }

  const active = hovered || selected
  const edge = 'var(--faction-everymen-vote-edge)'

  return (
    <div>
      <div
        onMouseLeave={() => setHovered(0)}
        style={{ display: 'flex', gap: 'var(--space-xs)', alignItems: 'center' }}
      >
        {TIERS.map((tier, index) => {
          const reached = active >= tier.value
          const picked = selected === tier.value
          const top = tier.value === 5
          const size = GEAR_SIZES[index]
          const heat = GEAR_HEAT[index]

          const gearStyle: CSSProperties = {
            transformOrigin: 'center',
            filter: reached ? GEAR_GLOW[index] : 'none',
            ['--ev-gear-dur' as string]: `${2.6 + tier.value * 0.4}s`,
          }
          const gearClass = reached
            ? tier.value % 2 === 1
              ? 'ev-gear--cw'
              : 'ev-gear--ccw'
            : undefined

          return (
            <button
              key={tier.value}
              disabled={saving}
              onClick={() => void vote(tier.value)}
              onMouseEnter={() => setHovered(tier.value)}
              aria-label={t('chrome.rateAria', { value: tier.value, label: tier.label })}
              aria-pressed={picked}
              style={{
                position: 'relative',
                border: 'none',
                background: 'transparent',
                padding: 0,
                minWidth: 44,
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: saving ? 'default' : 'pointer',
                transform: picked ? 'scale(1.12)' : 'none',
                transition: 'transform 140ms',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width={size}
                height={size}
                className={gearClass}
                style={gearStyle}
                aria-hidden
              >
                {reached ? teeth(heat, undefined) : teeth('none', edge)}
                <circle
                  cx={12}
                  cy={12}
                  r={7}
                  fill={reached ? heat : 'none'}
                  stroke={reached ? undefined : edge}
                  strokeWidth={reached ? undefined : 1}
                />
                <circle
                  cx={12}
                  cy={12}
                  r={2.5}
                  fill={reached ? GEAR_HUB[index] : 'none'}
                  stroke={reached ? undefined : edge}
                  strokeWidth={reached ? undefined : 1}
                />
              </svg>

              {reached &&
                top &&
                SPARK_DIRS.map((d, i) => {
                  const sparkSize = i % 2 === 1 ? 3 : 2
                  const sparkStyle: CSSProperties = {
                    position: 'absolute',
                    top: '22%',
                    left: '50%',
                    width: sparkSize,
                    height: sparkSize,
                    borderRadius: '50%',
                    background:
                      i % 2 === 1
                        ? 'var(--faction-everymen-vote-spark-a)'
                        : 'var(--faction-everymen-vote-spark-b)',
                    boxShadow: '0 0 4px var(--faction-everymen-vote-spark-glow)',
                    pointerEvents: 'none',
                    // Only the gated keyframe shows it.
                    opacity: 0,
                    ['--ev-sx' as string]: `${d[0]}px`,
                    ['--ev-sy' as string]: `${d[1]}px`,
                    ['--ev-spark-dur' as string]: `${1 + i * 0.15}s`,
                    ['--ev-spark-delay' as string]: `${i * 0.22}s`,
                  }
                  return <span key={i} aria-hidden className="ev-gear-spark" style={sparkStyle} />
                })}
            </button>
          )
        })}
      </div>

      <VoteError error={error} color="var(--everymen-red)" />
    </div>
  )
}

import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteSummary } from './VoteShell'
import { VOTE_REFRAMES } from './voteReframes'

/**
 * Everymen vote UI (#821) — THE GEARWORKS. The 1-5 rating is a row of gears on
 * the union workbench: reach up the scale and each reached gear heats along a
 * cold → ember ramp (its hub staying pale) and begins to turn — odd tiers
 * clockwise, even counter-clockwise — while unreached gears sit as cold
 * edge-only outlines. Hit LEGENDARY (rank 5) and the top gear throws sparks.
 * Replaces the retired approval-stamp drawer.
 *
 * Plugs into the vote dispatcher via the shared {@link useVote} hook so the
 * cast/refetch logic lives in exactly one place. All colour flips light/dark
 * through the [data-theme] cascade (the edge tone and the rank-5 glow), never a
 * `dark` ternary in TS. Every motion is a reduced-motion-gated CSS class (never
 * an inline `animation:`); stilled, the gears keep their heat/glow — which is
 * what carries the rank — and the sparks stay hidden.
 */

// Full literal var() strings, one per tier — NOT built by template literal:
// the #806 factionTokensDeclared guard scans for literal `var(--faction-*)` and
// a `...-heat-${v}` construction reads as the undeclared bare prefix `...-heat-`.
/** Heat ramp + pale hub, one token per tier (cold slate → ember). */
const GEAR_HEAT = [
  'var(--faction-everymen-vote-heat-1)',
  'var(--faction-everymen-vote-heat-2)',
  'var(--faction-everymen-vote-heat-3)',
  'var(--faction-everymen-vote-heat-4)',
  'var(--faction-everymen-vote-heat-5)',
]
const GEAR_HUB = [
  'var(--faction-everymen-vote-hub-1)',
  'var(--faction-everymen-vote-hub-2)',
  'var(--faction-everymen-vote-hub-3)',
  'var(--faction-everymen-vote-hub-4)',
  'var(--faction-everymen-vote-hub-5)',
]
/** Glow filter per tier (tier 1 gets none); the rank-5 entry flips in the dark cascade. */
const GEAR_GLOW = [
  'none',
  'var(--faction-everymen-vote-glow-2)',
  'var(--faction-everymen-vote-glow-3)',
  'var(--faction-everymen-vote-glow-4)',
  'var(--faction-everymen-vote-glow-5)',
]

/** Per-tier gear diameter (px) — ornament geometry, kept raw. */
const GEAR_SIZES = [32, 35, 37, 40, 42]

/** Rank-5 spark trajectories [dx, dy] (px) — ornament geometry, kept raw. */
const SPARK_DIRS: [number, number][] = [
  [-16, -20],
  [14, -22],
  [20, -6],
  [-20, -8],
  [6, -26],
  [-8, -24],
]

const TIERS = VOTE_REFRAMES['everymen'].tiers

/** Eight gear teeth — filled (reached) or a thin edge outline (unreached). */
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

export default function EverymenVote({ praxisId, currentValue, points, totalVotes }: VoteUIProps) {
  const { t } = useTranslation('votes')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)
  const [hovered, setHovered] = useState(0)

  if (!user) {
    return <VoteLoginGate />
  }

  const active = hovered || selected
  const caption = active ? TIERS[active - 1].label : t('chrome.everymen.idle')
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
              aria-label={t('chrome.everymen.rateAria', { value: tier.value, label: tier.label })}
              aria-pressed={picked}
              style={{
                position: 'relative',
                border: 'none',
                background: 'transparent',
                padding: 0,
                // ≥44px touch target (WCAG); the gear floats centred inside.
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
                    // Hidden at rest; the keyframe fades it in only when motion is allowed.
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

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--space-sm)',
          marginTop: 'var(--space-sm)',
          minHeight: 20,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--faction-everymen-card-font)',
            // eslint-disable-next-line local/no-raw-style-values -- ornament: the widget's tier word is part of the mark, struck at the design's 17 in the poster face (#841, design-fidelity.md standing carve-out)
            fontSize: 17,
            letterSpacing: '0.06em',
            color: active ? 'var(--everymen-red)' : 'var(--everymen-muted)',
            transition: 'color 140ms',
          }}
        >
          {caption}
        </span>
        {selected > 0 && (
          <span
            style={{
              fontSize: 'var(--text-xs)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--everymen-muted)',
            }}
          >
            {`· ${t('chrome.everymen.tag')}`}
          </span>
        )}
      </div>

      <VoteSummary
        selected={selected}
        points={points}
        totalVotes={totalVotes}
        error={error}
        theme={{
          muted: 'var(--everymen-muted)',
          accent: 'var(--everymen-red)',
          accentFont: 'var(--faction-everymen-card-font)',
          errorColor: 'var(--everymen-red)',
          avgLetterSpacing: '0.06em',
        }}
      />
    </div>
  )
}

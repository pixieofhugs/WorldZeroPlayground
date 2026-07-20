import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteSummary } from './VoteShell'
import { VOTE_REFRAMES } from './voteReframes'

/**
 * The Ephemerists vote UI (#821) — THE CONSTELLATION ATTESTATION. The 1-5
 * approval is a night-plate constellation: each reached star lights gold and a
 * dashed gold line ties the reached stars together (apocryphal → the whitened
 * CANONICAL star at V). Rank-5 twinkles with corner sparkles. It reframes the
 * vote as "how well does the filed record hold up in the sky of the archive?"
 *
 * The plate is a fixed night surface that reads in BOTH themes (like coven's
 * moon plate), so its inner colours do not flip through the cascade — only the
 * caption ink does, via the already-flipping --eph-rubric/--eph-muted tokens
 * (never a `dark ? a : b` ternary; §8). Plugs into the vote dispatcher through
 * the shared {@link useVote} hook so cast/refetch/tally logic lives in one
 * place. Every motion is a reduced-motion-gated CSS class (.eph-vote-star /
 * .eph-vote-sparkle) — the stars still light and the line still connects when
 * stilled; motion is decoration, not meaning.
 */

/** Star anchor points on the 284×68 plate — ornament geometry, kept raw. */
const STAR_POINTS = [
  [24, 44],
  [80, 18],
  [136, 50],
  [196, 20],
  [256, 42],
]
const PLATE_W = 284
const PLATE_H = 68
/** Touch-target box centred on each star (WCAG ≥44px). */
const HIT = 44

/** Faint background dust motes scattered across the plate — ornament, raw. */
const DUST = [
  [40, 12],
  [110, 60],
  [172, 10],
  [232, 60],
  [270, 16],
  [60, 54],
]
/** Corner-sparkle offsets around the rank-5 star (marginLeft/Top from centre). */
const SPARK_SPOTS = [
  [-11, -9],
  [12, -8],
  [11, 12],
  [-12, 9],
]

/** A five-point star, and a four-point twinkle spark. */
const STAR_D = 'M12 0.5 L13 10.6 L23.5 12 L13 13.4 L12 23.5 L11 13.4 L0.5 12 L11 10.6 Z'
const SPARK_D =
  'M12 2c.4 4.6 1.4 6.6 6 7-4.6.4-5.6 2.4-6 7-.4-4.6-1.4-6.6-6-7 4.6-.4 5.6-2.4 6-7z'

const TIERS = VOTE_REFRAMES['ephemerists'].tiers

export default function EphemeristsVote({
  praxisId,
  currentValue,
  points,
  totalVotes,
}: VoteUIProps) {
  const { t } = useTranslation('votes')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)
  const [hovered, setHovered] = useState(0)

  if (!user) {
    return <VoteLoginGate />
  }

  const active = hovered || selected
  const caption = active ? TIERS[active - 1].label : t('chrome.ephemerists.idle')
  // Reached stars, in order, connected head-to-tail by the dashed gold line.
  const linePts = STAR_POINTS.slice(0, active)
    .map(([x, y]) => `${x},${y}`)
    .join(' ')

  return (
    <div>
      <div
        onMouseLeave={() => setHovered(0)}
        style={{
          position: 'relative',
          width: PLATE_W,
          height: PLATE_H,
          maxWidth: '100%',
          background:
            'radial-gradient(130% 160% at 50% -10%, var(--faction-ephemerists-vote-plate-from), var(--faction-ephemerists-vote-plate-to))',
          borderRadius: 6,
          border: '1px solid var(--faction-ephemerists-vote-plate-border)',
          boxShadow: 'inset 0 1px 6px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Dust + the constellation line, behind the star buttons. */}
        <svg
          viewBox={`0 0 ${PLATE_W} ${PLATE_H}`}
          width={PLATE_W}
          height={PLATE_H}
          aria-hidden
          style={{ position: 'absolute', inset: 0, maxWidth: '100%', pointerEvents: 'none' }}
        >
          {DUST.map(([x, y], index) => (
            <circle
              key={`dust${index}`}
              cx={x}
              cy={y}
              r={0.8}
              fill="var(--faction-ephemerists-vote-dust)"
              opacity={0.5}
            />
          ))}
          {active >= 2 && (
            <polyline
              points={linePts}
              fill="none"
              stroke="var(--faction-ephemerists-vote-line)"
              strokeWidth={1.4}
              strokeDasharray="3 3"
              opacity={0.9}
              style={{ filter: 'drop-shadow(0 0 3px rgba(212, 171, 85, 0.85))' }}
            />
          )}
        </svg>

        {TIERS.map((tier, index) => {
          const [x, y] = STAR_POINTS[index]
          const reached = active >= tier.value
          const picked = selected === tier.value
          const top = tier.value === 5
          const size = top ? 28 : 21
          const twinkling = reached && !top
          const buttonStyle: CSSProperties = {
            position: 'absolute',
            left: x - HIT / 2,
            top: y - HIT / 2,
            width: HIT,
            height: HIT,
            border: 'none',
            background: 'transparent',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: saving ? 'default' : 'pointer',
            transform: picked ? 'scale(1.18)' : 'none',
            transition: 'transform 150ms',
            ['--tw-delay' as string]: `${index * 0.4}s`,
          }
          return (
            <button
              key={tier.value}
              disabled={saving}
              onClick={() => void vote(tier.value)}
              onMouseEnter={() => setHovered(tier.value)}
              aria-label={t('chrome.ephemerists.rateAria', { value: tier.value, label: tier.label })}
              aria-pressed={picked}
              className={twinkling ? 'eph-vote-star' : undefined}
              style={buttonStyle}
            >
              <svg
                viewBox="0 0 24 24"
                width={size}
                height={size}
                style={{
                  overflow: 'visible',
                  filter: reached ? 'drop-shadow(0 0 5px rgba(240, 211, 120, 0.95))' : 'none',
                }}
              >
                <path
                  d={STAR_D}
                  fill={
                    reached
                      ? top
                        ? 'var(--faction-ephemerists-vote-star-top)'
                        : 'var(--faction-ephemerists-vote-star-on)'
                      : 'var(--faction-ephemerists-vote-star-off)'
                  }
                  opacity={reached ? 1 : 0.85}
                />
                <circle
                  cx={12}
                  cy={12}
                  r={reached ? (top ? 2.4 : 1.9) : 1.4}
                  fill={
                    reached
                      ? top
                        ? 'var(--faction-ephemerists-vote-core-top)'
                        : 'var(--faction-ephemerists-vote-core-on)'
                      : 'var(--faction-ephemerists-vote-core-off)'
                  }
                />
              </svg>
              {reached &&
                top &&
                SPARK_SPOTS.map(([mx, my], sparkIndex) => (
                  <span
                    key={`sp${sparkIndex}`}
                    aria-hidden
                    className="eph-vote-sparkle"
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: 9,
                      height: 9,
                      marginLeft: mx,
                      marginTop: my,
                      pointerEvents: 'none',
                      ['--tw-delay' as string]: `${sparkIndex * 0.2}s`,
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="100%" height="100%">
                      <path d={SPARK_D} fill="var(--faction-ephemerists-vote-spark)" />
                    </svg>
                  </span>
                ))}
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
            fontFamily: 'var(--eph-serif)',
            fontStyle: 'italic',
            fontSize: 'var(--text-content)',
            letterSpacing: '0.02em',
            color: active ? 'var(--eph-rubric)' : 'var(--eph-muted)',
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
              color: 'var(--eph-muted)',
            }}
          >
            {`· ${t('chrome.ephemerists.tag')}`}
          </span>
        )}
      </div>

      <VoteSummary
        selected={selected}
        points={points}
        totalVotes={totalVotes}
        error={error}
        theme={{
          muted: 'var(--eph-muted)',
          accent: 'var(--eph-rubric)',
          accentFont: 'var(--eph-display)',
          errorColor: 'var(--eph-rubric)',
          avgLetterSpacing: '0.02em',
        }}
      />
    </div>
  )
}

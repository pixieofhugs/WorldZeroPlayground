import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteSummary } from './VoteShell'
import { VOTE_REFRAMES } from './voteReframes'

/**
 * Cozy Coven vote UI (#821) — the 1-5 rating rendered as witchy MOON PHASES on a
 * night plate. Each reached moon waxes gold toward full; the rank-5 moon gets a
 * little face and sparkles. No recombination was ever needed here: the
 * moon phases were always the PINK faction's metaphor. The prototype files them
 * under a "WOW" heading only because both identities were still called Warriors
 * of Whimsy when it was drawn (ADR-0050). The plate is a night surface that reads in both themes, so
 * its inner colours do not flip — only the caption ink does.
 *
 * Plugs into the vote dispatcher via the shared {@link useVote} hook so the
 * cast logic lives in exactly one place. All motion is a reduced-motion-
 * gated CSS class (never inline `animation:`); a stilled plate still fills.
 *
 * #840 restored two things from the source: the PROMPT the design writes above
 * the plate ("how'd this land?"), and the caption at the prototype's own 19px
 * Caveat rather than the --text-content floor — ornament type keeps its drawn
 * size (§4a). The rest of the widget was already a faithful port.
 */

const R = 12
/** SVG path for a moon lit to fraction `f` (0 = new, 1 = full). */
function phasePath(f: number): string {
  const rx = R * (1 - 2 * f)
  const sweep = rx > 0 ? 0 : 1
  return `M15 ${15 - R} A${R} ${R} 0 0 1 15 ${15 + R} A${Math.abs(rx).toFixed(2)} ${R} 0 0 ${sweep} 15 ${15 - R}Z`
}

const SPARK_D =
  'M12 2c.4 4.6 1.4 6.6 6 7-4.6.4-5.6 2.4-6 7-.4-4.6-1.4-6.6-6-7 4.6-.4 5.6-2.4 6-7z'

/** Sparkle offsets around the rank-5 moon — ornament geometry, kept raw. */
const SPARK_SPOTS: CSSProperties[] = [
  { top: 0, left: -2 },
  { top: -3, right: 0 },
  { bottom: 4, right: -5 },
  { top: 8, left: -5 },
]
/** Dust motes scattered across the plate — ornament geometry, kept raw. */
const DUST_SPOTS = [
  [12, 10],
  [62, 34],
  [118, 12],
  [168, 30],
  [196, 14],
  [46, 40],
]

const TIERS = VOTE_REFRAMES['coven'].tiers

export default function CovenVote({ praxisId, currentValue, points, totalVotes }: VoteUIProps) {
  const { t } = useTranslation('votes')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)
  const [hovered, setHovered] = useState(0)

  if (!user) {
    return <VoteLoginGate />
  }

  const active = hovered || selected
  const caption = active ? TIERS[active - 1].label : t('chrome.coven.idle')

  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--faction-coven-card-font)',
          fontWeight: 700,
          fontSize: 'var(--text-content)',
          color: 'var(--faction-coven-vote-off)',
          marginBottom: 'var(--space-xs)',
        }}
      >
        {t('chrome.coven.prompt')}
      </div>

      <div
        onMouseLeave={() => setHovered(0)}
        style={{
          position: 'relative',
          display: 'flex',
          gap: 'var(--space-sm)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-sm) var(--space-md)',
          borderRadius: 12,
          background:
            'radial-gradient(120% 150% at 50% -20%, var(--faction-coven-moon-plate-from), var(--faction-coven-moon-plate-to))',
          border: '1px solid var(--faction-coven-moon-plate-border)',
          boxShadow: 'inset 0 1px 8px rgba(0, 0, 0, 0.5)',
        }}
      >
        {DUST_SPOTS.map(([x, y], index) => (
          <span
            key={`dust${index}`}
            aria-hidden
            className="coven-moon-dust"
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 5,
              height: 5,
              opacity: 0.7,
              pointerEvents: 'none',
              ['--tw-delay' as string]: `${index * 0.4}s`,
            }}
          >
            <svg viewBox="0 0 24 24" width={5} height={5}>
              <path d={SPARK_D} fill="var(--faction-coven-moon-dust)" />
            </svg>
          </span>
        ))}

        {TIERS.map((tier) => {
          const reached = active >= tier.value
          const picked = selected === tier.value
          const top = tier.value === 5
          const size = top ? 40 : 30
          return (
            <button
              key={tier.value}
              disabled={saving}
              onClick={() => void vote(tier.value)}
              onMouseEnter={() => setHovered(tier.value)}
              aria-label={t('chrome.coven.rateAria', { value: tier.value, label: tier.label })}
              aria-pressed={picked}
              style={{
                position: 'relative',
                border: 'none',
                background: 'transparent',
                padding: 0,
                // ≥44px touch target; the moon floats centred inside.
                minWidth: 44,
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: saving ? 'default' : 'pointer',
                transform: picked ? 'scale(1.12)' : 'none',
                transition: 'transform 150ms',
              }}
            >
              <svg
                viewBox="0 0 30 30"
                width={size}
                height={size}
                style={{
                  overflow: 'visible',
                  filter: reached ? 'drop-shadow(0 0 6px rgba(190, 120, 225, 0.6))' : 'none',
                }}
              >
                <circle
                  cx={15}
                  cy={15}
                  r={R}
                  fill={reached ? 'var(--faction-coven-moon-disc-on)' : 'var(--faction-coven-moon-disc-off)'}
                />
                <path
                  d={phasePath(tier.value / 5)}
                  fill={reached ? 'var(--faction-coven-moon-gold)' : 'var(--faction-coven-moon-lit-off)'}
                />
                <circle
                  cx={15}
                  cy={15}
                  r={R}
                  fill="none"
                  stroke={reached ? 'var(--faction-coven-moon-ring-on)' : 'var(--faction-coven-moon-ring-off)'}
                  strokeWidth={1.2}
                />
                {reached && top && (
                  <g>
                    <path d="M10.6 13.6 Q11.9 12.1 13.2 13.6" fill="none" stroke="var(--faction-coven-moon-face)" strokeWidth={1.2} strokeLinecap="round" />
                    <path d="M16.8 13.6 Q18.1 12.1 19.4 13.6" fill="none" stroke="var(--faction-coven-moon-face)" strokeWidth={1.2} strokeLinecap="round" />
                    <path d="M12 17.4 Q15 20 18 17.4" fill="none" stroke="var(--faction-coven-moon-face)" strokeWidth={1.3} strokeLinecap="round" />
                    <circle cx={10.6} cy={16.4} r={1.6} fill="var(--faction-coven-moon-cheek)" />
                    <circle cx={19.4} cy={16.4} r={1.6} fill="var(--faction-coven-moon-cheek)" />
                    <path d={SPARK_D} transform="translate(21 7) scale(0.22) translate(-12 -12)" fill="var(--faction-coven-moon-star)" />
                  </g>
                )}
              </svg>
              {reached &&
                top &&
                SPARK_SPOTS.map((spot, index) => (
                  <span
                    key={`sp${index}`}
                    aria-hidden
                    className="coven-moon-sparkle"
                    style={{
                      position: 'absolute',
                      ...spot,
                      width: index % 2 ? 8 : 11,
                      height: index % 2 ? 8 : 11,
                      pointerEvents: 'none',
                      ['--tw-delay' as string]: `${index * 0.18}s`,
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="100%" height="100%">
                      <path d={SPARK_D} fill="var(--faction-coven-moon-gold)" />
                    </svg>
                  </span>
                ))}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)', minHeight: 20 }}>
        <span
          style={{
            fontFamily: 'var(--faction-coven-card-font)',
            fontWeight: 700,
            // eslint-disable-next-line local/no-raw-style-values -- ornament exemption: the design's own caption size (19, Caveat), not the --text-* ramp (§4a)
            fontSize: 19,
            letterSpacing: '0.02em',
            color: active ? 'var(--faction-coven-vote-on)' : 'var(--faction-coven-vote-off)',
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
              color: 'var(--faction-coven-vote-off)',
            }}
          >
            {`· ${t('chrome.coven.tag')}`}
          </span>
        )}
      </div>

      <VoteSummary
        selected={selected}
        points={points}
        totalVotes={totalVotes}
        error={error}
        theme={{
          muted: 'var(--faction-coven-card-muted)',
          accent: 'var(--faction-coven)',
          accentFont: 'var(--faction-coven-card-font)',
          errorColor: 'var(--color-danger)',
        }}
      />
    </div>
  )
}

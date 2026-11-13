import { useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../hooks/useTheme'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteError } from './VoteShell'
import { VOTE_REFRAMES } from './voteReframes'

/**
 * Cozy Coven vote UI (#821): moon phases on a night plate in dark; in light, a
 * sun whose `level * 2 + 2` rays grow with the level (#2020). Rank 5 gets a
 * face and sparkles.
 *
 * A `useTheme` ternary, not the cascade, because the motif is geometry (no
 * custom property carries a `<path d>`); colours are still tokens. Only one
 * plate is built, so the markup holds five controls, not ten.
 *
 * Motion is reduced-motion-gated CSS classes, shared by both motifs; no cast
 * burst in either theme.
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

/**
 * Sun rays, ported from `.design-sync/coven-stamps/VoteStamp.dc.html`. Rank 5
 * overflows the 30x30 field, hence `overflow: visible`.
 */
function sunRays(level: number): { x1: number; y1: number; x2: number; y2: number }[] {
  const disc = 7 + level * 0.9
  const total = level * 2 + 2
  return Array.from({ length: total }, (_unused, index) => {
    const angle = (index / total) * Math.PI * 2
    return {
      x1: 15 + Math.cos(angle) * (disc + 2.4),
      y1: 15 + Math.sin(angle) * (disc + 2.4),
      x2: 15 + Math.cos(angle) * (disc + 5.6),
      y2: 15 + Math.sin(angle) * (disc + 5.6),
    }
  })
}

function dustMotes(fill: string): ReactNode {
  return DUST_SPOTS.map(([x, y], index) => (
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
        <path d={SPARK_D} fill={fill} />
      </svg>
    </span>
  ))
}

function rankSparkles(fill: string): ReactNode {
  return SPARK_SPOTS.map((spot, index) => (
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
        <path d={SPARK_D} fill={fill} />
      </svg>
    </span>
  ))
}

const PLATE: CSSProperties = {
  position: 'relative',
  display: 'flex',
  gap: 'var(--space-sm)',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'var(--space-sm) var(--space-md)',
  borderRadius: 12,
}

const MOON_PLATE: CSSProperties = {
  ...PLATE,
  background:
    'radial-gradient(120% 150% at 50% -20%, var(--faction-coven-moon-plate-from), var(--faction-coven-moon-plate-to))',
  border: '1px solid var(--faction-coven-moon-plate-border)',
  // ornament (#1609): an inset well on an always-dark plate, not a cast, so
  // `--color-cast-shadow` doesn't apply. Stays raw (legacy list).
  boxShadow: 'inset 0 1px 8px rgba(0, 0, 0, 0.5)',
}

const SUN_PLATE: CSSProperties = {
  ...PLATE,
  background:
    'radial-gradient(120% 150% at 50% -20%, var(--faction-coven-sun-plate-from), var(--faction-coven-sun-plate-to))',
  border: '1px solid var(--faction-coven-sun-plate-border)',
  // New paint goes in CSS even in a grandfathered file (#1853).
  boxShadow: 'var(--faction-coven-sun-plate-shadow)',
}

/** One night rank: the phase disc, its face at rank 5, its sparkles (#821). */
function moonMark(value: number, reached: boolean, top: boolean, size: number): ReactNode {
  return (
    <>
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
          d={phasePath(value / 5)}
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
      {reached && top && rankSparkles('var(--faction-coven-moon-gold)')}
    </>
  )
}

/** One day rank: the ray fan, the disc, its face at rank 5, its sparkles (#2020). */
function sunMark(value: number, reached: boolean, top: boolean, size: number): ReactNode {
  return (
    <>
      <svg
        viewBox="0 0 30 30"
        width={size}
        height={size}
        style={{
          overflow: 'visible',
          filter: reached ? 'drop-shadow(0 0 6px var(--faction-coven-sun-glow))' : 'none',
        }}
      >
        {sunRays(value).map((ray, index) => (
          <line
            key={`ray${index}`}
            x1={ray.x1}
            y1={ray.y1}
            x2={ray.x2}
            y2={ray.y2}
            stroke={reached ? 'var(--faction-coven-sun-gold)' : 'var(--faction-coven-sun-lit-off)'}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        ))}
        <circle
          cx={15}
          cy={15}
          r={7 + value * 0.9}
          fill={reached ? 'var(--faction-coven-sun-disc-on)' : 'var(--faction-coven-sun-disc-off)'}
          stroke={reached ? 'var(--faction-coven-sun-ring-on)' : 'var(--faction-coven-sun-ring-off)'}
          strokeWidth={1.2}
        />
        {reached && top && (
          <g>
            <path d="M11.2 13.8 Q12.4 12.4 13.6 13.8" fill="none" stroke="var(--faction-coven-sun-face)" strokeWidth={1.2} strokeLinecap="round" />
            <path d="M16.4 13.8 Q17.6 12.4 18.8 13.8" fill="none" stroke="var(--faction-coven-sun-face)" strokeWidth={1.2} strokeLinecap="round" />
            <path d="M12.2 17.2 Q15 19.6 17.8 17.2" fill="none" stroke="var(--faction-coven-sun-face)" strokeWidth={1.3} strokeLinecap="round" />
            <circle cx={11} cy={16.4} r={1.5} fill="var(--faction-coven-sun-cheek)" />
            <circle cx={19} cy={16.4} r={1.5} fill="var(--faction-coven-sun-cheek)" />
            <path d={SPARK_D} transform="translate(21 7) scale(0.22) translate(-12 -12)" fill="var(--faction-coven-sun-gold)" />
          </g>
        )}
      </svg>
      {reached && top && rankSparkles('var(--faction-coven-sun-gold)')}
    </>
  )
}

export default function CovenVote({ praxisId, currentValue }: VoteUIProps) {
  const { t } = useTranslation('votes')
  const { theme } = useTheme()
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)
  const [hovered, setHovered] = useState(0)

  if (!user) {
    return <VoteLoginGate />
  }

  // The only theme read; downstream uses `sun`.
  const sun = theme === 'light'
  const active = hovered || selected

  return (
    <div>
      <div onMouseLeave={() => setHovered(0)} style={sun ? SUN_PLATE : MOON_PLATE}>
        {sun
          ? dustMotes('var(--faction-coven-sun-dust)')
          : dustMotes('var(--faction-coven-moon-dust)')}

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
                transition: 'transform 150ms',
              }}
            >
              {sun
                ? sunMark(tier.value, reached, top, size)
                : moonMark(tier.value, reached, top, size)}
            </button>
          )
        })}
      </div>

      <VoteError error={error} color="var(--color-danger)" />
    </div>
  )
}

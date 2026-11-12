import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useMotionTick } from '../../hooks/useMotion'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteError } from './VoteShell'

/**
 * Albescent vote UI (#843): ferrofluid, ported from the design handoff
 * (ADR-0049). It wears the neutral na spectrum (repainting it would un-hide the
 * society, see `factions/albescent.ts`); the flourish is each dot morphing
 * between polygon lobe counts on a shared clock (ADR-0048).
 *
 * No tier words (#783, ADR-0048): `voteReframes` has no `albescent` entry.
 *
 * Motion is gated: the bob via `.spectrum-dot--reached`, the morph via
 * {@link useMotionTick} (#2622). Stilled, it reads and votes the same.
 */

/** Rising blob diameters (px) and gap; ornament geometry (§4a). */
const DOT_SIZES = [22, 24, 26, 28, 30]
const GAP = 14

/**
 * The row is one windowed rainbow: each blob paints a `SPAN`-wide gradient
 * offset by its position. Buttons must stay exactly `size` wide with `GAP`.
 */
const SPAN = DOT_SIZES.reduce((total, size) => total + size, 0) + (DOT_SIZES.length - 1) * GAP

/** Lobe counts the blob morphs through. 64 ≈ a circle at this radius. */
const LOBE_SEQUENCE = [64, 3, 4, 5, 6]
const TICK_MS = 120
/** How long one lobe count is held. */
const MORPH_STEP_MS = 1700
const MORPH_TRANSITION =
  'clip-path .85s cubic-bezier(.65,0,.35,1), -webkit-clip-path .85s cubic-bezier(.65,0,.35,1), transform .18s'

/**
 * A 48-point `polygon()` tracing a regular `sides`-gon. Fixed point count so
 * CSS can tween between lobe counts (polygons need equal vertex counts).
 */
function polyClipN(sides: number): string {
  const POINTS = 48
  const effectiveSides = sides < 3 ? 64 : sides
  const segment = (2 * Math.PI) / effectiveSides
  const points: string[] = []
  for (let index = 0; index < POINTS; index++) {
    const theta = (index / POINTS) * Math.PI * 2 - Math.PI / 2
    const angle = (((theta % segment) + segment) % segment) - segment / 2
    const radius = Math.cos(Math.PI / effectiveSides) / Math.cos(angle)
    points.push(
      `${(50 + 48 * radius * Math.cos(theta)).toFixed(1)}% ${(50 + 48 * radius * Math.sin(theta)).toFixed(1)}%`,
    )
  }
  return `polygon(${points.join(',')})`
}

export default function AlbescentVote({
  praxisId,
  currentValue,
}: VoteUIProps) {
  const { t } = useTranslation('votes')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)
  const [hovered, setHovered] = useState(0)
  const tick = useMotionTick(TICK_MS)

  if (!user) {
    return <VoteLoginGate />
  }

  const active = hovered || selected
  const step = Math.floor((tick * TICK_MS) / MORPH_STEP_MS)
  let offset = 0

  return (
    <div>
      <div
        onMouseLeave={() => setHovered(0)}
        style={{ display: 'flex', gap: GAP, alignItems: 'center' }}
      >
        {DOT_SIZES.map((size, index) => {
          const value = index + 1
          const reached = active >= value
          const picked = selected === value
          const top = value === 5
          const glow = `var(--spectrum-glow-${value})`
          const positionX = -offset
          offset += size + GAP
          const clip = polyClipN(LOBE_SEQUENCE[(step + index) % LOBE_SEQUENCE.length])
          const dotStyle: CSSProperties = {
            width: size,
            height: size,
            clipPath: clip,
            WebkitClipPath: clip,
            transition: MORPH_TRANSITION,
            // `-dot-fill`, not `-dot-ring` (#2608): this blob sits on
            // `.alb-prism`'s multiply sweep, where the ring reads 2.70:1.
            backgroundColor: reached ? 'transparent' : 'var(--faction-default-dot-fill)',
            backgroundImage: reached ? 'var(--faction-default-rainbow)' : 'none',
            backgroundRepeat: 'no-repeat',
            backgroundSize: `${SPAN}px ${size}px`,
            backgroundPositionX: `${positionX}px`,
            // Clipped, so the glow must be a drop-shadow, not a box-shadow.
            filter: reached
              ? `drop-shadow(0 0 4px color-mix(in srgb, ${glow} 67%, transparent))${
                  top ? ` drop-shadow(0 0 7px color-mix(in srgb, ${glow} 53%, transparent))` : ''
                }`
              : 'none',
            // Read by .spectrum-dot--reached.
            ['--spec-dur' as string]: `${1.9 - value * 0.18}s`,
            ['--spec-delay' as string]: `${value * 0.12}s`,
            ['--spec-bounce' as string]: `${-2 - value * 1.6}px`,
          }
          return (
            <button
              key={value}
              disabled={saving}
              onClick={() => void vote(value)}
              onMouseEnter={() => setHovered(value)}
              /* Plain form: no tier `{{label}}` to interpolate (#783). */
              aria-label={t('chrome.rateAriaPlain', { value })}
              aria-pressed={picked}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                // Exactly `size` wide for the windowing; 44px tall tap target.
                width: size,
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: saving ? 'default' : 'pointer',
                transform: picked ? 'scale(1.14)' : 'none',
                transition: 'transform 140ms',
              }}
            >
              <span className={reached ? 'spectrum-dot--reached' : undefined} style={dotStyle} />
            </button>
          )
        })}
      </div>

      <VoteError error={error} color="var(--color-danger)" />
    </div>
  )
}

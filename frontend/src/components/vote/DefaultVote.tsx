import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteError } from './VoteShell'

/**
 * Unaffiliated / na vote UI — THE SPECTRUM SWEEP. The 1-5 rating is a row of
 * growing dots that, as you reach up the scale, fill left-to-right with the
 * community rainbow (ADR-0039: "every path still open") and bob in a gentle
 * rising wave. It is VoteUI's GLOBAL fallback — what `na` and every themed-but-
 * unskinned faction (e.g. WOW) render — so it borrows no faction's costume; all
 * colour comes from the neutral `--faction-default-*` / `--spectrum-*` tokens
 * and flips light/dark through the [data-theme] cascade (never a `dark`
 * ternary). Same 1-5 data model as every faction; drives the shared
 * {@link useVote} hook so cast/tally logic lives in one place.
 *
 * THE ROW IS ONE GRADIENT, WINDOWED (#842). A single rainbow is stretched across
 * the whole row and each dot shows the slice that falls where the dot actually
 * sits, via `backgroundSize: <row span>` + a negative `backgroundPositionX`. The
 * previous `500% 100%` gave every dot an equal fifth of the spectrum regardless
 * of its size or position, so the 18px dot and the 30px dot spanned the same
 * hues at different rates and the sweep restarted inside each dot — five little
 * rainbows, not one. The rising-wave bob is a reduced-motion-gated CSS class
 * (`.spectrum-dot--reached`); the dot still fills when motion is stilled.
 *
 * The windowing constants are DERIVED from the layout rather than copied from
 * the design's 153px span: our buttons are ≥44px WCAG touch targets, so the row
 * is wider than the prototype's bare dots and the offsets must be measured off
 * the boxes we actually draw, or the gradient would drift out of register with
 * the dots it is painting.
 */

/** Rising dot diameters (px) — ornament geometry, §4a leaves these raw. */
const DOT_SIZES = [18, 20, 23, 26, 30]
/** ≥44px touch target (WCAG) and the pitch between dots — ornament geometry. */
const HIT_SIZE = 44
const ROW_GAP = 9
/** Total row width the single rainbow is stretched across. */
const ROW_SPAN = DOT_SIZES.length * HIT_SIZE + (DOT_SIZES.length - 1) * ROW_GAP
/** The five rungs, as literal values so `votes:na.tier<N>` typechecks.
 *  The words themselves live in the catalog, keyed by rung (#2586). */
const RUNGS = [1, 2, 3, 4, 5] as const

export default function DefaultVote({
  praxisId,
  currentValue,
}: VoteUIProps) {
  const { t } = useTranslation('votes')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)
  const [hovered, setHovered] = useState(0)

  if (!user) {
    return <VoteLoginGate />
  }

  const active = hovered || selected

  return (
    <div>
      <div
        onMouseLeave={() => setHovered(0)}
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          // ornament: the dot row's own pitch, and the ruler the gradient
          // windowing is measured against (§4a).
          gap: ROW_GAP,
        }}
      >
        {DOT_SIZES.map((size, index) => {
          const value = index + 1
          // Where this dot's left edge lands in the row: whole hit boxes before
          // it, plus the inset that centres the dot inside its own box.
          const dotOffset = index * (HIT_SIZE + ROW_GAP) + (HIT_SIZE - size) / 2
          const reached = active >= value
          const picked = selected === value
          const top = value === 5
          const glow = `var(--spectrum-glow-${value})`
          const dotStyle: CSSProperties = {
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: 'transparent',
            backgroundImage: reached ? 'var(--faction-default-rainbow)' : 'none',
            backgroundRepeat: 'no-repeat',
            // One rainbow across the whole row, windowed to where this dot sits.
            backgroundSize: `${ROW_SPAN}px ${size}px`,
            backgroundPositionX: `${-dotOffset}px`,
            boxShadow: reached
              ? `0 0 8px color-mix(in srgb, ${glow} 60%, transparent), inset 0 0 0 1px color-mix(in srgb, white 50%, transparent)${
                  top ? `, 0 0 16px color-mix(in srgb, ${glow} 53%, transparent)` : ''
                }`
              : 'inset 0 0 0 1.5px var(--faction-default-dot-ring)',
            transition: 'background 140ms, box-shadow 140ms, transform 140ms',
            transform: picked ? 'scale(1.14)' : 'none',
            // Per-dot rising-wave tempo (consumed by .spectrum-dot--reached).
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
              aria-label={t('chrome.rateAria', {
                value,
                label: t(`na.tier${RUNGS[index]}`),
              })}
              aria-pressed={picked}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                // ≥44px touch target (WCAG); the dot floats centred inside.
                // FIXED, not min-: the gradient windowing above measures its
                // offsets off these boxes, so they cannot be free to grow.
                width: HIT_SIZE,
                height: HIT_SIZE,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: saving ? 'default' : 'pointer',
              }}
            >
              <span className={reached ? 'spectrum-dot--reached' : undefined} style={dotStyle} />
            </button>
          )
        })}
      </div>

      {/* The Bebas verdict — the tier word, or `chrome.idle` while untouched —
          and its `· your vote` tag stood here. #2166 struck the row for all
          nine skins: the dots fill to the cast value and the tally states the
          rest, so the words were the same fact a third and fourth time. The
          whole flex row goes rather than an empty one staying behind. */}

      <VoteError error={error} color="var(--color-danger)" />
    </div>
  )
}

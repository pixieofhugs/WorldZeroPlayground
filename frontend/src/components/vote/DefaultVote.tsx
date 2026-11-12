import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteError } from './VoteShell'

/**
 * na vote UI, and VoteUI's global fallback: growing dots filling with the
 * neutral spectrum (ADR-0039), bobbing via the gated `.spectrum-dot--reached`.
 *
 * One windowed gradient across the row (#842), measured off the 44px hit boxes
 * we actually draw rather than the design's bare-dot span.
 */

/** Rising dot diameters (px); ornament geometry (§4a). */
const DOT_SIZES = [18, 20, 23, 26, 30]
const HIT_SIZE = 44
const ROW_GAP = 9
const ROW_SPAN = DOT_SIZES.length * HIT_SIZE + (DOT_SIZES.length - 1) * ROW_GAP
/** Literal so `votes:na.tier<N>` typechecks (#2586). */
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
          // ornament: the pitch the windowing measures against (§4a).
          gap: ROW_GAP,
        }}
      >
        {DOT_SIZES.map((size, index) => {
          const value = index + 1
          // This dot's left edge within the row.
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
            backgroundSize: `${ROW_SPAN}px ${size}px`,
            backgroundPositionX: `${-dotOffset}px`,
            boxShadow: reached
              ? `0 0 8px color-mix(in srgb, ${glow} 60%, transparent), inset 0 0 0 1px color-mix(in srgb, white 50%, transparent)${
                  top ? `, 0 0 16px color-mix(in srgb, ${glow} 53%, transparent)` : ''
                }`
              : 'inset 0 0 0 1.5px var(--faction-default-dot-ring)',
            transition: 'background 140ms, box-shadow 140ms, transform 140ms',
            transform: picked ? 'scale(1.14)' : 'none',
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
              aria-label={t('chrome.rateAria', {
                value,
                label: t(`na.tier${RUNGS[index]}`),
              })}
              aria-pressed={picked}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                // Fixed, not min-: the windowing measures off these boxes.
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

      <VoteError error={error} color="var(--color-danger)" />
    </div>
  )
}

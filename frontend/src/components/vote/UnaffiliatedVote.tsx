import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteSummary } from './VoteShell'

/**
 * Unaffiliated / na vote UI — THE SPECTRUM SWEEP. The 1-5 rating is a row of
 * growing dots that, as you reach up the scale, fill left-to-right with the
 * community rainbow (ADR-0039: "every path still open") and bob in a gentle
 * rising wave. It is VoteUI's GLOBAL fallback — what `na` and every themed-but-
 * unskinned faction (e.g. WOW) render — so it borrows no faction's costume; all
 * colour comes from the neutral `--faction-default-*` / `--spectrum-*` tokens
 * and flips light/dark through the [data-theme] cascade (never a `dark`
 * ternary). Same 1-5 data model as every faction; drives the shared
 * {@link useVote} hook so cast/refetch/tally-override logic lives in one place.
 *
 * Each dot shows its own slice of the single rainbow via a 500%-wide background
 * positioned by index — so no pixel/gap math is needed and the row still reads
 * as one continuous spectrum. The rising-wave bob is a reduced-motion-gated CSS
 * class (`.spectrum-dot--reached`); the dot still fills when motion is stilled.
 */

/** Rising dot diameters (px) — ornament geometry, §4a leaves these raw. */
const DOT_SIZES = [18, 20, 23, 26, 30]
const TIER_KEYS = ['so-so', 'decent', 'good', 'great', 'brilliant'] as const

export default function UnaffiliatedVote({
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
  const caption = active
    ? t(`unaffiliated.${TIER_KEYS[active - 1]}`)
    : t('unaffiliated.idle')

  return (
    <div>
      <div
        onMouseLeave={() => setHovered(0)}
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          maxWidth: 320,
        }}
      >
        {DOT_SIZES.map((size, index) => {
          const value = index + 1
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
            // A 5×-wide rainbow, windowed by index → dot 1 red … dot 5 magenta.
            backgroundSize: '500% 100%',
            backgroundPositionX: `${(index / (DOT_SIZES.length - 1)) * 100}%`,
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
              aria-label={t('chrome.unaffiliated.rateAria', {
                value,
                label: t(`unaffiliated.${TIER_KEYS[index]}`),
              })}
              aria-pressed={picked}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                // ≥44px touch target (WCAG); the dot floats centred inside.
                minWidth: 44,
                minHeight: 44,
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

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)', minHeight: 20 }}>
        <span
          style={{
            fontFamily: 'var(--faction-default-card-font)',
            fontSize: 'var(--text-content)',
            letterSpacing: '0.04em',
            color: active ? 'var(--faction-default-vote-on)' : 'var(--faction-default-vote-off)',
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
              color: 'var(--faction-default-vote-off)',
            }}
          >
            {`· ${t('unaffiliated.tag')}`}
          </span>
        )}
      </div>

      <VoteSummary
        selected={selected}
        points={points}
        totalVotes={totalVotes}
        error={error}
        theme={{
          muted: 'var(--faction-default-card-muted)',
          accent: 'var(--faction-default-card-accent)',
          accentFont: 'var(--faction-default-card-font)',
          errorColor: 'var(--color-danger)',
          avgLetterSpacing: '0.04em',
        }}
      />
    </div>
  )
}

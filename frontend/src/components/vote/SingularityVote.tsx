import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMotionTick } from '../../hooks/useMotion'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteError } from './VoteShell'
import { VOTE_REFRAMES } from './voteReframes'

/**
 * Singularity faction vote UI (#821) — THE TERMINAL DECODE STRIP. The 1-5 rating
 * is five columns of a scrolling terminal read-out: every unreached tier scrambles
 * katakana/symbol noise on a 120ms interval, and each tier you reach RESOLVES to a
 * density glyph (· + * # █) in phosphor green — rank 5 ("verified") locking to cyan.
 * The metaphor is signal decode: noise → weak → signal → clear → verified, measuring
 * how confidently a sealed output holds up to scrutiny.
 *
 * Same 1-5 data model as every other faction — a pure terminal reskin driven by the
 * shared {@link useVote} hook so cast/tally logic lives in one place.
 * Singularity is ALWAYS-DARK: its tokens hold identical terminal values in both
 * themes, so this never touches the [data-theme] cascade.
 *
 * The always-on scramble is a JS interval (a decode strip that stood still would
 * read as broken, not stilled), so it cannot be class-gated like the other widgets'
 * CSS animations. It runs on {@link useMotionTick}, which FREEZES it whenever motion
 * is off — whether the OS asked for reduced motion or the reader turned the Settings
 * switch off (#2622). Frozen, the strip still shows noise vs. resolved glyphs; it
 * just stops churning.
 */

/** Density glyphs a resolved tier prints, tier 1→5: noise floor → solid block. */
const DENSITY = ['·', '+', '*', '#', '█']

/** Katakana + symbol pool the unreached tiers scramble through. */
const SCRAMBLE_CHARS = 'ｱｲｳｴｵｶｷｸｹｺﾊﾋﾌﾍﾎﾐﾑ0123456789#%$*+=<>?/'.split('')

/** Deterministic per-cell glyph from a seed + the animation tick (matches the design). */
function scrambleGlyph(seed: number, tick: number): string {
  const length = SCRAMBLE_CHARS.length
  const index = ((Math.floor(seed * 131 + tick * 71) % length) + length) % length
  return SCRAMBLE_CHARS[index]
}

/** Key geometry (ornament, not layout) — ≥44px touch target. */
const KEY_WIDTH = 46
const KEY_HEIGHT = 44
const SCRAMBLE_INTERVAL_MS = 120

const TIERS = VOTE_REFRAMES['singularity'].tiers

export default function SingularityVote({ praxisId, currentValue }: VoteUIProps) {
  const { t } = useTranslation('votes')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)
  const [hovered, setHovered] = useState(0)
  const tick = useMotionTick(SCRAMBLE_INTERVAL_MS)

  if (!user) {
    return <VoteLoginGate />
  }

  const active = hovered || selected

  return (
    <div style={{ fontFamily: 'var(--font-faction-terminal)' }}>
      <div
        onMouseLeave={() => setHovered(0)}
        // eslint-disable-next-line local/no-raw-style-values -- ornament: the decode strip's 6px column pitch, drawn geometry of the read-out (§4a)
        style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}
      >
        {TIERS.map((tier) => {
          const reached = active >= tier.value
          const picked = selected === tier.value
          const top = tier.value === 5
          const color = top
            ? 'var(--faction-singularity-vote-verified)'
            : 'var(--faction-singularity-vote-reached)'
          // Three stacked read-out lines: resolved density if reached, else churning noise.
          const rows = [0, 1, 2].map((row) => {
            const text = reached
              ? DENSITY[tier.value - 1].repeat(3)
              : scrambleGlyph(tier.value * 30 + row * 3 + 1, tick) +
                scrambleGlyph(tier.value * 30 + row * 3 + 2, tick) +
                scrambleGlyph(tier.value * 30 + row * 3 + 3, tick)
            return (
              <div key={row} style={{ lineHeight: 1 }}>
                {text}
              </div>
            )
          })
          return (
            <button
              key={tier.value}
              disabled={saving}
              onClick={() => void vote(tier.value)}
              onMouseEnter={() => setHovered(tier.value)}
              aria-label={t('chrome.rateAria', { value: tier.value, label: tier.label })}
              aria-pressed={picked}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                // ≥44px touch target; the decode column sits centred inside.
                width: KEY_WIDTH,
                height: KEY_HEIGHT,
                padding: 0,
                border: 'none',
                borderRadius: 2,
                fontFamily: 'var(--font-faction-terminal)',
                fontSize: 'var(--text-lg)',
                letterSpacing: '2px',
                color: reached ? color : 'var(--faction-singularity-vote-scramble)',
                textShadow: reached ? `0 0 8px ${color}` : 'none',
                background: reached ? 'var(--faction-singularity-vote-reached-bg)' : 'transparent',
                outline: picked ? `1px solid ${color}` : 'none',
                outlineOffset: 2,
                cursor: saving ? 'default' : 'pointer',
                transition: 'color 120ms, background 120ms',
              }}
            >
              {rows}
            </button>
          )
        })}
      </div>

      {/* The terminal read-out caption and its `· your vote` tag stood here.
          #2166 struck the row on all nine skins — the decoded columns already
          resolve to the rank, and the tally below states the aggregate. */}

      <VoteError error={error} color="var(--color-danger)" />
    </div>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMotionTick } from '../../hooks/useMotion'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteError } from './VoteShell'
import { VOTE_REFRAMES } from './voteReframes'

/**
 * Singularity vote UI (#821): a terminal decode strip. Unreached tiers scramble
 * noise; reached ones resolve to density glyphs, rank 5 in cyan. Always-dark
 * tokens, so no theme branch.
 *
 * The scramble is a JS tick via {@link useMotionTick}, frozen when motion is
 * off (#2622); frozen, noise vs. resolved still reads.
 */

const DENSITY = ['·', '+', '*', '#', '█']

const SCRAMBLE_CHARS = 'ｱｲｳｴｵｶｷｸｹｺﾊﾋﾌﾍﾎﾐﾑ0123456789#%$*+=<>?/'.split('')

/** Deterministic per-cell glyph (matches the design). */
function scrambleGlyph(seed: number, tick: number): string {
  const length = SCRAMBLE_CHARS.length
  const index = ((Math.floor(seed * 131 + tick * 71) % length) + length) % length
  return SCRAMBLE_CHARS[index]
}

/** Key geometry; ≥44px touch target. */
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
        // eslint-disable-next-line local/no-raw-style-values -- ornament: decode strip column pitch (§4a)
        style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}
      >
        {TIERS.map((tier) => {
          const reached = active >= tier.value
          const picked = selected === tier.value
          const top = tier.value === 5
          const color = top
            ? 'var(--faction-singularity-bracket)'
            : 'var(--faction-singularity-term-cta-bg)'
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

      <VoteError error={error} color="var(--color-danger)" />
    </div>
  )
}

import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteError } from './VoteShell'
import { VOTE_REFRAMES } from './voteReframes'

/**
 * S.N.I.D.E. vote UI (#821): an amp EQ meter on an always-dark face; rank 5
 * makes the lit segments jump (reduced-motion-gated class).
 */

/** Lit colour, bottom → top. */
const SEG_COLORS = [
  'var(--faction-snide-acid)',
  'var(--faction-snide-acid)',
  'var(--faction-snide-acid)',
  'var(--faction-snide-amber)',
  'var(--faction-snide-pink)',
]

const TIERS = VOTE_REFRAMES['snide'].tiers

export default function SnideVote({ praxisId, currentValue }: VoteUIProps) {
  const { t } = useTranslation('votes')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)
  const [hovered, setHovered] = useState(0)

  if (!user) {
    return <VoteLoginGate />
  }

  const active = hovered || selected
  const party = active >= 5

  return (
    <div>
      <div
        onMouseLeave={() => setHovered(0)}
        style={{
          position: 'relative',
          display: 'flex',
          // eslint-disable-next-line local/no-raw-style-values -- ornament: amp column gap (§4a)
          gap: 5,
          alignItems: 'flex-end',
          // eslint-disable-next-line local/no-raw-style-values -- ornament: amp face inset (§4a)
          padding: '11px 13px',
          background:
            'linear-gradient(var(--faction-snide-amp-panel-from), var(--faction-snide-amp-panel-to))',
          border: '2px solid var(--faction-snide-amp-panel-border)',
          borderRadius: 6,
          // ornament (#1609): inset well on an always-dark panel, as in
          // CovenVote. Raw (legacy list).
          boxShadow:
            'inset 0 2px 7px rgba(0, 0, 0, 0.75), inset 0 0 0 1px var(--faction-snide-amp-panel-sheen)',
        }}
      >
        {/* screws */}
        <span aria-hidden style={{ position: 'absolute', top: 5, left: 5, width: 4, height: 4, borderRadius: '50%', background: 'var(--faction-snide-amp-screw)', boxShadow: 'inset 0 0 0 1px var(--faction-snide-amp-screw-rim)' }} />
        <span aria-hidden style={{ position: 'absolute', top: 5, right: 5, width: 4, height: 4, borderRadius: '50%', background: 'var(--faction-snide-amp-screw)', boxShadow: 'inset 0 0 0 1px var(--faction-snide-amp-screw-rim)' }} />

        {TIERS.map((tier) => {
          const reached = active >= tier.value
          const picked = selected === tier.value
          const cells = [0, 1, 2, 3, 4].map((i) => {
            const lit = reached && i < tier.value
            const litColor = SEG_COLORS[i]
            const cellStyle: CSSProperties = {
              width: 32,
              height: 5,
              borderRadius: 1,
              background: lit ? litColor : 'var(--faction-snide-amp-seg-off)',
              boxShadow: lit ? `0 0 5px ${litColor}` : 'none',
              transition: 'all 90ms',
              ['--amp-dur' as string]: `${0.34 + i * 0.05}s`,
              ['--amp-delay' as string]: `${tier.value * 0.06 + i * 0.04}s`,
            }
            return (
              <span
                key={i}
                aria-hidden
                className={party && lit ? 'snide-amp-party' : undefined}
                style={cellStyle}
              />
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
                flexDirection: 'column-reverse',
                // eslint-disable-next-line local/no-raw-style-values -- ornament: bar-graph segment gap
                gap: 2,
                minWidth: 44,
                minHeight: 44,
                justifyContent: 'flex-end',
                alignItems: 'center',
                padding: 0,
                border: 'none',
                background: 'transparent',
                borderRadius: 2,
                cursor: saving ? 'default' : 'pointer',
                outline: picked ? '1px solid var(--faction-snide-acid)' : 'none',
                outlineOffset: 2,
              }}
            >
              {cells}
            </button>
          )
        })}
      </div>

      <VoteError error={error} color="var(--color-danger)" />
    </div>
  )
}

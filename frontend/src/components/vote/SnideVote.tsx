import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteSummary } from './VoteShell'
import { VOTE_REFRAMES } from './voteReframes'

/**
 * S.N.I.D.E. vote UI (#821) — the 1-5 rating rendered as an amp / EQ METER: five
 * bar-graph columns on a dark amp face. Reached columns light their segments
 * acid → amber → pink; hit ANARCHY (rank 5) and the lit segments jump like a
 * party VU. Replaces the retired rubber-stamp drawer.
 *
 * Plugs into the vote dispatcher via the shared {@link useVote} hook. The amp
 * face is a dark surface that reads in both themes, so its inner colours do not
 * flip — only the caption ink does. Motion is a reduced-motion-gated class.
 */

/** Per-segment lit colour, bottom → top (acid ×3, amber, pink). */
const SEG_COLORS = [
  'var(--faction-snide-acid)',
  'var(--faction-snide-acid)',
  'var(--faction-snide-acid)',
  'var(--faction-snide-amber)',
  'var(--faction-snide-pink)',
]

const TIERS = VOTE_REFRAMES['snide'].tiers

export default function SnideVote({ praxisId, currentValue, points, totalVotes }: VoteUIProps) {
  const { t } = useTranslation('votes')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)
  const [hovered, setHovered] = useState(0)

  if (!user) {
    return <VoteLoginGate />
  }

  const active = hovered || selected
  const party = active >= 5
  const caption = active ? TIERS[active - 1].label : t('chrome.snide.idle')

  return (
    <div>
      <div
        onMouseLeave={() => setHovered(0)}
        style={{
          position: 'relative',
          display: 'flex',
          // eslint-disable-next-line local/no-raw-style-values -- ornament: the amp face's 5px inter-column gap, drawn geometry of the chassis (§4a)
          gap: 5,
          alignItems: 'flex-end',
          // eslint-disable-next-line local/no-raw-style-values -- ornament: the amp face's own inset, the design's 11/13 (§4a)
          padding: '11px 13px',
          background:
            'linear-gradient(var(--faction-snide-amp-panel-from), var(--faction-snide-amp-panel-to))',
          border: '2px solid var(--faction-snide-amp-panel-border)',
          borderRadius: 6,
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
              aria-label={t('chrome.snide.rateAria', { value: tier.value, label: tier.label })}
              aria-pressed={picked}
              style={{
                display: 'flex',
                flexDirection: 'column-reverse',
                // eslint-disable-next-line local/no-raw-style-values -- ornament: 2px inter-segment gap drawing the amp bar-graph, not layout spacing
                gap: 2,
                // ≥44px touch target; the column sits at the bottom.
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

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)', minHeight: 20 }}>
        <span
          style={{
            fontFamily: 'var(--faction-snide-font-marker)',
            // eslint-disable-next-line local/no-raw-style-values -- ornament: marker-scrawled verdict beside the meter, the design's 14; Permanent Marker's optical size is not the text scale (§4a)
            fontSize: 14,
            color: active ? 'var(--faction-snide-acid)' : 'var(--faction-snide-vote-off)',
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
              color: 'var(--faction-snide-vote-off)',
            }}
          >
            {`· ${t('chrome.snide.tag')}`}
          </span>
        )}
      </div>

      <VoteSummary
        selected={selected}
        points={points}
        totalVotes={totalVotes}
        error={error}
        theme={{
          muted: 'var(--color-text-secondary)',
          accent: 'var(--faction-snide)',
          accentFont: 'var(--faction-snide-font-impact)',
          errorColor: 'var(--color-danger)',
        }}
      />
    </div>
  )
}

import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { VoteUIProps } from './VoteUI'
import { useVote } from './useVote'
import { VoteLoginGate, VoteSummary } from './VoteShell'
import { VOTE_REFRAMES } from './voteReframes'

/**
 * Warriors of Whimsy vote UI (#821) — the 1-5 rating rendered as a row of GOOGLY
 * BALLOONS on a warm plate, WOW's first bespoke skin. Reached balloons fill the
 * yellow ramp and bob; the whole bunch group-cheers when you reach the top. This
 * is the balloon variant the prototype bundled with the chronicle chrome (its
 * `.wow-gballoon*` classes) — recoloured to WOW yellow, never coven's gold/plum.
 *
 * Plugs into the vote dispatcher via the shared {@link useVote} hook. Every
 * motion is a reduced-motion-gated CSS class (never inline `animation:`); the
 * balloons still fill and read when stilled.
 */

/** Balloon fill ramp (yellow, deepening) — one token per tier. */
const BALLOON_FILLS = [
  'var(--faction-wow-balloon-1)',
  'var(--faction-wow-balloon-2)',
  'var(--faction-wow-balloon-3)',
  'var(--faction-wow-balloon-4)',
  'var(--faction-wow-balloon-5)',
]

/** Per-tier balloon diameters — ornament geometry, kept raw. */
const BALLOON_SIZES = [30, 33, 36, 39, 44]

const TIERS = VOTE_REFRAMES['wow'].tiers

/** One googly balloon: body, knot, string, two wiggling eyes. */
function Balloon({ fill, reached, size }: { fill: string; reached: boolean; size: number }) {
  const body = reached ? fill : 'transparent'
  const stroke = reached ? 'var(--faction-wow-balloon-4)' : 'var(--faction-wow-balloon-string)'
  return (
    <svg viewBox="0 0 44 60" width={size} height={size * (60 / 44)} style={{ overflow: 'visible' }}>
      {/* string */}
      <path d="M22 46 Q18 52 22 58" fill="none" stroke="var(--faction-wow-balloon-string)" strokeWidth={1.2} strokeLinecap="round" />
      {/* body */}
      <ellipse cx={22} cy={24} rx={19} ry={22} fill={body} stroke={stroke} strokeWidth={reached ? 1.5 : 2} />
      {/* knot */}
      <path d="M19 45 L25 45 L22 49 Z" fill={reached ? fill : 'none'} stroke={stroke} strokeWidth={reached ? 1.5 : 2} strokeLinejoin="round" />
      {/* highlight */}
      {reached && <ellipse cx={15} cy={16} rx={4} ry={6} fill="rgba(255,255,255,0.5)" />}
      {/* googly eyes */}
      <g>
        <circle cx={16} cy={24} r={5} fill="#fff" stroke="var(--faction-wow-balloon-eye)" strokeWidth={1} />
        <circle cx={28} cy={24} r={5} fill="#fff" stroke="var(--faction-wow-balloon-eye)" strokeWidth={1} />
        <circle className="wow-balloon-eye" cx={16} cy={25.5} r={2.2} fill="var(--faction-wow-balloon-eye)" />
        <circle className="wow-balloon-eye" cx={28} cy={25.5} r={2.2} fill="var(--faction-wow-balloon-eye)" />
      </g>
    </svg>
  )
}

export default function WowVote({ praxisId, currentValue, points, totalVotes }: VoteUIProps) {
  const { t } = useTranslation('votes')
  const { user, selected, saving, error, vote } = useVote(praxisId, currentValue)
  const [hovered, setHovered] = useState(0)

  if (!user) {
    return <VoteLoginGate />
  }

  const active = hovered || selected
  const cheering = active >= 5
  const caption = active ? TIERS[active - 1].label : t('chrome.wow.idle')

  return (
    <div>
      <div
        onMouseLeave={() => setHovered(0)}
        className={cheering ? 'wow-balloon-cheer' : undefined}
        style={{
          display: 'flex',
          gap: 'var(--space-xs)',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: 'var(--space-sm) var(--space-md)',
          borderRadius: 12,
          background:
            'linear-gradient(var(--faction-wow-balloon-plate-from), var(--faction-wow-balloon-plate-to))',
          border: '1px solid var(--faction-wow-balloon-plate-border)',
        }}
      >
        {TIERS.map((tier, index) => {
          const reached = active >= tier.value
          const picked = selected === tier.value
          const balloonStyle: CSSProperties = {
            border: 'none',
            background: 'transparent',
            padding: 0,
            minWidth: 44,
            minHeight: 44,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            cursor: saving ? 'default' : 'pointer',
            transform: picked ? 'scale(1.1)' : 'none',
            transition: 'transform 150ms',
            ['--tw-delay' as string]: `${tier.value * 0.09}s`,
          }
          return (
            <button
              key={tier.value}
              disabled={saving}
              onClick={() => void vote(tier.value)}
              onMouseEnter={() => setHovered(tier.value)}
              aria-label={t('chrome.wow.rateAria', { value: tier.value, label: tier.label })}
              aria-pressed={picked}
              style={balloonStyle}
            >
              <span className={reached && !cheering ? 'wow-balloon-float' : undefined} style={{ display: 'flex', ['--tw-delay' as string]: `${tier.value * 0.09}s` }}>
                <Balloon fill={BALLOON_FILLS[index]} reached={reached} size={BALLOON_SIZES[index]} />
              </span>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)', minHeight: 20 }}>
        <span
          style={{
            fontFamily: 'var(--faction-wow-card-font)',
            fontSize: 'var(--text-content)',
            letterSpacing: '0.02em',
            color: active ? 'var(--faction-wow-vote-on)' : 'var(--faction-wow-vote-off)',
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
              color: 'var(--faction-wow-vote-off)',
            }}
          >
            {`· ${t('chrome.wow.tag')}`}
          </span>
        )}
      </div>

      <VoteSummary
        selected={selected}
        points={points}
        totalVotes={totalVotes}
        error={error}
        theme={{
          muted: 'var(--faction-wow-card-muted)',
          accent: 'var(--faction-wow-card-accent)',
          accentFont: 'var(--faction-wow-card-font)',
          errorColor: 'var(--color-danger)',
        }}
      />
    </div>
  )
}

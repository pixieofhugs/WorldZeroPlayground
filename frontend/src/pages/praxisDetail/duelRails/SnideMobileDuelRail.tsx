/**
 * S.N.I.D.E. MOBILE duel rail (#722) — the desktop clipping thumbed down.
 *
 * Two changes and no more: the masthead loses its side-by-side tally (a score
 * pair and a marker-face headline on one phone-width row wrap into mush) and the
 * tally drops to its own full-width scoreboard band under the rule, where it
 * reads as the ransom-note block it is. Single column throughout —
 * SPEC-faction-ui-profile §1a forbids a fixed-px grid on the mobile path.
 *
 * Pure frame, same contract as the desktop skin: every slot arrives already
 * rendered from `DuelCrossLink`, and none of the duel's arithmetic or status
 * branching is visible from here. No wrapper `fontSize` (#769).
 */
import type { CSSProperties } from 'react'
import type { DuelRailSkinProps } from '../DuelCrossLink'

const INK = 'var(--faction-snide-ink)'
const ACID = 'var(--faction-snide-acid)'
const PINK = 'var(--faction-snide-pink)'
const PAPER = 'var(--faction-snide-paper)'
const MARKER = 'var(--faction-snide-font-marker)'

export default function SnideMobileDuelRail({
  accent,
  headline,
  tally,
  note,
  body,
  actions,
}: DuelRailSkinProps) {
  // ponytail: `maxWidth` is intentionally ignored on mobile. The rail is
  // full-bleed inside the phone column, so the desktop archetype-width map has
  // nothing to line up with here.
  const shell: CSSProperties = {
    backgroundColor: INK,
    backgroundImage: `radial-gradient(color-mix(in srgb, ${PAPER} 20%, transparent) 1px, transparent 1px)`,
    backgroundSize: '5px 5px',
    margin: 'var(--space-md) 0',
    border: `2px solid ${ACID}`,
    borderLeft: `7px solid ${accent}`,
    boxShadow: `5px 5px 0 color-mix(in srgb, ${PINK} 55%, transparent)`,
    fontFamily: 'var(--font-body)',
    // No `fontSize` here (#769): the slots size themselves, and a wrapper size
    // overrides every one of them at once. A skin owns font, colour, ornament.
    color: PAPER,
  }

  return (
    <div style={shell}>
      <div
        style={{
          padding: 'var(--space-sm) var(--space-md)',
          background: `color-mix(in srgb, ${accent} 16%, transparent)`,
          borderBottom: `2px dashed ${ACID}`,
        }}
      >
        <span style={{ fontFamily: MARKER, fontSize: 'var(--text-title)' }}>{headline}</span>
      </div>

      <div style={{ padding: 'var(--space-md)' }}>
        {tally && (
          <div
            style={{
              padding: 'var(--space-xs) var(--space-sm)',
              marginBottom: 'var(--space-sm)',
              background: ACID,
              color: INK,
              border: `2px solid ${PAPER}`,
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            {tally}
          </div>
        )}
        {note && (
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 'var(--space-sm)',
              padding: 'var(--space-xs) var(--space-sm)',
              background: `color-mix(in srgb, ${accent} 18%, transparent)`,
              borderLeft: `3px solid ${ACID}`,
            }}
          >
            <span
              aria-hidden
              className="snide-pulse"
              style={{
                width: 7,
                height: 7,
                flex: '0 0 auto',
                borderRadius: '50%',
                background: ACID,
              }}
            />
            {note}
          </div>
        )}
        {body && (
          <div
            style={{
              marginTop: note ? 'var(--space-sm)' : 0,
              padding: 'var(--space-md)',
              border: `1px solid color-mix(in srgb, ${PAPER} 28%, transparent)`,
            }}
          >
            {body}
          </div>
        )}
        {/* The owner's action row (#752), footed under a dashed acid rule. */}
        {actions && (
          <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-sm)', borderTop: `2px dashed ${ACID}` }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

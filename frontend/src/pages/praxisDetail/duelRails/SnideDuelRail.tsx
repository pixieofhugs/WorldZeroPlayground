/**
 * S.N.I.D.E. DESKTOP duel rail (#722) — the duel context as a xerox-punk zine
 * clipping: near-black photocopier ground under a fine halftone screen, a 2px
 * acid-green border, the opponent's colour on a fat 7px left edge, and a hard
 * offset shadow tinted hot pink. No radius anywhere — this is paper cut with a
 * knife, not a window.
 *
 * Pure frame. Every slot arrives pre-rendered from `DuelCrossLink`: the
 * per-`DuelStatus` branch table, the cast roster, the next-step line and the
 * stakes arithmetic all live in `components/duel/shared.tsx`. This file decides
 * only where the acid and the pink go. It recomputes nothing and drops nothing.
 *
 * NO WRAPPER `fontSize` (#769). The shell sets font family, colour and ornament
 * and no size at all; each slot arrives already sized by its own role class. The
 * one text size this file sets is on the headline leaf itself, at content tier.
 *
 * NO INVENTED COPY. The design mock letters a "⚔ DUELING" eyebrow into the
 * header — but `duelCrossLink.dueling` already ships the glyph and the word
 * inside the `headline` slot, and copy is faction-neutral by decision (#718).
 * Reproducing the eyebrow would either duplicate the headline or introduce a
 * string outside the catalog, so the header's ransom ornament is purely
 * non-textual and the headline carries all the words.
 *
 * Tokens are the shipped `--faction-snide-*` set that SnidePraxisDetail and the
 * Snide cards already wear — the mock's raw hex is relationship reference only.
 * `accent`/`soft` still arrive from the OPPONENT's faction and are spent on the
 * edge that faces them, so a foreign duelist keeps tinting the clipping.
 */
import type { CSSProperties } from 'react'
import type { DuelRailSkinProps } from '../DuelCrossLink'

const INK = 'var(--faction-snide-ink)'
const ACID = 'var(--faction-snide-acid)'
const PINK = 'var(--faction-snide-pink)'
const PAPER = 'var(--faction-snide-paper)'
const MARKER = 'var(--faction-snide-font-marker)'

/** The xerox screen: a 1px dot on a 5px grid, barely there. */
const HALFTONE: CSSProperties = {
  backgroundColor: INK,
  backgroundImage: `radial-gradient(color-mix(in srgb, ${PAPER} 20%, transparent) 1px, transparent 1px)`,
  backgroundSize: '5px 5px',
}

/**
 * Cut-out squares from a ransom note, alternating acid and pink. Ornament, not
 * an icon and not text — the header's only non-slot mark.
 */
function RansomStrip() {
  return (
    <span style={{ display: 'flex', gap: 'var(--space-xs)' }} aria-hidden>
      {[ACID, PINK, ACID].map((color, index) => (
        <span
          key={color + String(index)}
          style={{
            width: index === 1 ? 6 : 10,
            height: index === 1 ? 10 : 6,
            background: color,
            transform: `rotate(${(index - 1) * 8}deg)`,
          }}
        />
      ))}
    </span>
  )
}

export default function SnideDuelRail({
  accent,
  maxWidth,
  headline,
  tally,
  note,
  body,
}: DuelRailSkinProps) {
  const shell: CSSProperties = {
    ...HALFTONE,
    maxWidth,
    margin: 'var(--space-lg) 0',
    border: `2px solid ${ACID}`,
    // The opponent's colour rides the fat left edge; the rest is Snide's.
    borderLeft: `7px solid ${accent}`,
    // Hard offset shadow, no blur — a photocopy of a photocopy, tinted pink.
    boxShadow: `6px 6px 0 color-mix(in srgb, ${PINK} 55%, transparent)`,
    fontFamily: 'var(--font-body)',
    // No `fontSize` here (#769): the slots size themselves, and a wrapper size
    // overrides every one of them at once. A skin owns font, colour, ornament.
    color: PAPER,
  }

  return (
    <div style={shell}>
      {/* masthead: accent wash under a dashed acid rule */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          flexWrap: 'wrap',
          padding: 'var(--space-sm) var(--space-md)',
          background: `color-mix(in srgb, ${accent} 16%, transparent)`,
          borderBottom: `2px dashed ${ACID}`,
        }}
      >
        <RansomStrip />
        <span style={{ fontFamily: MARKER, fontSize: 'var(--text-title)' }}>{headline}</span>
        {tally && (
          <span
            style={{
              marginLeft: 'auto',
              padding: 'var(--space-xs) var(--space-sm)',
              background: ACID,
              color: INK,
              border: `2px solid ${PAPER}`,
              fontWeight: 700,
            }}
          >
            {tally}
          </span>
        )}
      </div>

      <div style={{ padding: 'var(--space-md)' }}>
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
      </div>
      {/* ponytail: `declined` and `forfeited` arrive with body === null and no
          tally, so the clipping shrinks to its masthead. That IS the state —
          there is no race left — and no substitute roster is drawn for it. The
          mock's per-row accent edge and its separate YOU/THEM tally cells are
          likewise absent: both live inside slots this frame receives whole. */}
    </div>
  )
}

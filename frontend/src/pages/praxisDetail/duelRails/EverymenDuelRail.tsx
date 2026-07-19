/**
 * Everymen DESKTOP duel rail (#721) — the duel filed as a stamped dispatch,
 * matching the design's `EvDuelRail.dc.html`.
 *
 * Everymen's shipped idiom is a union broadside on paper: cream field, heavy ink
 * rule, a hard offset shadow with no blur, and a red→gold stripe. The rail wears
 * it as a form pinned above the work report — the same vocabulary
 * `EverymenPraxisDetail` and `EverymenEditPraxis` already use, no new tokens.
 *
 * Pure frame. Every slot arrives already rendered from `DuelCrossLink`: the
 * per-`DuelStatus` branch table, the cast roster, the next-step line and the
 * stakes arithmetic all live in `components/duel/shared.tsx`. Nothing here
 * recomputes a figure, re-derives a state, or touches a string.
 *
 * WHAT THE MOCK DRAWS THAT THIS CONTRACT CANNOT (deliberate, not missed):
 * the mock gives each roster row its own bordered tan box, splits the tally into
 * separate YOU / THEM cells, and hangs a red ▸ on the next-step line. All three
 * live *inside* `body` / `tally`, which arrive as single opaque nodes — a skin
 * that reached in to re-render them would be recomputing slots, which is exactly
 * what the split forbids. The idiom is therefore carried at the frame level:
 * paper + ink border + accent edge + hard shadow outside, an ink-bordered tan
 * panel around the body, and a hard-bordered box around the tally.
 *
 * `accent`/`soft` are the OPPONENT's faction tokens (#310) and are spent on the
 * left edge, the header wash and the stripe, so a foreign duelist keeps tinting
 * an otherwise wholly Everymen form.
 *
 * No `fontSize` anywhere on a container (#769): the slots size themselves via
 * their own role classes, and a wrapper size overrides all of them at once. The
 * skin owns font, colour and ornament only (WORLD_ZERO_STYLE §4a).
 */
import type { CSSProperties } from 'react'
import type { DuelRailSkinProps } from '../DuelCrossLink'

const PAPER = 'var(--everymen-paper)'
const PAPER_DEEP = 'var(--everymen-paper-deep)'
const CREAM = 'var(--everymen-cream)'
const INK = 'var(--everymen-ink)'
const PAPER_TEXT = 'var(--everymen-paper-text)'
const GOLD = 'var(--everymen-gold)'
const POSTER = 'var(--font-accent)' // Bebas Neue — the condensed display face
const BODY = 'var(--font-body)'

/**
 * The dispatch-board indicator on the settled-standing strip. Motion is
 * decoration: the note it sits beside says the same thing in words, and the
 * keyframe is behind `prefers-reduced-motion` in index.css.
 */
function LiveDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="ev-duel-pulse"
      style={{
        flexShrink: 0,
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        border: `1px solid ${INK}`,
      }}
    />
  )
}

export default function EverymenDuelRail({
  accent,
  maxWidth,
  headline,
  tally,
  note,
  body,
}: DuelRailSkinProps) {
  const shell: CSSProperties = {
    maxWidth,
    margin: 'var(--space-lg) 0',
    background: PAPER,
    color: PAPER_TEXT,
    fontFamily: BODY,
    border: `2px solid ${INK}`,
    // The opponent's colour rides the edge that faces them.
    borderLeft: `7px solid ${accent}`,
    // Hard offset, zero blur — the poster shadow the archetype already wears.
    boxShadow: `6px 6px 0 color-mix(in srgb, ${INK} 26%, transparent)`,
  }

  return (
    <div style={shell}>
      {/* accent→gold stripe rule, the Everymen masthead signature */}
      <div
        aria-hidden
        style={{ height: 5, background: `linear-gradient(90deg, ${accent} 0 50%, ${GOLD} 50% 100%)` }}
      />

      {/* Header band: the state headline on an accent wash, tally boxed at the
          right. `tally` is settled-only and arrives null otherwise — no height
          is reserved for it. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
          flexWrap: 'wrap',
          padding: 'var(--space-sm) var(--space-lg)',
          background: `color-mix(in srgb, ${accent} 12%, transparent)`,
          borderBottom: `2px solid ${INK}`,
        }}
      >
        <span aria-hidden style={{ color: accent, lineHeight: 1 }}>
          ⚔
        </span>
        <span style={{ fontFamily: POSTER, letterSpacing: '0.06em', minWidth: 0 }}>
          {headline}
        </span>
        {tally && (
          <span
            style={{
              marginLeft: 'auto',
              padding: 'var(--space-xs) var(--space-sm)',
              background: INK,
              color: CREAM,
              border: `2px solid ${INK}`,
              fontFamily: POSTER,
            }}
          >
            {tally}
          </span>
        )}
      </div>

      <div style={{ padding: 'var(--space-md) var(--space-lg) var(--space-lg)' }}>
        {/* Settled-only standing strip: an accent wash with the live indicator. */}
        {note && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              padding: 'var(--space-xs) var(--space-sm)',
              background: `color-mix(in srgb, ${accent} 14%, transparent)`,
              borderLeft: `3px solid ${accent}`,
            }}
          >
            <LiveDot color={accent} />
            <span style={{ minWidth: 0 }}>{note}</span>
          </div>
        )}

        {/* The race panel. `declined` and `forfeited` arrive with body === null —
            no panel is drawn and no substitute roster is invented, because
            there is no race left to report. */}
        {body && (
          <div
            style={{
              marginTop: note ? 'var(--space-md)' : 0,
              padding: 'var(--space-md)',
              background: PAPER_DEEP,
              border: `2px solid ${INK}`,
              boxShadow: `3px 3px 0 color-mix(in srgb, ${INK} 18%, transparent)`,
            }}
          >
            {body}
          </div>
        )}
      </div>
    </div>
  )
}

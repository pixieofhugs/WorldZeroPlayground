/**
 * Singularity DESKTOP duel rail (#723) — the duel context as a terminal readout
 * docked above the praxis.
 *
 * Pure frame. Every slot arrives pre-rendered from `DuelCrossLink`: the
 * forfeited-pre-empts-status check, the per-`DuelStatus` branch table and the
 * slot composition inside `body` all live above this file. This one decides
 * only where the phosphor goes. It cannot recompute a figure or re-derive a
 * status, and it must never drop a slot.
 *
 * Chrome: near-black ground lifted by two soft radial glows (green top-left,
 * brand blue top-right) under a scanline wash; hairline low-opacity green
 * borders at a small radius; the monospace terminal face. The `$ ` prompt
 * marker is punctuation, the same voice `SingularityTaskCard` speaks with `"> "`
 * — no invented copy, no locale keys.
 *
 * The opponent's accent is the one non-phosphor colour on the surface, which is
 * the whole point of the skin: it rides the left edge and casts the glow, so a
 * foreign duelist reads as a foreign variable on the terminal.
 *
 * Contract notes the design canvas gets wrong and this file follows the CODE on:
 *  - `body` is `null` for `declined` and `forfeited` — there is no race left, so
 *    the readout is a bare header. No substitute roster is drawn.
 *  - `tally` and `note` are `null` outside `settled`, so neither reserves height.
 *  - Stakes collapse to one line while `pending`; `StakesTiles` already does that
 *    inside `body`, and this file must not re-implement the hiding.
 *
 * NO `fontSize` on the wrapper (#769). The slots size themselves; a wrapper size
 * overrides all of them at once. A skin owns font, colour and ornament, never
 * type size (WORLD_ZERO_STYLE §4a).
 *
 * ALWAYS-DARK: the `--faction-singularity-*` tokens hold identical terminal
 * values in both themes, so this rail is a terminal in light mode too — the
 * precedent every Singularity surface has followed since `SingularityTaskCard`.
 */
import type { CSSProperties } from 'react'
import type { DuelRailSkinProps } from '../DuelCrossLink'

const GROUND = 'var(--faction-singularity-card-bg)'
const PHOSPHOR = 'var(--faction-singularity-card-accent)'
const PHOSPHOR_DIM = 'var(--faction-singularity-phosphor-dim)'
const BRAND_BLUE = 'var(--faction-singularity-card-muted)'
const TERMINAL = 'var(--faction-singularity-card-font)'

const HAIRLINE = `color-mix(in srgb, ${PHOSPHOR} 22%, transparent)`
const GLASS = `color-mix(in srgb, ${PHOSPHOR} 5%, transparent)`

/**
 * The signature blinking block cursor, used ONCE per surface — here on the
 * state headline, the rail's only heading. `sg-cursor` exists so the
 * reduced-motion guard in the stylesheet below can reach it; an inline style
 * cannot carry a media query.
 */
function BlockCursor() {
  return (
    <span
      aria-hidden
      className="sg-cursor"
      style={{
        display: 'inline-block',
        width: 8,
        height: 14,
        background: PHOSPHOR,
        marginLeft: 'var(--space-xs)',
        verticalAlign: 'text-bottom',
      }}
    />
  )
}

/** Blink + its reduced-motion opt-out. Duplicate declarations are idempotent. */
const CURSOR_CSS =
  '@keyframes blink { 50% { opacity: 0; } }' +
  '.sg-cursor { animation: blink 1.05s step-end infinite; }' +
  '@media (prefers-reduced-motion: reduce) { .sg-cursor { animation: none; } }'

export default function SingularityDuelRail({
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
    borderRadius: 6,
    overflow: 'hidden',
    border: `1px solid ${HAIRLINE}`,
    borderLeft: `3px solid ${accent}`,
    boxShadow: `0 0 34px -18px color-mix(in srgb, ${accent} 55%, transparent)`,
    background: GROUND,
    backgroundImage: [
      `radial-gradient(60% 70% at 0% 0%, color-mix(in srgb, ${PHOSPHOR} 14%, transparent), transparent 70%)`,
      `radial-gradient(55% 65% at 100% 0%, color-mix(in srgb, ${BRAND_BLUE} 12%, transparent), transparent 70%)`,
      'repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(74,222,128,0.02) 2px, rgba(74,222,128,0.02) 4px)',
    ].join(', '),
    fontFamily: TERMINAL,
    // No `fontSize` here (#769) — see the header note.
    color: PHOSPHOR_DIM,
  }

  return (
    <div style={shell}>
      {/* Prompt line: `$` sigil, the state headline, the live tally on the right. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--space-sm)',
          padding: 'var(--space-md) var(--space-lg)',
          borderBottom: `1px solid ${HAIRLINE}`,
          flexWrap: 'wrap',
        }}
      >
        {/* Content tier, on the headline's own container — the headline arrives
            unsized, and this is a heading, not a label. */}
        <span style={{ fontSize: 'var(--text-content)', color: PHOSPHOR }}>
          <span aria-hidden style={{ color: BRAND_BLUE }}>{'$ '}</span>
          {headline}
          <BlockCursor />
        </span>
        {tally && (
          <span style={{ marginLeft: 'auto', color: PHOSPHOR, fontWeight: 700 }}>{tally}</span>
        )}
      </div>

      {/* `declined` and `forfeited` arrive with note AND body null, so the whole
          lower block is skipped rather than padding out an empty strip. */}
      {(note || body) && (
      <div style={{ padding: 'var(--space-lg)' }}>
        {note}
        {body && (
          <div
            style={{
              marginTop: note ? 'var(--space-sm)' : 0,
              background: GLASS,
              border: `1px solid ${HAIRLINE}`,
              borderRadius: 3,
              padding: 'var(--space-md)',
            }}
          >
            {body}
          </div>
        )}
        {/* ponytail: the readout then collapses to the prompt line alone. That
            is the correct empty state — the duel is over — so no bespoke
            "connection closed" ornament is drawn for it. */}
      </div>
      )}

      <style>{CURSOR_CSS}</style>
    </div>
  )
}

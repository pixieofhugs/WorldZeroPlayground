/**
 * Singularity MOBILE duel rail (#723).
 *
 * The desktop readout thumbed down. Two changes, both forced by phone width:
 * the tally leaves the prompt line (a score pair and a headline on one
 * phone-width row wrap into mush) and drops to its own centred line above the
 * glass panel, where it reads as the scoreboard it is; and `maxWidth` is
 * ignored, because the rail is full-bleed inside the phone column and the
 * desktop archetype-width map has nothing to line up with here.
 *
 * Single column throughout — SPEC-faction-ui-profile §1a forbids a fixed-px
 * grid on the mobile path, and this surface needs none.
 *
 * Pure frame, same contract as the desktop skin: every slot arrives already
 * rendered, `body`/`tally`/`note` are legitimately null in some states, and none
 * of the duel's arithmetic or `DuelStatus` branching is visible from here.
 * No `fontSize` on the wrapper (#769).
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

/** The one blinking block cursor, on the rail's only heading. */
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

export default function SingularityMobileDuelRail({
  accent,
  headline,
  tally,
  note,
  body,
}: DuelRailSkinProps) {
  const shell: CSSProperties = {
    margin: 'var(--space-md) 0',
    borderRadius: 9,
    overflow: 'hidden',
    border: `1px solid ${HAIRLINE}`,
    borderLeft: `3px solid ${accent}`,
    boxShadow: `0 0 26px -14px color-mix(in srgb, ${accent} 55%, transparent)`,
    background: GROUND,
    backgroundImage: [
      `radial-gradient(80% 60% at 0% 0%, color-mix(in srgb, ${PHOSPHOR} 15%, transparent), transparent 70%)`,
      `radial-gradient(75% 55% at 100% 0%, color-mix(in srgb, ${BRAND_BLUE} 13%, transparent), transparent 70%)`,
      'repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(74,222,128,0.02) 2px, rgba(74,222,128,0.02) 4px)',
    ].join(', '),
    fontFamily: TERMINAL,
    // No `fontSize` here (#769) — the slots own their size, the frame owns none.
    color: PHOSPHOR_DIM,
  }

  return (
    <div style={shell}>
      <div
        style={{
          padding: 'var(--space-md)',
          borderBottom: `1px solid ${HAIRLINE}`,
        }}
      >
        <span style={{ fontSize: 'var(--text-content)', color: PHOSPHOR }}>
          <span aria-hidden style={{ color: BRAND_BLUE }}>{'$ '}</span>
          {headline}
          <BlockCursor />
        </span>
      </div>

      {(tally || note || body) && (
        <div style={{ padding: 'var(--space-md)' }}>
          {tally && (
            <div
              style={{
                // The tally arrives on .content-title already (#769) — this
                // scoreboard block contributes the phosphor and the centring.
                color: PHOSPHOR,
                fontWeight: 700,
                textAlign: 'center',
                marginBottom: 'var(--space-xs)',
              }}
            >
              {tally}
            </div>
          )}
          {note}
          {body && (
            <div
              style={{
                marginTop: 'var(--space-sm)',
                background: GLASS,
                border: `1px solid ${HAIRLINE}`,
                borderRadius: 3,
                padding: 'var(--space-md)',
              }}
            >
              {body}
            </div>
          )}
        </div>
      )}

      <style>{CURSOR_CSS}</style>
    </div>
  )
}

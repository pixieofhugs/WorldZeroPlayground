/**
 * Everymen MOBILE duel rail (#721) — the desktop dispatch, thumbed down, as
 * `EvPraxisPhone.dc.html` pins it above the work report.
 *
 * Two changes from the desktop skin, both forced by phone width rather than
 * chosen: the tally leaves the header row (a boxed score pair and a condensed
 * headline on one narrow row wrap into mush) and drops to its own full-width
 * scoreboard band, and the hard offset shadow shrinks so it does not push the
 * card off the viewport. Single-column throughout — SPEC-faction-ui-profile §1a
 * forbids a fixed-px grid on the mobile path, and this surface needs none.
 *
 * Pure frame, same contract as the desktop skin: every slot arrives already
 * rendered from `DuelCrossLink`, so none of the duel's arithmetic or status
 * branching is visible from here. No `fontSize` on any container (#769).
 */
import type { CSSProperties } from 'react'
import type { DuelRailSkinProps } from '../DuelCrossLink'

const PAPER = 'var(--everymen-paper)'
const PAPER_DEEP = 'var(--everymen-paper-deep)'
const CREAM = 'var(--everymen-cream)'
const INK = 'var(--everymen-ink)'
const PAPER_TEXT = 'var(--everymen-paper-text)'
const GOLD = 'var(--everymen-gold)'
const POSTER = 'var(--font-accent)'
const BODY = 'var(--font-body)'

export default function EverymenMobileDuelRail({
  accent,
  headline,
  tally,
  note,
  body,
}: DuelRailSkinProps) {
  // ponytail: `maxWidth` is intentionally ignored. The rail is full-bleed inside
  // the phone column, so the desktop archetype-width map has nothing to line up
  // with here — the same call WowMobileDuelRail makes.
  const shell: CSSProperties = {
    margin: 'var(--space-md) 0',
    background: PAPER,
    color: PAPER_TEXT,
    fontFamily: BODY,
    border: `2px solid ${INK}`,
    borderLeft: `6px solid ${accent}`,
    boxShadow: `4px 4px 0 color-mix(in srgb, ${INK} 24%, transparent)`,
  }

  return (
    <div style={shell}>
      <div
        aria-hidden
        style={{ height: 4, background: `linear-gradient(90deg, ${accent} 0 50%, ${GOLD} 50% 100%)` }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          padding: 'var(--space-sm) var(--space-md)',
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
      </div>

      <div style={{ padding: 'var(--space-md)' }}>
        {/* Settled-only scoreboard band — its own row on a phone, where the
            header cannot hold it alongside the headline. */}
        {tally && (
          <div
            style={{
              padding: 'var(--space-xs) var(--space-sm)',
              marginBottom: 'var(--space-sm)',
              background: INK,
              color: CREAM,
              border: `2px solid ${INK}`,
              fontFamily: POSTER,
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
              alignItems: 'center',
              gap: 'var(--space-sm)',
              padding: 'var(--space-xs) var(--space-sm)',
              background: `color-mix(in srgb, ${accent} 14%, transparent)`,
              borderLeft: `3px solid ${accent}`,
            }}
          >
            <span
              aria-hidden
              className="ev-duel-pulse"
              style={{
                flexShrink: 0,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: accent,
                border: `1px solid ${INK}`,
              }}
            />
            <span style={{ minWidth: 0 }}>{note}</span>
          </div>
        )}

        {/* `declined` / `forfeited` arrive with body === null: no panel, and no
            invented roster to fill the gap. */}
        {body && (
          <div
            style={{
              marginTop: note ? 'var(--space-md)' : 0,
              padding: 'var(--space-md)',
              background: PAPER_DEEP,
              border: `2px solid ${INK}`,
            }}
          >
            {body}
          </div>
        )}
      </div>
    </div>
  )
}

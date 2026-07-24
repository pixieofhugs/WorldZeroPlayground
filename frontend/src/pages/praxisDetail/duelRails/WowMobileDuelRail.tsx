/**
 * Warriors of Whimsy MOBILE duel rail (#895) — the Praxis Rail, thumbed.
 *
 * The kit's own phone twin: the same seven inputs, the same gold frame and
 * barrier band, tightened padding, and the rosette dropped to its own row under
 * the headline — a MedievalSharp sentence and a 26px ring on one 375px line wrap
 * into mush. The tally moves above the note and centres, where it reads as the
 * scoreboard it is. Single column throughout (SPEC-faction-ui-profile §1a).
 *
 * `maxWidth` is deliberately ignored, as every mobile rail skin ignores it: the
 * rail is full-bleed inside the phone column, so the desktop archetype-width map
 * has nothing to line up with here.
 *
 * Pure frame, and the same three-shape rule for the opponent's colour — rosette
 * ring, plate edge, ribbon bar; never a text ground. All six faces and every
 * deviation are documented on `WowDuelRail.tsx`; this file changes the layout
 * only.
 */
import type { CSSProperties } from 'react'

import type { DuelRailSkinProps } from '../DuelCrossLink'
import {
  BODY_FONT,
  CHAMPION,
  DISPLAY_FONT,
  HOLD,
  INK,
  LISTS_BG,
  ListsBand,
  ListsRibbonMark,
  ListsSpark,
  PANEL,
  PANEL_BORDER,
  PLUM,
  Rosette,
  SHADOW,
} from '../../../components/duel/wowLists'

export default function WowMobileDuelRail({
  accent,
  soft,
  headline,
  tally,
  note,
  body,
  actions,
}: DuelRailSkinProps) {
  const shell: CSSProperties = {
    margin: 'var(--space-md) 0',
    borderRadius: 12,
    overflow: 'hidden',
    background: LISTS_BG,
    color: INK,
    fontFamily: BODY_FONT,
    border: `2px solid ${HOLD}`,
    boxShadow: `0 10px 24px -14px ${SHADOW}`,
  }

  return (
    <div style={shell}>
      <ListsBand height={7} unit={10} />

      <div style={{ padding: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
          <ListsSpark />
          <div style={{ flex: 1, minWidth: 0, fontFamily: DISPLAY_FONT, lineHeight: 1.25 }}>
            {headline}
          </div>
        </div>

        {/* The rosette on its own row: at 375px it cannot share a line with a
            MedievalSharp sentence without pinching the headline into a column. */}
        <div style={{ marginTop: 'var(--space-sm)' }}>
          <Rosette accent={accent} soft={soft} size={22} />
        </div>

        {tally && (
          <div style={{ marginTop: 'var(--space-md)', textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-block',
                fontFamily: DISPLAY_FONT,
                background: PANEL,
                border: `1.5px solid ${CHAMPION}`,
                borderRadius: 7,
                padding: 'var(--space-xs) var(--space-md)',
              }}
            >
              {tally}
            </div>
            <div
              aria-hidden
              style={{
                display: 'flex',
                height: 8,
                marginTop: 'var(--space-sm)',
                borderRadius: 7,
                overflow: 'hidden',
                border: `1px solid ${PANEL_BORDER}`,
              }}
            >
              {/* Both halves are aria-hidden individually, not merely inside
                  an aria-hidden bar: `wowDuelRail.test.tsx` checks tag by tag
                  that the opponent's hue only ever lands on decoration. */}
              <span aria-hidden style={{ flex: '1 1 0', background: CHAMPION }} />
              <span aria-hidden style={{ flex: '1 1 0', background: accent }} />
            </div>
          </div>
        )}

        {note && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-sm)',
              marginTop: 'var(--space-md)',
              fontFamily: BODY_FONT,
              fontStyle: 'italic',
              color: PLUM,
            }}
          >
            <ListsRibbonMark />
            <div style={{ minWidth: 0 }}>{note}</div>
          </div>
        )}

        {body && (
          <div
            style={{
              marginTop: 'var(--space-md)',
              background: PANEL,
              border: `1.5px solid ${PANEL_BORDER}`,
              borderLeft: `4px solid ${accent}`,
              borderRadius: 11,
              padding: 'var(--space-md)',
            }}
          >
            {body}
          </div>
        )}

        {/* the owner's action row (#752), footed on a champion-gold rule */}
        {actions && (
          <div
            style={{
              marginTop: 'var(--space-md)',
              paddingTop: 'var(--space-sm)',
              borderTop: `1px solid ${CHAMPION}`,
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Warriors of Whimsy DESKTOP duel rail (#895) — THE PRAXIS RAIL.
 *
 * The kit's `17-duel-rail.html`: a gold-framed strip with the checkered barrier
 * along its top edge, a twinkling ✦ before the state headline, the race on a
 * parchment plate, the tally boxed in champion gold and the settled note on a
 * swaying ❦ ribbon.
 *
 * Pure frame. Every slot arrives already rendered from `DuelCrossLink` — the
 * forfeited-pre-empts-status branch, the per-`DuelStatus` table, the roster, the
 * next-step line and the stakes arithmetic all live upstream. Nothing here
 * recomputes a figure, re-derives a state, or touches a string.
 *
 * ALL SIX FACES the kit draws fall straight out of that dispatcher, and its
 * `ledger` annotations already match it slot for slot — this skin renders each
 * slot only when it is non-null, so no face invents one the ledger withholds:
 *   pending  body ✓ · tally ✕ · note ✕      settled            body ✓ · tally ✓ · note ✓
 *   declined body ✕ · tally ✕ · note ✕      forfeited (either) body ✕ · tally ✕ · note ✕
 *   active   body ✓ · tally ✕ · note ✕
 *
 * THE OPPONENT'S COLOUR. `accent`/`soft` are the opponent's tokens (#310) and
 * can be any hue. The kit's load-bearing decision — and the one thing about this
 * rail that must survive a redesign — is that gold chrome holds a foreign colour
 * as a RING and a BAR and NEVER as a text ground. So it is spent here on exactly
 * three shapes, none of which carries or backs text: the `Rosette` beside the
 * headline, a hairline edge on the body plate, and the opponent's half of the
 * ribbon rule beneath the tally. Every string on this surface is painted in a
 * WOW ink measured against a WOW ground.
 *
 * WHAT THE KIT DRAWS THAT THIS CONTRACT CANNOT (deliberate, not missed):
 *  - Its roster CHIPS, each with its own rider dot, and its per-state headline
 *    prose ("Challenge sent to The Redacted — awaiting the gauntlet's return").
 *    `headline` and `body` arrive as opaque, already-rendered nodes; a skin that
 *    re-rendered either would be recomputing a slot, and the copy is
 *    faction-neutral by decision (#718).
 *  - Its PROPORTIONAL tally bar, split at the two scores. `tally` arrives as one
 *    node holding both figures, so the split point is not knowable from here
 *    without re-deriving it. The bar ships as a fixed two-tone ribbon rule under
 *    the boxed tally — the opponent's colour is present as a bar, as the design
 *    requires, but it reports nothing it cannot know.
 *  - Its hardcoded "Win ×1.5 · ✦180 / Loss ×0.5 · ✦60" pills. Those figures are
 *    per-faction and per-viewer; `StakesTiles`, inside `body`, owns them.
 *
 * No `fontSize` on any container (#769): each slot arrives sized by its own role
 * class, and a wrapper size would silently override all of them at once.
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

export default function WowDuelRail({
  accent,
  soft,
  maxWidth,
  headline,
  tally,
  note,
  body,
  actions,
}: DuelRailSkinProps) {
  const shell: CSSProperties = {
    maxWidth,
    margin: 'var(--space-lg) 0',
    borderRadius: 12,
    overflow: 'hidden',
    background: LISTS_BG,
    color: INK,
    fontFamily: BODY_FONT,
    border: `2px solid ${HOLD}`,
    boxShadow: `0 20px 46px -22px ${SHADOW}`,
  }

  return (
    <div style={shell}>
      <ListsBand height={7} unit={10} />

      <div style={{ padding: 'var(--space-md) var(--space-lg)' }}>
        {/* ── the state headline, with the opponent's rosette ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-sm)',
          }}
        >
          <ListsSpark />
          <div style={{ flex: 1, minWidth: 0, fontFamily: DISPLAY_FONT, lineHeight: 1.25 }}>
            {headline}
          </div>
          <Rosette accent={accent} soft={soft} />
        </div>

        {/* ── settled only: the boxed tally over its two-tone ribbon rule ── */}
        {tally && (
          <div style={{ marginTop: 'var(--space-md)' }}>
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

        {/* ── settled only: the standing note, on a ribbon ── */}
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

        {/* ── the race, on a parchment plate. `declined` and both `forfeited`
              faces arrive with body === null: no plate is drawn and no
              substitute roster invented, because no race is left to report. ── */}
        {body && (
          <div
            style={{
              marginTop: 'var(--space-md)',
              background: PANEL,
              border: `1.5px solid ${PANEL_BORDER}`,
              borderLeft: `4px solid ${accent}`,
              borderRadius: 11,
              padding: 'var(--space-md) var(--space-lg)',
            }}
          >
            {body}
          </div>
        )}

        {/* ── the owner's action row (#752), footed on a champion-gold rule so
              the control that changes the duel sits under its state ── */}
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

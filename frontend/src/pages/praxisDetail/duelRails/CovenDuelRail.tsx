/**
 * Cozy Coven DESKTOP duel rail (#720) — the duel context as a second
 * `wow.exe` window docked above the praxis, matching the design's panels 2b/2c.
 *
 * Pure frame. Every slot arrives pre-rendered from `DuelCrossLink`: the
 * per-`DuelStatus` branch table, the cast roster, the next-step line and the
 * stakes arithmetic all live in `components/duel/shared.tsx` and the dispatcher
 * above it. This file decides only where the pink goes.
 *
 * Two things the design got wrong and are deliberately NOT reproduced (#718
 * settled both): 2c's "sealed — can't edit while the duel runs" forfeit framing
 * (that panel is `status === 'active'`, where unsubmitting is a free neutral
 * reopen — forfeit only begins at `settled`), and 2c's two-pane workspace (the
 * rail keeps its existing mount above the archetype; no praxis-detail surface
 * has a two-column layout and mobile forbids one outright).
 *
 * Tokens are the `--faction-coven-*` set CovenEditPraxis / CovenPraxisDetail already
 * use — no new variables. `accent`/`soft` still arrive from the OPPONENT's
 * faction and are spent on the edge that faces them, so a foreign duelist keeps
 * tinting the window even inside Coven chrome.
 */
import type { CSSProperties } from 'react'
import type { DuelRailSkinProps } from '../DuelCrossLink'

const WIN_BORDER = 'var(--faction-coven-win-border)'
const TITLE_FROM = 'var(--faction-coven-title-from)'
const TITLE_TO = 'var(--faction-coven-title-to)'
const TITLE_TEXT = 'var(--faction-coven-title-text)'
const BODY_BG = 'var(--faction-coven-body-bg)'
const NOTEPAD_BG = 'var(--faction-coven-notepad-bg)'
const NOTEPAD_BORDER = 'var(--faction-coven-notepad-border)'
const DOT = 'var(--faction-coven-dot)'
const CARD_TEXT = 'var(--faction-coven-card-text)'
const SCRIPT = 'var(--faction-coven-card-font)'

/** The kit's four-point sparkle, the window-title ornament on every Coven surface. */
function Sparkle({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 1c.6 5.2 2.8 7.4 8 8-5.2.6-7.4 2.8-8 8-.6-5.2-2.8-7.4-8-8 5.2-.6 7.4-2.8 8-8z"
        fill={color}
      />
    </svg>
  )
}

export default function CovenDuelRail({
  accent,
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
    // The opponent's colour rides the left edge; the rest of the window is Coven's.
    border: `2px solid ${WIN_BORDER}`,
    borderLeft: `4px solid ${accent}`,
    boxShadow: `0 10px 24px color-mix(in srgb, ${accent} 20%, transparent)`,
    fontFamily: 'var(--font-body)',
    // No `fontSize` here (#769): the slots size themselves, and a wrapper size
    // overrides every one of them at once. A skin owns font, colour, ornament.
    color: CARD_TEXT,
  }

  return (
    <div style={shell}>
      {/* title bar — headline left, live tally right, exactly the .exe chrome
          CovenEditPraxis and CovenPraxisDetail already wear */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          padding: 'var(--space-sm) var(--space-md)',
          background: `linear-gradient(180deg, ${TITLE_FROM}, ${TITLE_TO})`,
          borderBottom: `2px solid ${WIN_BORDER}`,
          color: TITLE_TEXT,
          flexWrap: 'wrap',
        }}
      >
        <Sparkle size={12} color={TITLE_TEXT} />
        <span style={{ fontFamily: SCRIPT, fontSize: 'var(--text-content)', fontWeight: 700 }}>
          {headline}
        </span>
        {tally && <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{tally}</span>}
      </div>

      {/* dotted board holding the notepad scrap */}
      <div
        style={{
          padding: 'var(--space-md)',
          background: BODY_BG,
          backgroundImage: `radial-gradient(${DOT} 1.4px, transparent 1.4px)`,
          backgroundSize: '13px 13px',
        }}
      >
        {note}
        {body && (
          <div
            style={{
              marginTop: note ? 'var(--space-sm)' : 0,
              background: NOTEPAD_BG,
              border: `1.5px solid ${NOTEPAD_BORDER}`,
              borderRadius: 8,
              padding: 'var(--space-md)',
            }}
          >
            {body}
          </div>
        )}
        {/* The owner's action row (#752), footed under the window's border rule. */}
        {actions && (
          <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-sm)', borderTop: `1.5px solid ${NOTEPAD_BORDER}` }}>
            {actions}
          </div>
        )}
        {/* ponytail: `declined` and `forfeited` arrive with body === null, so the
            board renders as a bare dotted strip under the title bar. That is the
            correct empty state — there is no race left — and it costs no branch
            here, so no bespoke "duel is over" ornament is drawn for it.
            ponytail: the design's soft `background: soft` wash is dropped; Coven's
            own BODY_BG already reads as a tinted surface and layering the
            opponent's wash under the dot grid muddied both. */}
      </div>
    </div>
  )
}

/**
 * Warriors of Whimsy MOBILE duel rail (#720) — panel 1c of the design.
 *
 * The desktop window, thumbed down: the title bar loses its side-by-side tally
 * (a score pair and a script headline on one phone-width row wrap into mush) and
 * the tally drops to its own line above the notepad, where it reads as the
 * scoreboard it is. Single-column throughout — SPEC-faction-ui-profile §1a
 * forbids a fixed-px grid on the mobile path, and this surface has no need of one.
 *
 * Pure frame, same contract as the desktop skin: every slot arrives already
 * rendered from `DuelCrossLink`, and none of the duel's arithmetic or status
 * branching is visible from here.
 */
import type { CSSProperties } from 'react'
import type { DuelRailSkinProps } from '../DuelCrossLink'

const WIN_BORDER = 'var(--faction-wow-win-border)'
const TITLE_FROM = 'var(--faction-wow-title-from)'
const TITLE_TO = 'var(--faction-wow-title-to)'
const TITLE_TEXT = 'var(--faction-wow-title-text)'
const BODY_BG = 'var(--faction-wow-body-bg)'
const NOTEPAD_BG = 'var(--faction-wow-notepad-bg)'
const NOTEPAD_BORDER = 'var(--faction-wow-notepad-border)'
const DOT = 'var(--faction-wow-dot)'
const CARD_TEXT = 'var(--faction-wow-card-text)'
const SCRIPT = 'var(--faction-wow-card-font)'

/** The phone window's three traffic lights — smaller than the desktop set. */
function TitleDots() {
  const colors = [
    'var(--faction-wow-scrap-deep)',
    'var(--faction-wow-tape)',
    'var(--faction-wow-ivy-leaf)',
  ]
  return (
    <span style={{ display: 'flex', gap: 'var(--space-xs)' }} aria-hidden>
      {colors.map((color) => (
        <span
          key={color}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: color,
            border: '1.2px solid rgba(255,255,255,0.7)',
          }}
        />
      ))}
    </span>
  )
}

export default function WowMobileDuelRail({
  accent,
  headline,
  tally,
  note,
  body,
}: DuelRailSkinProps) {
  // ponytail: `maxWidth` is intentionally ignored on mobile. The rail is
  // full-bleed inside the phone column, so the desktop archetype-width map has
  // nothing to line up with here.
  const shell: CSSProperties = {
    margin: 'var(--space-md) 0',
    borderRadius: 16,
    overflow: 'hidden',
    border: `2px solid ${WIN_BORDER}`,
    borderLeft: `4px solid ${accent}`,
    boxShadow: `0 8px 22px color-mix(in srgb, ${accent} 20%, transparent)`,
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-sm)',
    color: CARD_TEXT,
  }

  return (
    <div style={shell}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          padding: 'var(--space-sm) var(--space-md)',
          background: `linear-gradient(180deg, ${TITLE_FROM}, ${TITLE_TO})`,
          borderBottom: `2px solid ${WIN_BORDER}`,
          color: TITLE_TEXT,
        }}
      >
        <TitleDots />
        <span style={{ fontFamily: SCRIPT, fontSize: 'var(--text-content)', fontWeight: 700 }}>
          {headline}
        </span>
      </div>

      <div
        style={{
          padding: 'var(--space-md)',
          background: BODY_BG,
          backgroundImage: `radial-gradient(${DOT} 1.4px, transparent 1.4px)`,
          backgroundSize: '13px 13px',
        }}
      >
        {tally && (
          <div
            style={{
              fontFamily: SCRIPT,
              fontSize: 'var(--text-title)',
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
              background: NOTEPAD_BG,
              border: `1.5px solid ${NOTEPAD_BORDER}`,
              borderRadius: 10,
              padding: 'var(--space-md)',
            }}
          >
            {body}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Ephemerists MOBILE duel rail (#724) — the same ledger leaf, thumbed down.
 *
 * Two changes from the desktop sheet, both forced by phone width:
 *  - the header stacks the rubric mark and the headline into one wrapping row
 *    with tighter side margins (a Cinzel opponent name and a rule on one narrow
 *    line otherwise breaks mid-word);
 *  - the settled tally sits centred on its own ruled band, which is where a
 *    scoreboard belongs when there is no second column to hold it.
 *
 * Single-column throughout — SPEC-faction-ui-profile §1a forbids a fixed-px
 * grid on the mobile path, and nothing here wants one.
 *
 * Same contract and the same restraint as the desktop skin: every slot arrives
 * pre-rendered, `body` is `null` for `declined`/`forfeited`, `tally`/`note` are
 * `null` outside `settled`, and no container sets a `fontSize` (#769).
 *
 * `maxWidth` is deliberately ignored: the rail is full-bleed inside the phone
 * column, so the desktop archetype-width map has nothing to line up with.
 */
import type { CSSProperties } from 'react'
import { Foxing } from '../../../components/cards/ephemeristsAtoms'
import type { DuelRailSkinProps } from '../DuelCrossLink'

const VELLUM = 'var(--eph-vellum)'
const VELLUM_DEEP = 'var(--eph-vellum-deep)'
const TEXT = 'var(--eph-vellum-text)'
const RUBRIC = 'var(--eph-rubric)'
const OCHRE = 'var(--eph-gold)'
const LAPIS = 'var(--eph-lapis)'
const DISPLAY = 'var(--eph-display)'
const SERIF = 'var(--eph-serif)'

const HAIRLINE = `1px solid color-mix(in srgb, ${TEXT} 22%, transparent)`
const HAIRLINE_FAINT = `1px solid color-mix(in srgb, ${TEXT} 12%, transparent)`
const DOUBLE_RULE = `0 2px 0 -1px color-mix(in srgb, ${LAPIS} 45%, transparent)`

/** The rubric mark — a scribe's sigil used as an icon. Not text. */
function Rubric({ glyph = '✧' }: { glyph?: string }) {
  return (
    <span
      aria-hidden
      style={{
        color: RUBRIC,
        // eslint-disable-next-line local/no-raw-style-values -- ornament: rubric glyph, sized to the rule it leads.
        fontSize: 11,
        lineHeight: 1,
      }}
    >
      {glyph}
    </span>
  )
}

export default function EphemeristsMobileDuelRail({
  accent,
  soft,
  headline,
  tally,
  note,
  body,
  actions,
}: DuelRailSkinProps) {
  const sheet: CSSProperties = {
    margin: 'var(--space-md) 0',
    position: 'relative',
    overflow: 'hidden',
    background: VELLUM,
    border: HAIRLINE_FAINT,
    borderLeft: `4px solid ${accent}`,
    fontFamily: SERIF,
    color: TEXT,
    // No `fontSize` (#769).
  }

  return (
    <div style={sheet}>
      <Foxing opacity={0.4} />

      <div style={{ position: 'relative', zIndex: 2 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 'var(--space-sm)',
            flexWrap: 'wrap',
            padding: 'var(--space-sm) var(--space-md)',
            background: soft,
            borderBottom: `1px solid color-mix(in srgb, ${OCHRE} 60%, transparent)`,
            boxShadow: DOUBLE_RULE,
            fontFamily: DISPLAY,
            letterSpacing: '0.05em',
          }}
        >
          <Rubric />
          {headline}
        </div>

        <div style={{ padding: 'var(--space-md)' }}>
          {tally && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: 'var(--space-sm)',
                // Mixed toward the text ink, not toward white: `--eph-vellum-text`
                // flips to parchment in dark, so the cell stays distinct in both.
                background: `color-mix(in srgb, ${VELLUM} 92%, ${TEXT})`,
                borderTop: HAIRLINE,
                borderBottom: HAIRLINE,
                fontFamily: DISPLAY,
                letterSpacing: '0.08em',
              }}
            >
              {tally}
            </div>
          )}

          {/* Marginal gloss — ruled ochre above, blue ink below, led by a
              scribe's sigil. Not a pulsing dot; this faction does not blink. */}
          {note && (
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 'var(--space-sm)',
                marginTop: tally ? 'var(--space-sm)' : 0,
                padding: 'var(--space-xs) var(--space-sm)',
                background: soft,
                borderTop: `1px solid color-mix(in srgb, ${OCHRE} 55%, transparent)`,
                borderBottom: `1px solid color-mix(in srgb, ${LAPIS} 45%, transparent)`,
                fontStyle: 'italic',
              }}
            >
              <Rubric glyph="❧" />
              <div style={{ flex: '1 1 0', minWidth: 0 }}>{note}</div>
            </div>
          )}

          {body && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  marginTop: 'var(--space-md)',
                }}
              >
                <Rubric />
                <span
                  aria-hidden
                  style={{
                    flex: '1 1 0',
                    height: 1,
                    background: `color-mix(in srgb, ${OCHRE} 55%, transparent)`,
                    boxShadow: DOUBLE_RULE,
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: 'var(--space-sm)',
                  padding: 'var(--space-md)',
                  background: VELLUM_DEEP,
                  border: HAIRLINE_FAINT,
                }}
              >
                {body}
              </div>
            </>
          )}

          {/* The owner's action row (#752), ruled off with an ochre hairline. */}
          {actions && (
            <div
              style={{
                marginTop: 'var(--space-md)',
                paddingTop: 'var(--space-sm)',
                borderTop: `1px solid color-mix(in srgb, ${OCHRE} 55%, transparent)`,
              }}
            >
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

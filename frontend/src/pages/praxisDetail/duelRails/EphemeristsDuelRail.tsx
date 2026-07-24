/**
 * Ephemerists DESKTOP duel rail (#724) — the duel context as an entry in a
 * foxed vellum ledger.
 *
 * The quietest skin in the set. Nothing is hard-bordered: every division is a
 * 1px rule, and the only "panel" is a shade of vellum. The header carries the
 * manuscript's double rule — an ochre hairline with a blue-ink rule offset 2px
 * beneath it — and an age-foxing overlay blends over the whole sheet with the
 * real content lifted above it on z-index 2.
 *
 * PURE FRAME. `headline`, `tally`, `note` and `body` arrive already rendered
 * from `DuelCrossLink`; the per-`DuelStatus` branch table, the roster, the
 * next-step line and every stakes figure live in `components/duel/shared.tsx`.
 * This file decides only where the rules go. In particular:
 *  - `body` is `null` for `declined` and `forfeited` — there is no race left.
 *    The ledger simply ends after the header, which is the correct empty state;
 *    no substitute roster is drawn.
 *  - `tally` and `note` are `null` outside `settled`, and no height is reserved
 *    for them.
 *
 * DESIGN NOTES, where the mock and the contract disagree — the contract wins:
 *  - The mock's eyebrow reads "CONTRA". That is *copy*, and duel copy is
 *    faction-neutral by decision (#718): every string comes from `praxis.json`,
 *    and there is no such key. Identity here is visual only, so the eyebrow is
 *    the rubric glyph alone — ornament, not an invented Latin word.
 *  - The mock rules the roster as two ledger lines and sets the stakes under a
 *    "WHAT IS AT STAKE" rubric. Both sit *inside* the opaque `body` node, so a
 *    skin cannot reach them. The ledger treatment is applied to the body band
 *    as a whole and the rubric becomes an undecorated divider above it.
 *  - The mock's tally is a two-cell ruled box. `tally` is one node carrying both
 *    figures, so it gets one ruled box; splitting it would mean recomputing.
 *
 * No `fontSize` on any container (#769) — the slots size themselves and a
 * wrapper size would silently override all of them at once. This skin
 * contributes face, colour and rules only. `fontFamily` IS set, deliberately:
 * that is a skin's to own (WORLD_ZERO_STYLE §4a).
 *
 * Colours are the existing `--eph-*` token block; no new variables. Structural
 * hairlines are mixed from `--eph-vellum-text` rather than `--eph-ink`, because
 * ink stays dark in both themes while vellum-text flips to parchment — an
 * ink-based rule is invisible on the dark tobacco vellum.
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

/** Hairline: a rule, not a border. Everything on this sheet is drawn at 1px. */
const HAIRLINE = `1px solid color-mix(in srgb, ${TEXT} 22%, transparent)`
const HAIRLINE_FAINT = `1px solid color-mix(in srgb, ${TEXT} 12%, transparent)`

/**
 * The manuscript double rule: an ochre hairline with a blue-ink rule ruled 2px
 * under it. Drawn as a box-shadow so it costs no element and never affects
 * layout — the second line is a second ruling of the same edge.
 */
const DOUBLE_RULE = `0 2px 0 -1px color-mix(in srgb, ${LAPIS} 45%, transparent)`

/** The rubric mark — a scribe's sigil, used as an icon. Not text. */
function Rubric({ glyph = '✧' }: { glyph?: string }) {
  return (
    <span
      aria-hidden
      style={{
        color: RUBRIC,
        // ornament: a scribe's mark used as an icon, sized to the rule it leads
        // — not type on the content scale (WORLD_ZERO_STYLE §4a).
        // eslint-disable-next-line local/no-raw-style-values -- ornament: rubric glyph.
        fontSize: 11,
        lineHeight: 1,
      }}
    >
      {glyph}
    </span>
  )
}

export default function EphemeristsDuelRail({
  accent,
  soft,
  maxWidth,
  headline,
  tally,
  note,
  body,
  actions,
}: DuelRailSkinProps) {
  const sheet: CSSProperties = {
    maxWidth,
    margin: 'var(--space-lg) 0',
    position: 'relative',
    overflow: 'hidden',
    background: VELLUM,
    border: HAIRLINE_FAINT,
    // The opponent's colour rides the left edge, thinner than the other skins:
    // 4px is already loud on a sheet whose every other line is 1px.
    borderLeft: `4px solid ${accent}`,
    fontFamily: SERIF,
    color: TEXT,
    // No `fontSize` (#769): the slots own their size, the frame owns none.
  }

  return (
    <div style={sheet}>
      <Foxing opacity={0.4} />

      {/* Content sits above the foxing, which is a blended overlay at z-index 1. */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* Header: opponent wash, ruled off with the double rule. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 'var(--space-sm)',
            flexWrap: 'wrap',
            padding: 'var(--space-sm) var(--space-lg)',
            background: soft,
            borderBottom: `1px solid color-mix(in srgb, ${OCHRE} 60%, transparent)`,
            boxShadow: DOUBLE_RULE,
            fontFamily: DISPLAY,
            letterSpacing: '0.06em',
          }}
        >
          <Rubric />
          {headline}
        </div>

        <div style={{ padding: 'var(--space-md) var(--space-lg)' }}>
          {/* Settled-only tally: ruled, never boxed-and-filled. Lighter vellum
              than the sheet, so it reads as a cell drawn on the page. */}
          {tally && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: 'var(--space-sm) var(--space-md)',
                // A shade OFF the sheet, mixed toward the text ink rather than
                // toward literal white: `--eph-vellum-text` flips to parchment
                // in dark, so the cell stays legibly distinct in both themes
                // instead of blazing white on the tobacco stock.
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

          {/* Settled-only note as a marginal gloss: an accent wash ruled ochre
              above and blue-ink below, led by a scribe's sigil. Deliberately
              NOT a pulsing dot — the Ephemerists do not blink. */}
          {note && (
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 'var(--space-sm)',
                marginTop: tally ? 'var(--space-sm)' : 0,
                padding: 'var(--space-xs) var(--space-md)',
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

          {/* The ledger band: roster, next step and stakes, on the shadowed
              verso stock. Opened by a rubric divider — the mock's lettered
              rubric minus its invented copy. */}
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

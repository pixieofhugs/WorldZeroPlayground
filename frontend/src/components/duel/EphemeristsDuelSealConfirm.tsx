/**
 * Ephemerists DESKTOP duel seal-confirm (#724) — the seal beat as a leaf of the
 * codex: foxed vellum, hairline rules, an inscriptional-caps masthead over the
 * manuscript double rule (ochre, blue ink 2px under it), and an italic hand for
 * the body.
 *
 * TWO MODES, ONE FILE (#751). `mode` is `'submit'` or `'forfeit'` and every
 * string for both comes from `useDuelSealCopy` — heading, body, note, confirm
 * label and the danger tone. This skin re-derives none of it. The one place the
 * mode changes the CHROME is the body: a forfeit is the single irreversible
 * duel beat, and it is the single place this skin allows weight, setting the
 * warning on an inked panel ruled in faded red. Everything else is identical
 * between the modes, which is the point of the shared surface.
 *
 * PURE FRAME otherwise. `StakesTiles` owns the win/lose arithmetic (Snide's
 * 0.0× lose falls out by construction) and the `pending` collapse to a single
 * solo-fallback line; `RaceRoster` reads `is_submitted`; `SealActions` owns the
 * global [Cancel] … [Submit] order (#646) and the destructive tone. None of the
 * three is dropped or reimplemented in either mode.
 *
 * Copy is faction-neutral by decision (#718) — the design's antiquarian voice is
 * tone reference, not strings, and no locale key is added. The one label this
 * skin adds, the stakes rubric, is the shipped `duelStakes.heading`.
 *
 * Colours are the existing `--eph-*` block; no new variables. Structural
 * hairlines mix from `--eph-vellum-text` (which flips to parchment in dark)
 * rather than `--eph-ink` (which stays dark), so a rule stays visible on the
 * dark-theme tobacco vellum.
 *
 * CONTRAST (#1168): this is the ONE seal skin that needed no change. Measured
 * with `utils/contrast.ts` in both themes — the forfeit body is `--eph-parchment`
 * on the inked cost panel at 13.39 / 15.52 (the skin had already routed around
 * the global red, and the note above records why); the marginal gloss is
 * `--eph-muted` on the vellum at 4.72 / 6.80; and on the ledger band the win
 * figure and the roster's 18px "sealed" mark clear at 5.69 / 10.68 with the zero
 * figure at 3.01 / 6.73 (24px bold, a 3:1 floor, and the tightest reading in the
 * whole family — a row exists for it precisely because of that). Nothing is
 * repainted; the pairings are rows in `utils/__tests__/factionContrast.test.ts`
 * so a later repaint of the vellum cannot silently sink them.
 *
 * One pairing on this surface IS below threshold and is deliberately left:
 * `--eph-muted` reads 4.00:1 on `--eph-vellum-deep`, which is a faction ink on a
 * faction sub-sheet rather than a global ink on faction paper. Different bug,
 * filed separately.
 */
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Foxing } from '../cards/ephemeristsAtoms'
import { factionCssVar } from '../../utils/factions'
import {
  duelSides,
  RaceRoster,
  SealActions,
  StakesTiles,
  useDuelSealCopy,
  type DuelSlotTheme,
} from './shared'
import type { DuelSealConfirmProps } from './DuelSealConfirm'

const VELLUM = 'var(--eph-vellum)'
const VELLUM_DEEP = 'var(--eph-vellum-deep)'
const TEXT = 'var(--eph-vellum-text)'
const MUTED = 'var(--eph-muted)'
const RUBRIC = 'var(--eph-rubric)'
const OCHRE = 'var(--eph-gold)'
const LAPIS = 'var(--eph-lapis)'
const INK = 'var(--eph-ink)'
const PARCHMENT = 'var(--eph-parchment)'
const DISPLAY = 'var(--eph-display)'
const SERIF = 'var(--eph-serif)'

const HAIRLINE_FAINT = `1px solid color-mix(in srgb, ${TEXT} 12%, transparent)`
const DOUBLE_RULE = `0 2px 0 -1px color-mix(in srgb, ${LAPIS} 45%, transparent)`

/** The rubric mark — a scribe's sigil used as an icon. Not text. */
export function Rubric({ glyph = '✧', color = RUBRIC }: { glyph?: string; color?: string }) {
  return (
    <span
      aria-hidden
      style={{
        color,
        // eslint-disable-next-line local/no-raw-style-values -- ornament: rubric glyph, sized to the rule it leads.
        fontSize: 11,
        lineHeight: 1,
      }}
    >
      {glyph}
    </span>
  )
}

/** A lettered rubric: mark, letterspaced red caps, then the double rule. */
export function RubricHeading({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginTop: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <Rubric />
        {/* .eyebrow owns the size (§4); this contributes the inscriptional face
            and the rubrication red only. */}
        <span className="eyebrow" style={{ fontFamily: DISPLAY, color: RUBRIC }}>
          {children}
        </span>
      </div>
      <div
        aria-hidden
        style={{
          marginTop: 'var(--space-xs)',
          height: 1,
          background: `color-mix(in srgb, ${OCHRE} 55%, transparent)`,
          boxShadow: DOUBLE_RULE,
        }}
      />
    </div>
  )
}

export default function EphemeristsDuelSealConfirm({
  duel,
  viewerCharacterId,
  taskPointValue,
  onConfirm,
  onCancel,
  busy,
  mode = 'submit',
}: DuelSealConfirmProps) {
  const { t } = useTranslation('praxis')
  const { me, foe } = duelSides(duel, viewerCharacterId)
  const copy = useDuelSealCopy(mode, duel, viewerCharacterId, taskPointValue)

  // Opponent tokens, the same rule as the Default dialog and the rail: the
  // foreign duelist looks foreign even on the Ephemerists' own vellum.
  const accent = factionCssVar(foe.faction_slug, 'card-accent')
  const theme: DuelSlotTheme = { accent, muted: MUTED, bodyFont: SERIF }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.heading}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        padding: 'var(--space-lg)',
        background: 'radial-gradient(circle, rgba(0,0,0,0.55), rgba(0,0,0,0.75))',
      }}
    >
      <div
        className="w-full max-w-[440px]"
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: VELLUM,
          border: HAIRLINE_FAINT,
          borderLeft: `4px solid ${accent}`,
          fontFamily: SERIF,
          color: TEXT,
        }}
      >
        <Foxing opacity={0.4} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Masthead — inscriptional caps over the manuscript double rule. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 'var(--space-sm)',
              padding: 'var(--space-md) var(--space-xl)',
              background: `color-mix(in srgb, ${accent} 10%, transparent)`,
              borderBottom: `1px solid color-mix(in srgb, ${OCHRE} 60%, transparent)`,
              boxShadow: DOUBLE_RULE,
            }}
          >
            <Rubric />
            <h2
              style={{
                fontFamily: DISPLAY,
                fontSize: 'var(--text-title)',
                fontWeight: 600,
                letterSpacing: '0.06em',
              }}
            >
              {copy.heading}
            </h2>
          </div>

          <div style={{ padding: 'var(--space-xl)' }}>
            {/* The body. In `forfeit` this is the cost panel — the one place a
                skin this quiet is allowed weight: inked stock, a faded-red rule
                and mark, and the warning set in parchment. The red carries the
                panel rather than the sentence, because rubric-on-ink is a
                ~2.5:1 pairing and the warning is the text a player must read. */}
            {copy.danger ? (
              <div
                style={{
                  display: 'flex',
                  gap: 'var(--space-sm)',
                  padding: 'var(--space-md)',
                  background: INK,
                  border: `1px solid ${RUBRIC}`,
                  borderLeft: `3px solid ${RUBRIC}`,
                  color: PARCHMENT,
                }}
              >
                <Rubric glyph="❦" />
                <p className="content-text" style={{ fontStyle: 'italic', lineHeight: 1.55 }}>
                  {copy.body}
                </p>
              </div>
            ) : (
              <p className="content-text" style={{ fontStyle: 'italic', lineHeight: 1.55 }}>
                {copy.body}
              </p>
            )}

            {/* The free-reopen half of the truth, as a marginal gloss. Same
                condition as every other skin, because it is the same fact — a
                forfeit has none, and `copy.note` is null there. */}
            {copy.note && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 'var(--space-sm)',
                  marginTop: 'var(--space-md)',
                  padding: 'var(--space-xs) var(--space-md)',
                  borderTop: `1px solid color-mix(in srgb, ${OCHRE} 55%, transparent)`,
                  borderBottom: `1px solid color-mix(in srgb, ${LAPIS} 45%, transparent)`,
                  color: MUTED,
                  fontStyle: 'italic',
                }}
              >
                <Rubric glyph="❧" />
                <p className="content-text">{copy.note}</p>
              </div>
            )}

            <RubricHeading>{t('duelStakes.heading')}</RubricHeading>

            {/* The ledger band: what it is worth, and who has cast. */}
            <div
              style={{
                marginTop: 'var(--space-sm)',
                padding: 'var(--space-md)',
                background: VELLUM_DEEP,
                border: HAIRLINE_FAINT,
              }}
            >
              <StakesTiles
                viewerFactionSlug={me.faction_slug}
                opponentFactionSlug={foe.faction_slug}
                opponentName={foe.display_name}
                taskPointValue={taskPointValue}
                status={duel.status}
                theme={theme}
              />
              <RaceRoster me={me} foe={foe} theme={theme} />
            </div>

            {/* ponytail: SealActions keeps its shared btn-outline / btn-primary
                pair. The mock wants ruled, unshadowed buttons; giving them an
                Ephemerist face would mean a skin slot on the shared component,
                which is foundation work, not a skin change — and the global
                [Cancel] … [Submit] order (#646) matters more than the chrome. */}
            <div style={{ marginTop: 'var(--space-xl)' }}>
              <SealActions
                onConfirm={onConfirm}
                onCancel={onCancel}
                busy={busy}
                confirmLabel={copy.confirmLabel}
                danger={copy.danger}
                theme={theme}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

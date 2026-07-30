/**
 * Ephemerists duel seal-confirm (#724, swept onto the Valley plate by #1208) —
 * the seal beat as one plate off the field journal: papyrus inside a hairline,
 * an incised small-caps masthead over the brass/nile double rule, and an italic
 * hand for the body.
 *
 * ONE responsive component since #1313 retired the `mobileDuelSeal` twin.
 * `DuelSealSheet` holds the plate in a centred card on a laptop and lets it fill
 * the screen on a phone. The papyrus and the opponent's edge are `ground`; the
 * hairline that frames a floating plate is `card`. The twin's centred masthead
 * went with it — the incised caps read left-aligned at both widths, as they do
 * on every other Ephemerists surface.
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
 * Colours are the `--faction-ephemerists-plate-*` block; no new variables. The
 * hairline mixes from `-line`, the plate's own border weight, so a rule stays
 * visible on the night plate without a ternary.
 *
 * CONTRAST (#1168, re-measured on the new grounds for #1208): the forfeit body
 * is `-band-ink` on the night band at 12.44 / 14.00 — the skin routes around the
 * global red, and the note below records why; the marginal gloss is `-quiet` on
 * the plate at 5.60 / 5.98; and the ledger band moved from the codex's
 * `--eph-vellum-deep` to `-plate-inner`, where the win figure and the roster's
 * 18px "sealed" mark clear at 7.41 / 9.18 and the zero figure — 24px bold
 * against a 3:1 floor — sits at 3.93 / 5.78. The plate is the ONE ground in the
 * family that improved both: the codex band had the zero figure at 3.01:1, the
 * narrowest reading anywhere, and it is no longer the tightest. Both rows are in
 * `utils/__tests__/factionContrast.test.ts`, repointed to the new sheet, so a
 * later repaint of the plate cannot sink them.
 *
 * OCHRE IS A MARK, NEVER AN INK HERE. `-plate-ochre` reads 4.46:1 on the plate,
 * a near miss, so it draws the rubric glyph, the cost panel's rule and the
 * panel's edge — nothing legible is set in it. `-brass` is likewise a rule
 * colour by its own declaration.
 */
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
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
import DuelSealSheet from './DuelSealSheet'

import {
  BAND,
  BAND_INK,
  BRASS,
  CAPS,
  INK,
  INNER,
  LINE,
  NILE,
  OCHRE,
  PLATE,
  QUIET,
  READING,
} from '../factionMarks/ephemeristsPlate'

const HAIRLINE_FAINT = `1px solid ${LINE}`
const DOUBLE_RULE = `0 2px 0 -1px color-mix(in srgb, ${NILE} 45%, transparent)`

/**
 * The rubric mark — an incised sigil used as an icon. Not text. Local since
 * #1313: it was exported for the retired phone twin, and nothing outside this
 * file draws it.
 */
function Rubric({ glyph = '✧', color = OCHRE }: { glyph?: string; color?: string }) {
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

/**
 * A lettered rubric: mark, letterspaced red caps, then the double rule. Local
 * since #1313, for the same reason as {@link Rubric}.
 */
function RubricHeading({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginTop: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <Rubric />
        {/* .eyebrow owns the size (§4); this contributes the inscriptional face
            and the rubrication red only. */}
        <span className="eyebrow" style={{ fontFamily: CAPS, color: OCHRE }}>
          {children}
        </span>
      </div>
      <div
        aria-hidden
        style={{
          marginTop: 'var(--space-xs)',
          height: 1,
          background: `color-mix(in srgb, ${BRASS} 55%, transparent)`,
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
  const theme: DuelSlotTheme = { accent, muted: QUIET, bodyFont: READING }

  return (
    <DuelSealSheet
      label={copy.heading}
      ground={{
        position: 'relative',
        background: PLATE,
        borderLeft: `4px solid ${accent}`,
        fontFamily: READING,
        color: INK,
      }}
      card={{
        overflow: 'hidden',
        borderTop: HAIRLINE_FAINT,
        borderRight: HAIRLINE_FAINT,
        borderBottom: HAIRLINE_FAINT,
      }}
    >
      <div style={{ position: 'relative', zIndex: 2, flex: 1 }}>
        {/* Masthead — inscriptional caps over the manuscript double rule. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 'var(--space-sm)',
            padding: 'var(--space-md) var(--space-xl)',
            background: `color-mix(in srgb, ${accent} 10%, transparent)`,
            borderBottom: `1px solid color-mix(in srgb, ${BRASS} 60%, transparent)`,
            boxShadow: DOUBLE_RULE,
          }}
        >
          <Rubric />
          <h2
            style={{
              fontFamily: CAPS,
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
                background: BAND,
                border: `1px solid ${OCHRE}`,
                borderLeft: `3px solid ${OCHRE}`,
                color: BAND_INK,
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
                borderTop: `1px solid color-mix(in srgb, ${BRASS} 55%, transparent)`,
                borderBottom: `1px solid color-mix(in srgb, ${NILE} 45%, transparent)`,
                color: QUIET,
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
              background: INNER,
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
    </DuelSealSheet>
  )
}

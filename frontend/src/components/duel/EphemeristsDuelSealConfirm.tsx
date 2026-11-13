/**
 * Ephemerists duel seal-confirm (#724, Valley plate #1208): papyrus plate, incised
 * caps masthead (never centred), brass/nile double rule. Pure frame; all copy from
 * `useDuelSealCopy` (#751, faction-neutral #718). A forfeit is the one place this
 * skin allows weight: the body on an inked panel ruled in ochre.
 *
 * Contrast (#1168, #1627 — the plate is night in both cascades): the zero figure in
 * `--color-danger` is the tightest reading (3.31 / 5.78, 24px bold, 3:1 floor);
 * watch it. Ochre is a mark, never an ink HERE (4.46:1 on papyrus); `-brass` is a
 * rule colour too.
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
  BRASS_RULE,
  CAPS,
  INK,
  INNER,
  LINE,
  OCHRE,
  PLATE,
  QUIET,
  READING,
} from '../factionMarks/ephemeristsPlate'
import { factionBodyVars } from '../../utils/factionBodyFace'

const HAIRLINE_FAINT = `1px solid ${LINE}`
const DOUBLE_RULE = `0 2px 0 -1px color-mix(in srgb, ${BRASS_RULE} 45%, transparent)`
/**
 * "Sealed" ink: global `--color-success` is 1.76:1 on the night cell (#1627); this
 * is 9.18:1. Row `ephemerists seal ledger band, credit ink` in factionContrast.test.ts.
 */
const CREDIT = 'var(--faction-ephemerists-card-credit)'

/** The rubric mark, an icon, not text. */
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

/** Mark, letterspaced caps, then the double rule. */
function RubricHeading({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginTop: 'var(--space-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <Rubric />
        {/* .label-heading owns the size (§4) */}
        <span className="label-heading" style={{ fontFamily: CAPS, color: OCHRE }}>
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

  // Opponent's tokens, as in the Default dialog (#310).
  const accent = factionCssVar(foe.faction_slug, 'card-accent')
  const theme: DuelSlotTheme = { accent, muted: QUIET, bodyFont: READING, credit: CREDIT }

  return (
    <DuelSealSheet
      label={copy.heading}
      ground={{ ...factionBodyVars("ephemerists"),
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
          {/* Forfeit: the ochre carries the panel, not the text (~2.5:1 on ink). */}
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
              <p className="content-text" style={{ lineHeight: 1.55 }}>
                {copy.body}
              </p>
            </div>
          ) : (
            <p className="content-text" style={{ lineHeight: 1.55 }}>
              {copy.body}
            </p>
          )}

          {copy.note && (
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 'var(--space-sm)',
                marginTop: 'var(--space-md)',
                padding: 'var(--space-xs) var(--space-md)',
                borderTop: `1px solid color-mix(in srgb, ${BRASS} 55%, transparent)`,
                borderBottom: `1px solid color-mix(in srgb, ${BRASS_RULE} 45%, transparent)`,
                color: QUIET,
              }}
            >
              <Rubric glyph="❧" />
              <p className="content-text">{copy.note}</p>
            </div>
          )}

          <RubricHeading>{t('duelStakes.heading')}</RubricHeading>

          <div
            style={{
              marginTop: 'var(--space-sm)',
              padding: 'var(--space-md)',
              background: INNER,
              border: HAIRLINE_FAINT,
            }}
          >
            <StakesTiles
              me={me}
              opponentName={foe.display_name}
              taskPointValue={taskPointValue}
              status={duel.status}
              theme={theme}
            />
            <RaceRoster me={me} foe={foe} theme={theme} />
          </div>

          {/* ponytail: shared SealActions buttons, not the mock's ruled ones; needs
              a skin slot on SealActions. */}
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

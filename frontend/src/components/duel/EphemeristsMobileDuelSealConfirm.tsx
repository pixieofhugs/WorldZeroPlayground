/**
 * Ephemerists MOBILE duel seal-confirm (#724, swept onto the Valley plate by
 * #1208) — the plate as a bottom sheet: full-bleed on the page ground, the
 * papyrus pinned to a ruled top edge, the actions last so the thumb lands on
 * them.
 *
 * Same vocabulary as the desktop plate — hairline rules, the brass/nile double
 * rule, an incised small-caps masthead, an italic hand — and the same two modes
 * (#751): `useDuelSealCopy` owns the heading, body, note,
 * confirm label and danger tone for both, and the forfeit's inked cost panel is
 * the one chrome difference between them.
 *
 * Single-column, no grid (SPEC-faction-ui-profile §1a). Pure frame: every
 * figure comes from `StakesTiles`, every cast status from `RaceRoster`, and the
 * action pair and its destructive tone from `SealActions`. The rubric mark and
 * the rubric heading are shared with the desktop skin rather than re-declared.
 */
import { useTranslation } from 'react-i18next'
import { factionCssVar } from '../../utils/factions'
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
} from '../cards/ephemeristsPlate'
import { Rubric, RubricHeading } from './EphemeristsDuelSealConfirm'
import {
  duelSides,
  RaceRoster,
  SealActions,
  StakesTiles,
  useDuelSealCopy,
  type DuelSlotTheme,
} from './shared'
import type { DuelSealConfirmProps } from './DuelSealConfirm'

const HAIRLINE_FAINT = `1px solid ${LINE}`
const DOUBLE_RULE = `0 2px 0 -1px color-mix(in srgb, ${NILE} 45%, transparent)`

export default function EphemeristsMobileDuelSealConfirm({
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

  const accent = factionCssVar(foe.faction_slug, 'card-accent')
  const theme: DuelSlotTheme = { accent, muted: QUIET, bodyFont: READING }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.heading}
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'var(--color-bg-page)' }}
    >
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: PLATE,
          borderTop: `4px solid ${accent}`,
          fontFamily: READING,
          color: INK,
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Masthead — centred on the sheet, over the double rule. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
              gap: 'var(--space-sm)',
              padding: 'var(--space-md) var(--space-lg)',
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
                letterSpacing: '0.05em',
                textAlign: 'center',
              }}
            >
              {copy.heading}
            </h2>
          </div>

          <div style={{ padding: 'var(--space-lg)' }}>
            {/* Forfeit: the inked cost panel, ruled and marked in faded red,
                with the warning itself in parchment so it stays readable. */}
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

            {copy.note && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 'var(--space-sm)',
                  marginTop: 'var(--space-md)',
                  padding: 'var(--space-xs) var(--space-sm)',
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

            {/* ponytail: shared SealActions, same reasoning as the desktop leaf
                — thumb-sized Ephemerist buttons would need a skin slot on the
                shared component, which is foundation work. */}
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

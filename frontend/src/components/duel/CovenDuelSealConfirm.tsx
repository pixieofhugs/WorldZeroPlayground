/**
 * Cozy Coven duel seal-confirm (#720, #1209): the Default content on the coven's
 * paper (slip band, candlelit page, stakes panel). Pure frame: figures and copy
 * branches live in `duel/shared.tsx`; the design's hardcoded numbers are absent.
 * Copy is faction-neutral (#718).
 *
 * Contrast: the forfeit body uses `--faction-coven-card-notice` (6.32 / 11.37)
 * because `--color-danger` is 4.31:1 on the page; red stays as the textless 3px
 * rule (#1168). Rows in `utils/__tests__/factionContrast.test.ts`.
 */
import { factionCssVar } from '../../utils/factions'
import DuelSealSheet from './DuelSealSheet'
import {
  Braid,
  BORDER,
  CARD,
  DEEP,
  DISPLAY,
  GOLD,
  INK,
  PAGE,
  READING,
  SHADOW,
  SLIP_SHEET,
  SOFT,
  Spark,
} from '../factionMarks/covenSlip'
import { CovenSigil } from '../sigil/CovenSigil'
import {
  duelSides,
  RaceRoster,
  SealActions,
  StakesTiles,
  useDuelSealCopy,
  type DuelSlotTheme,
} from './shared'
import type { DuelSealConfirmProps } from './DuelSealConfirm'
import { factionBodyVars } from '../../utils/factionBodyFace'

/** Sheet-measured warning ink (#694, #1168). */
const NOTICE = 'var(--faction-coven-card-notice)'

/** Three longhands: a `border` shorthand in `card` would reset the spine in `ground` (#1313). */
const WARD_EDGE = `2px solid ${BORDER}`

export default function CovenDuelSealConfirm({
  duel,
  viewerCharacterId,
  taskPointValue,
  onConfirm,
  onCancel,
  busy,
  mode = 'submit',
}: DuelSealConfirmProps) {
  const { me, foe } = duelSides(duel, viewerCharacterId)
  const copy = useDuelSealCopy(mode, duel, viewerCharacterId, taskPointValue)

  // Opponent's tokens, as in the Default dialog (#310).
  const accent = factionCssVar(foe.faction_slug, 'card-accent')
  const theme: DuelSlotTheme = { accent, muted: SOFT, bodyFont: READING }

  return (
    <DuelSealSheet
      label={copy.heading}
      ground={{ ...factionBodyVars("coven"),
        color: INK,
        fontFamily: READING,
        borderLeft: `4px solid ${accent}`,
      }}
      card={{
        borderRadius: 18,
        overflow: 'hidden',
        borderTop: WARD_EDGE,
        borderRight: WARD_EDGE,
        borderBottom: WARD_EDGE,
        boxShadow: SHADOW,
      }}
    >
      <div
        style={{
          flexShrink: 0,
          padding: 'var(--space-md) var(--space-lg)',
          background: SLIP_SHEET,
          borderBottom: `2px solid ${BORDER}`,
          color: INK,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <CovenSigil size={26} color={DEEP} />
          <h2 style={{ fontFamily: DISPLAY, fontSize: 'var(--text-title)', fontWeight: 600, lineHeight: 1.06 }}>
            {copy.heading}
          </h2>
        </div>
        <Braid style={{ marginTop: 'var(--space-sm)' }} />
      </div>

      {/* `flex: 1` so it reaches the bottom edge on a phone */}
      <div style={{ flex: 1, padding: 'var(--space-lg)', background: PAGE }}>
        <p
          style={{
            fontSize: 'var(--text-content)',
            lineHeight: 1.5,
            color: SOFT,
            ...(copy.danger
              ? {
                  color: NOTICE,
                  fontWeight: 700,
                  paddingLeft: 'var(--space-md)',
                  borderLeft: '3px solid var(--color-danger)',
                }
              : {}),
          }}
        >
          {copy.body}
        </p>

        {copy.note && (
          <p
            style={{
              marginTop: 'var(--space-sm)',
              fontSize: 'var(--text-content)',
              color: 'var(--color-success)',
            }}
          >
            {copy.note}
          </p>
        )}

        <div
          style={{
            marginTop: 'var(--space-md)',
            background: CARD,
            border: `1.5px solid ${BORDER}`,
            borderRadius: 12,
            padding: 'var(--space-md)',
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

        <div style={{ marginTop: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Spark size={12} color={GOLD} />
          <Braid style={{ flex: 1 }} />
          <Spark size={12} color={GOLD} />
        </div>

        <div style={{ marginTop: 'var(--space-md)' }}>
          <SealActions
            onConfirm={onConfirm}
            onCancel={onCancel}
            busy={busy}
            confirmLabel={copy.confirmLabel}
            danger={copy.danger}
            theme={theme}
          />
        </div>
        {/* ponytail: shared SealActions buttons, no Coven gradient skin slot;
            add a skin prop to SealActions if the pink button is wanted. */}
      </div>
    </DuelSealSheet>
  )
}

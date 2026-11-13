/**
 * Warriors of Whimsy duel seal-confirm (#895), the kit's `16-duel-seal.html`:
 * gold-framed enclosure on a plum scrim, checkered barrier, crest by the title,
 * roster and stakes on parchment plates. Full-screen on phone; 46px buttons via
 * `phoneClassName`. Pure frame: figures, roster and mode copy from `./shared`.
 *
 * Only `submit | forfeit` exist (the kit's accept/decline beats are not built).
 * Not drawable through the slot contract, deliberately: the ⚔ medallion between
 * roster cards, per-tile grounds, and the kit's hardcoded ×1.5/×0.5 captions
 * (the viewer's faction owns those; this skin is picked by the task's).
 *
 * Contrast (#1168, #1173): danger is 4.40:1 on cream, so the forfeit body takes
 * `NOTICE`; olive muted is 4.24:1 on parchment, so slots take `PANEL_QUIET`.
 * Rows in `utils/__tests__/factionContrast.test.ts`.
 */
import { factionCssVar } from '../../utils/factions'
import { WowSigil } from '../sigil/WowSigil'
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
  BODY_FONT,
  CHAMPION,
  DISPLAY_FONT,
  HOLD,
  INK,
  LISTS_BG,
  ListsBand,
  ListsSpark,
  listsEyebrow,
  NOTICE,
  PANEL,
  PANEL_BORDER,
  PANEL_QUIET,
  Rosette,
  SCRIM,
  SHADOW,
} from './wowLists'
import { factionBodyVars } from '../../utils/factionBodyFace'

export default function WowDuelSealConfirm({
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
  // Opponent tokens (#310): rosette ring only, see `wowLists.tsx`.
  const accent = factionCssVar(foe.faction_slug, 'card-accent')
  const soft = factionCssVar(foe.faction_slug, 'light')

  // PANEL_QUIET: the muted slots sit on parchment, where olive is 4.24:1 (#1173).
  const theme: DuelSlotTheme = { accent: CHAMPION, muted: PANEL_QUIET, bodyFont: BODY_FONT }

  return (
    <DuelSealSheet
      label={copy.heading}
      scrim={SCRIM}
      ground={{ ...factionBodyVars("wow"), background: LISTS_BG, color: INK, fontFamily: BODY_FONT }}
      card={{
        borderRadius: 15,
        overflow: 'hidden',
        border: `2px solid ${HOLD}`,
        boxShadow: `0 26px 54px -22px ${SHADOW}`,
      }}
      phoneClassName="wow-seal-actions--mobile"
    >
      <ListsBand />

      <div style={{ flex: 1, padding: 'var(--space-lg)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-md)',
          }}
        >
          <WowSigil size={46} />
          <div style={{ minWidth: 0 }}>
            <h2
              className="content-title"
              style={{ fontFamily: DISPLAY_FONT, color: INK, lineHeight: 1.15 }}
            >
              {copy.heading} <ListsSpark />
            </h2>
          </div>
        </div>

        {/* Forfeit: NOTICE ink, red only as the rule (#1168). */}
        <p
          className="content-text"
          style={{
            fontFamily: BODY_FONT,
            lineHeight: 1.55,
            ...(copy.danger
              ? {
                  color: NOTICE,
                  fontWeight: 700,
                  paddingLeft: 'var(--space-md)',
                  borderLeft: `3px solid var(--color-danger)`,
                }
              : {}),
          }}
        >
          {copy.body}
        </p>

        {copy.note && (
          <p
            className="content-text"
            style={{
              marginTop: 'var(--space-sm)',
              fontFamily: BODY_FONT,
              color: 'var(--color-success)',
            }}
          >
            {copy.note}
          </p>
        )}

        <div style={{ marginTop: 'var(--space-lg)' }}>
          <span
            style={{
              ...listsEyebrow,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              marginBottom: 'var(--space-sm)',
            }}
          >
            <Rosette accent={accent} soft={soft} size={18} />
          </span>
          <div
            style={{
              background: PANEL,
              border: `1.5px solid ${PANEL_BORDER}`,
              borderRadius: 11,
              padding: 'var(--space-md) var(--space-lg)',
            }}
          >
            <RaceRoster me={me} foe={foe} theme={theme} />
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-lg)' }}>
          <div
            style={{
              background: PANEL,
              border: `1.5px solid ${HOLD}`,
              borderRadius: 11,
              padding: 'var(--space-md) var(--space-lg)',
            }}
          >
            <StakesTiles
              me={me}
              opponentName={foe.display_name}
              taskPointValue={taskPointValue}
              status={duel.status}
              theme={theme}
            />
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-lg)' }}>
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
    </DuelSealSheet>
  )
}

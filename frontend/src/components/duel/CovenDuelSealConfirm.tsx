/**
 * Cozy Coven duel seal-confirm (#720, re-dressed by #1209) — the ward, asking
 * you to be sure. ONE responsive component: `DuelSealSheet` hangs this ward in
 * a centred card on a laptop and full-bleed on a phone, and the phone keeps the
 * opponent's spine rather than a rounded top edge and grab handle — a bottom
 * sheet you cannot drag has no edge to advertise.
 *
 * The Default dialog's content, re-hung on the coven's own paper: a slip band
 * across the head carrying the coven's witch hat and a braided thread, the
 * candlelit page beneath it, and the stakes + roster on a panel laid on that
 * wash. Same beat, Coven's hand.
 *
 * THIS REPLACES THE `wow.exe` WINDOW. The traffic-light title bar, the dotted
 * board and the notepad scrap were the lo-fi metaphor the v2 task card retired
 * (#1023); the frame is `--faction-coven-slip-*` / `--faction-coven-ward-*` now,
 * so it flips through the same cascade as every other Coven surface.
 *
 * Pure frame. `StakesTiles` computes the win/lose figures from `useGameConfig()`
 * and the viewer's own faction (Snide's 0.0× lose falls out by construction),
 * `RaceRoster` reads `is_submitted`, and the `pending` vs `active` copy branch is
 * the same one the Default skin makes. Nothing here recomputes or drops any of it.
 *
 * The design's hardcoded `+90 / +30` and `0.5×` are deliberately absent: those
 * are Coven's live numbers and the slot owns them. So is 2c's "can't edit while the
 * duel runs" — during `active` the reopen is free, and #718's `reopenNote` says so.
 *
 * Copy is faction-neutral by decision (#718): the design's witch voice is tone
 * reference, not strings. No new locale keys, and #1209 changed none.
 *
 * CONTRAST — RE-MEASURED, because the grounds moved (WORLD_ZERO_STYLE §3: a new
 * ground invalidates every contrast claim measured on the old one). The forfeit
 * body still takes `--faction-coven-card-notice` rather than `--color-danger`:
 * on the candlelit page the red is **4.31:1** in light, the identical reading it
 * had on the dotted board, and the notice ink clears at 6.32 / 11.37. The red
 * survives as the 3px rule beside the paragraph, carrying no text (#1168).
 * Everything else clears on the new pair and is left alone: the reopen note in
 * `--color-success` at 8.12 / 10.89 on the page, and on the ward panel the win
 * figure plus the roster's 18px "sealed" mark at 8.60 / 10.17 and the Snide zero
 * figure in `--color-danger` at 4.56 / 6.40 (24px bold, a 3:1 floor). Both
 * grounds are rows in `utils/__tests__/factionContrast.test.ts`.
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

/** The sheet-measured warning ink (#694), which the global red is not (#1168). */
const NOTICE = 'var(--faction-coven-card-notice)'

/**
 * The ward's own edge. Held as three longhands because the opponent's spine is
 * `ground` and a `border` shorthand in `card` would reset it (#1313).
 */
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

  // Opponent tokens, same rule as the Default dialog and the rail: the foreign
  // duelist looks foreign even on the coven's paper.
  const accent = factionCssVar(foe.faction_slug, 'card-accent')
  const theme: DuelSlotTheme = { accent, muted: SOFT, bodyFont: READING }

  return (
    <DuelSealSheet
      label={copy.heading}
      ground={{
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
      {/* the slip band — the hat, heading, braid */}
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

      {/* the candlelit page — `flex: 1` so it runs to the bottom edge when the
          sheet IS the screen, and lies at its own height on a laptop */}
      <div style={{ flex: 1, padding: 'var(--space-lg)', background: PAGE }}>
        {/* Notice ink, not the global red — see the contrast note above. */}
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

        {/* The free-reopen half of the truth — same condition as the Default
            skin, because it is the same fact, not a Coven flourish. A forfeit
            has no such note, and `copy.note` is null there. */}
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

        {/* paper laid on the wash: the two-outcome tiles and the race roster */}
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
            viewerFactionSlug={me.faction_slug}
            opponentFactionSlug={foe.faction_slug}
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
        {/* ponytail: SealActions keeps its shared btn-outline / btn-primary
            pair rather than growing a Coven gradient-button skin slot. The
            global [Cancel] … [Submit] order (#646) is worth more here than a
            pink button, and adding a skin prop would be foundation work. */}
      </div>
    </DuelSealSheet>
  )
}

/**
 * Cozy Coven DESKTOP duel seal-confirm (#720) — design panel 2b.
 *
 * The Default dialog's content, re-hung inside a centred `wow.exe` window:
 * traffic-light title bar, dotted board, notepad scrap for the stakes and the
 * roster, lo-fi pink confirm. Same beat, Coven's hand.
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
 * reference, not strings. No new locale keys.
 *
 * CONTRAST (#1168), measured with `utils/contrast.ts` in both themes. The dotted
 * board is a warm pink sheet and `--color-danger` reads **4.31:1** on it in
 * light — under the 4.5:1 this 18px body owes — so the forfeit body takes
 * `--faction-coven-card-notice` (6.33 / 10.73) and the red stays as the rule
 * beside it, carrying no text. That is `UaDuelSealConfirm`'s shape from #1167.
 * Everything else clears as shipped and is left alone: the reopen note in
 * `--color-success` at 8.13 / 10.28 on the board, and on the notepad scrap the
 * win figure plus the roster's "sealed" mark at 8.97 / 9.17 and the Snide zero
 * figure in `--color-danger` at 4.76 / 5.77 (24px bold, a 3:1 floor). Both
 * grounds are rows in `utils/__tests__/factionContrast.test.ts`.
 */
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

const WIN_BORDER = 'var(--faction-coven-win-border)'
const TITLE_FROM = 'var(--faction-coven-title-from)'
const TITLE_TO = 'var(--faction-coven-title-to)'
const TITLE_TEXT = 'var(--faction-coven-title-text)'
const BODY_BG = 'var(--faction-coven-body-bg)'
const NOTEPAD_BG = 'var(--faction-coven-notepad-bg)'
const NOTEPAD_BORDER = 'var(--faction-coven-notepad-border)'
const DOT = 'var(--faction-coven-dot)'
const CARD_TEXT = 'var(--faction-coven-card-text)'
const CARD_MUTED = 'var(--faction-coven-card-muted)'
/** The sheet-measured warning ink (#694), which the global red is not (#1168). */
const NOTICE = 'var(--faction-coven-card-notice)'
const SCRIPT = 'var(--faction-coven-card-font)'

function Sparkle({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 1c.6 5.2 2.8 7.4 8 8-5.2.6-7.4 2.8-8 8-.6-5.2-2.8-7.4-8-8 5.2-.6 7.4-2.8 8-8z"
        fill={color}
      />
    </svg>
  )
}

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
  // duelist looks foreign even inside Coven's window.
  const accent = factionCssVar(foe.faction_slug, 'card-accent')
  const theme: DuelSlotTheme = { accent, muted: CARD_MUTED, bodyFont: 'var(--font-body)' }

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
        className="w-full max-w-[460px]"
        style={{
          borderRadius: 12,
          overflow: 'hidden',
          border: `2px solid ${WIN_BORDER}`,
          borderLeft: `4px solid ${accent}`,
          boxShadow: `0 14px 34px color-mix(in srgb, ${accent} 30%, transparent)`,
          color: CARD_TEXT,
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* title bar */}
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
          <Sparkle size={12} color={TITLE_TEXT} />
          <h2 style={{ fontFamily: SCRIPT, fontSize: 'var(--text-title)', fontWeight: 700 }}>
            {copy.heading}
          </h2>
        </div>

        {/* dotted board */}
        <div
          style={{
            padding: 'var(--space-lg)',
            background: BODY_BG,
            backgroundImage: `radial-gradient(${DOT} 1.4px, transparent 1.4px)`,
            backgroundSize: '13px 13px',
          }}
        >
          {/* Notice ink, not the global red — see the contrast note above. */}
          <p
            style={{
              fontSize: 'var(--text-content)',
              lineHeight: 1.5,
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

          {/* notepad scrap: the two-outcome tiles and the race roster */}
          <div
            style={{
              marginTop: 'var(--space-md)',
              background: NOTEPAD_BG,
              border: `1.5px solid ${NOTEPAD_BORDER}`,
              borderRadius: 8,
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
          {/* ponytail: SealActions keeps its shared btn-outline / btn-primary
              pair rather than growing a Coven gradient-button skin slot. The
              global [Cancel] … [Submit] order (#646) is worth more here than a
              pink button, and adding a skin prop would be foundation work. */}
        </div>
      </div>
    </div>
  )
}

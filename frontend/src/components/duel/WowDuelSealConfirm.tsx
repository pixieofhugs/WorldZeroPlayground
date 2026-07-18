/**
 * Warriors of Whimsy DESKTOP duel seal-confirm (#720) — design panel 2b.
 *
 * The Default dialog's content, re-hung inside a centred `wow.exe` window:
 * traffic-light title bar, dotted board, notepad scrap for the stakes and the
 * roster, lo-fi pink confirm. Same beat, Wow's hand.
 *
 * Pure frame. `StakesTiles` computes the win/lose figures from `useGameConfig()`
 * and the viewer's own faction (Snide's 0.0× lose falls out by construction),
 * `RaceRoster` reads `is_submitted`, and the `pending` vs `active` copy branch is
 * the same one the Default skin makes. Nothing here recomputes or drops any of it.
 *
 * The design's hardcoded `+90 / +30` and `0.5×` are deliberately absent: those
 * are Wow's live numbers and the slot owns them. So is 2c's "can't edit while the
 * duel runs" — during `active` the reopen is free, and #718's `reopenNote` says so.
 *
 * Copy is faction-neutral by decision (#718): the design's witch voice is tone
 * reference, not strings. No new locale keys.
 */
import { useTranslation } from 'react-i18next'
import { factionCssVar } from '../../utils/factions'
import {
  duelSides,
  RaceRoster,
  SealActions,
  StakesTiles,
  type DuelSlotTheme,
} from './shared'
import type { DuelSealConfirmProps } from './DuelSealConfirm'

const WIN_BORDER = 'var(--faction-wow-win-border)'
const TITLE_FROM = 'var(--faction-wow-title-from)'
const TITLE_TO = 'var(--faction-wow-title-to)'
const TITLE_TEXT = 'var(--faction-wow-title-text)'
const BODY_BG = 'var(--faction-wow-body-bg)'
const NOTEPAD_BG = 'var(--faction-wow-notepad-bg)'
const NOTEPAD_BORDER = 'var(--faction-wow-notepad-border)'
const DOT = 'var(--faction-wow-dot)'
const CARD_TEXT = 'var(--faction-wow-card-text)'
const CARD_MUTED = 'var(--faction-wow-card-muted)'
const SCRIPT = 'var(--faction-wow-card-font)'

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

export default function WowDuelSealConfirm({
  duel,
  viewerCharacterId,
  taskPointValue,
  onConfirm,
  onCancel,
  busy,
}: DuelSealConfirmProps) {
  const { t } = useTranslation('praxis')
  const { me, foe } = duelSides(duel, viewerCharacterId)

  // Opponent tokens, same rule as the Default dialog and the rail: the foreign
  // duelist looks foreign even inside Wow's window.
  const accent = factionCssVar(foe.faction_slug, 'card-accent')
  const theme: DuelSlotTheme = { accent, muted: CARD_MUTED, bodyFont: 'var(--font-body)' }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('duelSeal.heading')}
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
            {t('duelSeal.heading')}
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
          <p style={{ fontSize: 'var(--text-content)', lineHeight: 1.5 }}>
            {duel.status === 'pending'
              ? t('duelSeal.bodyPending', { name: foe.display_name })
              : t('duelSeal.bodyActive', { name: foe.display_name })}
          </p>

          {/* The free-reopen half of the truth — same condition as the Default
              skin, because it is the same fact, not a Wow flourish. */}
          {duel.status === 'active' && !foe.is_submitted && (
            <p
              style={{
                marginTop: 'var(--space-sm)',
                fontSize: 'var(--text-sm)',
                color: 'var(--color-success)',
              }}
            >
              {t('duelSeal.reopenNote', { name: foe.display_name })}
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
            <SealActions onConfirm={onConfirm} onCancel={onCancel} busy={busy} theme={theme} />
          </div>
          {/* ponytail: SealActions keeps its shared btn-outline / btn-primary
              pair rather than growing a Wow gradient-button skin slot. The
              global [Cancel] … [Submit] order (#646) is worth more here than a
              pink button, and adding a skin prop would be foundation work. */}
        </div>
      </div>
    </div>
  )
}

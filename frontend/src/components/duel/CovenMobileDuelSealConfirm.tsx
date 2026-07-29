/**
 * Cozy Coven MOBILE duel seal-confirm (#720) — design panel 1b.
 *
 * The same content as the desktop window (2b is explicitly "the mobile sheet laid
 * out for the wider frame"), rebuilt as a bottom sheet: full-bleed on the page
 * background, chrome pinned to a rounded top edge, actions last so the thumb
 * lands on them. Single-column — no grid, per SPEC-faction-ui-profile §1a.
 *
 * Pure frame, same as the desktop skin: `StakesTiles` and `RaceRoster` own every
 * figure and the `pending`/`active` copy branch is the shared one. No new locale
 * keys — per-faction voice was declined for this epic (#718).
 *
 * The contrast readings are the desktop skin's verbatim — same two grounds, same
 * inks — so the forfeit body takes `--faction-coven-card-notice` here too and
 * the red survives as the rule (#1168). See `CovenDuelSealConfirm.tsx`.
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

/** The sheet's grab handle, standing in for the desktop window's traffic lights. */
function SheetHandle({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'block',
        width: 40,
        height: 4,
        borderRadius: 2,
        background: color,
        opacity: 0.5,
        margin: '0 auto',
      }}
    />
  )
}

export default function CovenMobileDuelSealConfirm({
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

  const accent = factionCssVar(foe.faction_slug, 'card-accent')
  const theme: DuelSlotTheme = { accent, muted: CARD_MUTED, bodyFont: 'var(--font-body)' }

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
          borderTop: `2px solid ${WIN_BORDER}`,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          overflow: 'hidden',
          boxShadow: `0 -8px 26px color-mix(in srgb, ${accent} 24%, transparent)`,
          color: CARD_TEXT,
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* sheet header */}
        <div
          style={{
            padding: 'var(--space-sm) var(--space-lg) var(--space-md)',
            background: `linear-gradient(180deg, ${TITLE_FROM}, ${TITLE_TO})`,
            borderBottom: `2px solid ${WIN_BORDER}`,
            color: TITLE_TEXT,
          }}
        >
          <SheetHandle color={TITLE_TEXT} />
          <h2
            style={{
              marginTop: 'var(--space-sm)',
              fontFamily: SCRIPT,
              fontSize: 'var(--text-title)',
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            {copy.heading}
          </h2>
        </div>

        <div
          style={{
            padding: 'var(--space-lg)',
            background: BODY_BG,
            backgroundImage: `radial-gradient(${DOT} 1.4px, transparent 1.4px)`,
            backgroundSize: '13px 13px',
          }}
        >
          {/* Notice ink, not the global red — see the desktop skin's note. */}
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
              background: NOTEPAD_BG,
              border: `1.5px solid ${NOTEPAD_BORDER}`,
              borderRadius: 10,
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

          {/* ponytail: actions keep the shared SealActions pair — thumb-sized
              styling would need a skin slot on the shared component, which is
              foundation work, not a skin change. */}
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
      </div>
    </div>
  )
}

/**
 * Cozy Coven MOBILE duel seal-confirm (#720, re-dressed by #1209) — the ward as
 * a bottom sheet.
 *
 * The same content as the desktop dialog (2b is explicitly "the mobile sheet laid
 * out for the wider frame"), rebuilt as a bottom sheet: full-bleed on the page
 * background, the slip band pinned to a rounded top edge, actions last so the
 * thumb lands on them. Single-column — no grid, per SPEC-faction-ui-profile §1a.
 *
 * The `wow.exe` chrome is gone with the desktop skin's: no traffic lights, no
 * dotted board, no notepad scrap. The grab handle survives, because it is a
 * PHONE affordance rather than a lo-fi mark — it tells a thumb which edge to
 * pull, and the slip has no opinion about that.
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
  Braid,
  BORDER,
  CARD,
  DISPLAY,
  INK,
  PAGE,
  READING,
  SigilMark,
  SLIP_SHEET,
  SOFT,
} from '../cards/covenSlip'
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

/** The sheet's grab handle — a phone affordance, not a `coven.exe` mark. */
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
  const theme: DuelSlotTheme = { accent, muted: SOFT, bodyFont: READING }

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
          borderTop: `2px solid ${BORDER}`,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          overflow: 'hidden',
          boxShadow: `0 -8px 26px color-mix(in srgb, ${accent} 24%, transparent)`,
          color: INK,
          fontFamily: READING,
        }}
      >
        {/* the slip band */}
        <div
          style={{
            padding: 'var(--space-sm) var(--space-lg) var(--space-md)',
            background: SLIP_SHEET,
            borderBottom: `2px solid ${BORDER}`,
            color: INK,
          }}
        >
          <SheetHandle color={INK} />
          <div
            style={{
              marginTop: 'var(--space-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-sm)',
            }}
          >
            <SigilMark size={24} />
            <h2 style={{ fontFamily: DISPLAY, fontSize: 'var(--text-title)', fontWeight: 600, lineHeight: 1.06 }}>
              {copy.heading}
            </h2>
          </div>
          <Braid style={{ marginTop: 'var(--space-sm)' }} />
        </div>

        <div style={{ padding: 'var(--space-lg)', background: PAGE }}>
          {/* Notice ink, not the global red — see the desktop skin's note. */}
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

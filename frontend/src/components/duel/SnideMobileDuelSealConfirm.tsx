/**
 * S.N.I.D.E. MOBILE duel seal-confirm (#722) — the same clipping as the desktop
 * dialog, rebuilt as a bottom sheet: full-bleed on the page background, the
 * halftone panel pinned to the bottom edge with its acid rule along the top, and
 * the actions last so the thumb lands on them. Single column — no grid, per
 * SPEC-faction-ui-profile §1a.
 *
 * Pure frame, same as the desktop skin: `StakesTiles` owns the win/lose
 * arithmetic (Snide's 0.0× lose tile renders a literal 0 by construction),
 * `RaceRoster` owns the cast status, and `useDuelSealCopy` owns both modes'
 * heading, body, note, confirm label and tone. Nothing is recomputed or dropped.
 *
 * `forfeit` mode wears the same redaction bar as the desktop dialog — the one
 * beat with an irreversible consequence gets the black bar on both form factors.
 *
 * Copy is faction-neutral by decision (#718). No new locale keys.
 */
import type { CSSProperties } from 'react'
import { factionCssVar } from '../../utils/factions'
import {
  duelSides,
  RaceRoster,
  SealActions,
  StakesTiles,
  useDuelSealCopy,
  type DuelSlotTheme,
} from './shared'
import { RansomStrip } from './SnideDuelSealConfirm'
import type { DuelSealConfirmProps } from './DuelSealConfirm'

const INK = 'var(--faction-snide-ink)'
const ACID = 'var(--faction-snide-acid)'
const PINK = 'var(--faction-snide-pink)'
const PAPER = 'var(--faction-snide-paper)'
const MUTED = 'var(--faction-snide-card-muted)'
const MARKER = 'var(--faction-snide-font-marker)'

const HALFTONE: CSSProperties = {
  backgroundColor: INK,
  backgroundImage: `radial-gradient(color-mix(in srgb, ${PAPER} 20%, transparent) 1px, transparent 1px)`,
  backgroundSize: '5px 5px',
}

export default function SnideMobileDuelSealConfirm({
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
  // The global `--color-success` measures 2.07:1 on Snide's ink in light theme
  // — the sheet is dark in both themes, so the light-mode token never clears
  // it (#1168). `-card-credit` is theme-invariant here and clears at 10.81.
  const theme: DuelSlotTheme = {
    accent,
    muted: MUTED,
    bodyFont: 'var(--font-body)',
    credit: 'var(--faction-snide-card-credit)',
  }

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
          ...HALFTONE,
          borderTop: `3px solid ${ACID}`,
          borderLeft: `7px solid ${accent}`,
          color: PAPER,
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* sheet header — the desktop masthead, centred for the phone */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            padding: 'var(--space-md) var(--space-lg)',
            background: `color-mix(in srgb, ${accent} 16%, transparent)`,
            borderBottom: `2px dashed ${ACID}`,
          }}
        >
          <RansomStrip />
          <h2
            style={{
              fontFamily: MARKER,
              fontSize: 'var(--text-title)',
              textAlign: 'center',
            }}
          >
            {copy.heading}
          </h2>
        </div>

        <div style={{ padding: 'var(--space-lg)' }}>
          <p
            style={{
              lineHeight: 1.5,
              fontSize: 'var(--text-content)',
              ...(copy.danger
                ? {
                    padding: 'var(--space-md)',
                    background: INK,
                    borderLeft: `4px solid ${PINK}`,
                    boxShadow: `4px 4px 0 color-mix(in srgb, ${PINK} 70%, transparent)`,
                    color: PINK,
                    fontWeight: 700,
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
                color: ACID,
              }}
            >
              {copy.note}
            </p>
          )}

          <div
            style={{
              marginTop: 'var(--space-md)',
              padding: 'var(--space-md)',
              border: `1px solid color-mix(in srgb, ${PAPER} 28%, transparent)`,
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

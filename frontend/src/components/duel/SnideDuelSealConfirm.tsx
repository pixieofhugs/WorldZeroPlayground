/**
 * S.N.I.D.E. duel seal-confirm (#722): photocopier-black halftone, acid border,
 * opponent's fat left edge, pink hard shadow, square corners. Halftone + edge are
 * `ground` (survive full-bleed); frame + shadow are `card`. Pure frame: figures
 * (incl. Snide's literal 0 lose), roster and mode copy come from `./shared`.
 * Forfeit (#751) puts the body in a redaction bar. Copy is neutral (#718).
 * Contrast (#1168): `--color-success` is 2.07:1 on light ground, hence `credit`.
 */
import type { CSSProperties } from 'react'
import { factionCssVar } from '../../utils/factions'
import { factionRoleVars } from '../../utils/factionRoles'
import { factionBodyVars } from '../../utils/factionBodyFace'
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

const INK = 'var(--faction-snide-ink)'
const ACID = 'var(--faction-snide-acid)'
const PINK = 'var(--faction-snide-pink)'
const PAPER = 'var(--faction-snide-paper)'
const MUTED = 'var(--snd-duel-quiet)'
/** Theme-invariant "sealed" ink, 10.81:1 (#694, #1168). */
const CREDIT = 'var(--faction-snide-card-credit)'
const MARKER = 'var(--faction-snide-font-marker)'

/** Dimmer than {@link SEAL_SCRIM}. */
const SCRIM = 'radial-gradient(circle, rgba(0,0,0,0.6), rgba(0,0,0,0.82))'

/** Longhands only: a `border` shorthand in `card` would reset the edge (#1313). */
const ACID_EDGE = `2px solid ${ACID}`

const HALFTONE: CSSProperties = {
  backgroundColor: INK,
  backgroundImage: `radial-gradient(color-mix(in srgb, ${PAPER} 20%, transparent) 1px, transparent 1px)`,
  backgroundSize: '5px 5px',
}

/** Ransom-note masthead ornament; carries no meaning. */
function RansomStrip() {
  return (
    <span style={{ display: 'flex', gap: 'var(--space-xs)' }} aria-hidden>
      {[ACID, PINK, ACID, PINK].map((color, index) => (
        <span
          key={color + String(index)}
          style={{
            width: index % 2 === 0 ? 12 : 7,
            height: index % 2 === 0 ? 7 : 12,
            background: color,
            transform: `rotate(${(index - 1.5) * 7}deg)`,
          }}
        />
      ))}
    </span>
  )
}

export default function SnideDuelSealConfirm({
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
  // No `alarm`: the 24px zero clears 3:1 in `--color-danger` and stays red.
  const theme: DuelSlotTheme = {
    accent,
    muted: MUTED,
    bodyFont: 'var(--faction-snide-font-type)',
    credit: CREDIT,
  }

  return (
    <DuelSealSheet
      label={copy.heading}
      scrim={SCRIM}
      ground={{
        /* `ground` is the surface root, so the role map goes here (#2676). */
        ...factionBodyVars("snide"), ...factionRoleVars('snide', 'snd-duel'),
        ...HALFTONE,
        borderLeft: `7px solid ${accent}`,
        color: PAPER,
        fontFamily: 'var(--faction-snide-font-type)',
      }}
      card={{
        borderTop: ACID_EDGE,
        borderRight: ACID_EDGE,
        borderBottom: ACID_EDGE,
        boxShadow: `6px 6px 0 color-mix(in srgb, ${PINK} 55%, transparent)`,
      }}
    >
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          flexWrap: 'wrap',
          padding: 'var(--space-sm) var(--space-md)',
          background: `color-mix(in srgb, ${accent} 16%, transparent)`,
          borderBottom: `2px dashed ${ACID}`,
        }}
      >
        <RansomStrip />
        <h2 style={{ fontFamily: MARKER, fontSize: 'var(--text-title)' }}>{copy.heading}</h2>
      </div>

      <div style={{ flex: 1, padding: 'var(--space-lg)' }}>
        {/* Forfeit redaction bar; branches on tone, not mode name. */}
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
            me={me}
            opponentName={foe.display_name}
            taskPointValue={taskPointValue}
            status={duel.status}
            theme={theme}
          />
          <RaceRoster me={me} foe={foe} theme={theme} />
        </div>

        {/* Paint is scoped CSS `.snd-seal-actions`, not a skin prop (#3090);
            the forfeit's inline danger fill wins. */}
        <div
          className={copy.danger ? 'snd-seal-actions snd-seal-danger' : 'snd-seal-actions'}
          style={{ marginTop: 'var(--space-lg)' }}
        >
          <SealActions
            onConfirm={onConfirm}
            onCancel={onCancel}
            busy={busy}
            confirmLabel={copy.confirmLabel}
            danger={copy.danger}
            theme={theme}
            confirmClassName="snd-control-off"
          />
        </div>
      </div>
    </DuelSealSheet>
  )
}

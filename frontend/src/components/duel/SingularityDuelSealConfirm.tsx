/**
 * Singularity duel seal-confirm (#723): a green-on-black terminal. `ground` holds
 * glass, scanlines and the opponent's spine; `card` the radius and hairline frame.
 * The block cursor appears ONCE. `$ ` / `// ` are punctuation, not copy. Pure
 * frame: figures, roster and mode copy all come from `./shared` (#751, #718).
 *
 * ALWAYS-DARK in both themes, so the theme-flipping `--color-success/-danger`
 * fail contrast here (#1168); body inks use the invariant `-card-credit` /
 * `-card-notice`. The 24px danger heading (4.03) and zero figure (3.75) clear 3:1.
 */
import { factionRoleVar, factionRoleVars } from '../../utils/factionRoles'
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

/** Roles under this sheet's prefix, declared on `ground` (#2675). */
const GROUND = 'var(--sg-duel-paper)'
const PHOSPHOR = 'var(--sg-duel-accent)'
const PHOSPHOR_DIM = 'var(--faction-singularity-phosphor-dim)'
const BRAND_BLUE = 'var(--sg-duel-quiet)'
const TERMINAL = 'var(--sg-duel-face)'
/** Theme-invariant functional inks (#694, #1168). */
const NOTICE = 'var(--faction-singularity-card-notice)'
const CREDIT = 'var(--faction-singularity-card-credit)'

const HAIRLINE = `color-mix(in srgb, ${PHOSPHOR} 22%, transparent)`
/** Longhands only: a `border` shorthand in `card` would reset the spine (#1313). */
const HAIRLINE_EDGE = `1px solid ${HAIRLINE}`
const SCRIM = 'radial-gradient(circle, rgba(2,8,4,0.72), rgba(2,8,4,0.9))'
const GLASS = `color-mix(in srgb, ${PHOSPHOR} 5%, transparent)`

/** Two faint glows + scanlines; percentages re-scale card to screen (#1313). */
const TERMINAL_GROUND = {
  background: GROUND,
  backgroundImage: [
    `radial-gradient(60% 60% at 0% 0%, color-mix(in srgb, ${PHOSPHOR} 14%, transparent), transparent 70%)`,
    `radial-gradient(55% 55% at 100% 0%, color-mix(in srgb, ${BRAND_BLUE} 12%, transparent), transparent 70%)`,
    'repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(74,222,128,0.02) 2px, rgba(74,222,128,0.02) 4px)',
  ].join(', '),
}

/** `sg-cursor` holds the reduced-motion-guarded blink (inline styles can't). */
function BlockCursor() {
  return (
    <span
      aria-hidden
      className="sg-cursor"
      style={{
        display: 'inline-block',
        width: 8,
        height: 16,
        background: PHOSPHOR,
        marginLeft: 'var(--space-xs)',
        verticalAlign: 'text-bottom',
      }}
    />
  )
}

export default function SingularityDuelSealConfirm({
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

  const accent = factionRoleVar(foe.faction_slug, 'accent')
  // No `alarm`: the 24px zero figure clears 3:1 in `--color-danger` (#1168).
  const theme: DuelSlotTheme = {
    accent,
    muted: PHOSPHOR_DIM,
    bodyFont: TERMINAL,
    credit: CREDIT,
  }

  return (
    <DuelSealSheet
      label={copy.heading}
      scrim={SCRIM}
      ground={{
        ...factionBodyVars("singularity"), ...factionRoleVars('singularity', 'sg-duel'),
        ...TERMINAL_GROUND,
        borderLeft: `3px solid ${accent}`,
        color: PHOSPHOR_DIM,
        fontFamily: TERMINAL,
      }}
      card={{
        borderRadius: 6,
        overflow: 'hidden',
        borderTop: HAIRLINE_EDGE,
        borderRight: HAIRLINE_EDGE,
        borderBottom: HAIRLINE_EDGE,
        boxShadow: `0 0 44px -18px color-mix(in srgb, ${accent} 55%, transparent)`,
      }}
    >
      <div style={{ flex: 1, padding: 'var(--space-lg)' }}>
        <h2
          style={{
            fontSize: 'var(--text-title)',
            color: PHOSPHOR,
            letterSpacing: '0.02em',
            ...(copy.danger ? { color: 'var(--color-danger)' } : {}),
          }}
        >
          <span aria-hidden style={{ color: BRAND_BLUE }}>{'$ '}</span>
          {copy.heading}
          <BlockCursor />
        </h2>

        <div
          aria-hidden
          style={{ height: 1, background: HAIRLINE, margin: 'var(--space-md) 0' }}
        />

        {/* NOTICE: red fails 4.5:1 for 18px body here (#1168); red is the rule. */}
        <p
          className="content-text"
          style={{
            lineHeight: 1.55,
            color: copy.danger ? NOTICE : PHOSPHOR_DIM,
            ...(copy.danger
              ? {
                  paddingLeft: 'var(--space-md)',
                  borderLeft: '3px solid var(--color-danger)',
                }
              : {}),
          }}
        >
          {copy.body}
        </p>

        {/* Null in forfeit mode, by design. */}
        {copy.note && (
          <p
            className="content-text"
            style={{ marginTop: 'var(--space-sm)', color: CREDIT }}
          >
            <span aria-hidden>{'// '}</span>
            {copy.note}
          </p>
        )}

        <div
          style={{
            marginTop: 'var(--space-md)',
            background: GLASS,
            border: `1px solid ${HAIRLINE}`,
            borderRadius: 3,
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

        <div style={{ marginTop: 'var(--space-lg)' }}>
          <SealActions
            onConfirm={onConfirm}
            onCancel={onCancel}
            busy={busy}
            confirmLabel={copy.confirmLabel}
            danger={copy.danger}
            theme={theme}
            // `.control-off` would be a pale slab on always-dark (#3011).
            confirmClassName="sg-control-off"
          />
        </div>
        {/* ponytail: shared button pair, no terminal-button skin slot; add
            one on SealActions if a bracketed `[ SEAL ]` is wanted (#646). */}
      </div>
    </DuelSealSheet>
  )
}

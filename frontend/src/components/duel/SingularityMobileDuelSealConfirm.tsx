/**
 * Singularity MOBILE duel seal-confirm (#723).
 *
 * The desktop dialog thumbed down. Where Coven's phone skin is a bottom sheet
 * pinned to a rounded edge over the page, Singularity takes the whole screen:
 * the phone IS the terminal. That also answers the light-mode question for the
 * mobile path — the ground is the faction's own always-dark token rather than
 * `--color-bg-page`, so a Singularity member in light mode gets a terminal, not
 * a terminal panel floating on white.
 *
 * Single column throughout (SPEC-faction-ui-profile §1a — no fixed-px grid on
 * the mobile path), actions last so the thumb lands on them, and the one
 * blinking cursor kept on the prompt line.
 *
 * Pure frame, same contract as the desktop skin: `StakesTiles` / `RaceRoster`
 * own every figure and `useDuelSealCopy` owns the whole submit/forfeit branch
 * (#751). Copy is `praxis.json` only — faction-neutral by decision (#718).
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

const GROUND = 'var(--faction-singularity-card-bg)'
const PHOSPHOR = 'var(--faction-singularity-card-accent)'
const PHOSPHOR_DIM = 'var(--faction-singularity-phosphor-dim)'
const BRAND_BLUE = 'var(--faction-singularity-card-muted)'
const TERMINAL = 'var(--faction-singularity-card-font)'

const HAIRLINE = `color-mix(in srgb, ${PHOSPHOR} 22%, transparent)`
const GLASS = `color-mix(in srgb, ${PHOSPHOR} 5%, transparent)`

/** Same ground stack as the desktop dialog; the glows anchor to the screen here. */
const TERMINAL_GROUND = {
  background: GROUND,
  backgroundImage: [
    `radial-gradient(70% 40% at 0% 0%, color-mix(in srgb, ${PHOSPHOR} 15%, transparent), transparent 70%)`,
    `radial-gradient(65% 35% at 100% 0%, color-mix(in srgb, ${BRAND_BLUE} 13%, transparent), transparent 70%)`,
    'repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(74,222,128,0.02) 2px, rgba(74,222,128,0.02) 4px)',
  ].join(', '),
}

/** The one blinking block cursor; `sg-cursor` carries the reduced-motion guard. */
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

/** Blink + its reduced-motion opt-out. Duplicate declarations are idempotent. */
const CURSOR_CSS =
  '@keyframes blink { 50% { opacity: 0; } }' +
  '.sg-cursor { animation: blink 1.05s step-end infinite; }' +
  '@media (prefers-reduced-motion: reduce) { .sg-cursor { animation: none; } }'

export default function SingularityMobileDuelSealConfirm({
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
  const theme: DuelSlotTheme = { accent, muted: PHOSPHOR_DIM, bodyFont: TERMINAL }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.heading}
      className="fixed inset-0 z-50 flex flex-col justify-end overflow-y-auto"
      style={{
        ...TERMINAL_GROUND,
        color: PHOSPHOR_DIM,
        fontFamily: TERMINAL,
        // The opponent still owns the edge that faces them, full-height here.
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div style={{ padding: 'var(--space-lg)' }}>
        <h2
          style={{
            fontSize: 'var(--text-title)',
            color: copy.danger ? 'var(--color-danger)' : PHOSPHOR,
            letterSpacing: '0.02em',
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

        <p
          className="content-text"
          style={{
            lineHeight: 1.55,
            color: copy.danger ? 'var(--color-danger)' : PHOSPHOR_DIM,
          }}
        >
          {copy.body}
        </p>

        {copy.note && (
          <p
            className="content-text"
            style={{ marginTop: 'var(--space-sm)', color: 'var(--color-success)' }}
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
            terminal buttons would need a skin slot on the shared component,
            which is foundation work, not a skin change. */}
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

      <style>{CURSOR_CSS}</style>
    </div>
  )
}

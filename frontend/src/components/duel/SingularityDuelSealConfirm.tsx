/**
 * Singularity DESKTOP duel seal-confirm (#723).
 *
 * The Default dialog's content re-hung inside the faction's cold green-on-black
 * terminal: near-black ground lifted by two large soft radial glows (phosphor
 * green from the top-left, brand blue from the top-right), a scanline wash,
 * hairline low-opacity green borders at a small radius, and the monospace
 * terminal face throughout. Where Everymen stamps a hard 2px rectangle,
 * Singularity reads as translucent green-tinted glass.
 *
 * The signature ornament — the blinking block cursor — is used ONCE, on the
 * prompt line that carries the heading. Scattering it turns a terminal into a
 * christmas tree. The `$ ` prompt and `// ` comment markers are punctuation
 * around catalog strings, exactly as `SingularityTaskCard` renders `"> "` before
 * a task title: voice, not copy.
 *
 * Pure frame. `StakesTiles` computes every figure from `useGameConfig()` and the
 * viewer's own faction (Snide's 0.0× lose falls out by construction),
 * `RaceRoster` reads `is_submitted`, and `useDuelSealCopy` owns the entire
 * submit/forfeit mode branch (#751) — heading, body, note, confirm label and the
 * destructive tone. Nothing here re-derives or drops any of it.
 *
 * Copy is faction-neutral by decision (#718) and comes only from `praxis.json`.
 * The design canvas's terminal voice is tone reference, not strings, and its
 * annotated "1.5× / 0.5×" is deliberately absent — those are per-faction values
 * the slot owns.
 *
 * ALWAYS-DARK. The `--faction-singularity-*` tokens hold identical terminal
 * values in both themes (the precedent every Singularity surface follows since
 * `SingularityTaskCard`), so this dialog is a terminal in light mode too. The
 * one thing light mode changes is what surrounds it, and the overlay below is
 * an explicit near-black scrim rather than the theme's, so the panel never
 * floats on a white page.
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

/** Hairline rules and panel edges: the accent at low opacity, never a solid. */
const HAIRLINE = `color-mix(in srgb, ${PHOSPHOR} 22%, transparent)`
/** Translucent green glass — the inner panel that holds the slots. */
const GLASS = `color-mix(in srgb, ${PHOSPHOR} 5%, transparent)`

/**
 * The two soft radial glows plus the scanline wash, as one background stack.
 * Both glows sit at very low opacity — they lift the black, they do not tint it.
 */
const TERMINAL_GROUND = {
  background: GROUND,
  backgroundImage: [
    `radial-gradient(60% 60% at 0% 0%, color-mix(in srgb, ${PHOSPHOR} 14%, transparent), transparent 70%)`,
    `radial-gradient(55% 55% at 100% 0%, color-mix(in srgb, ${BRAND_BLUE} 12%, transparent), transparent 70%)`,
    'repeating-linear-gradient(to bottom, transparent, transparent 2px, rgba(74,222,128,0.02) 2px, rgba(74,222,128,0.02) 4px)',
  ].join(', '),
}

/**
 * The blinking block cursor — solid phosphor, `step-end`, used once per surface.
 * `sg-cursor` exists so the reduced-motion guard in the stylesheet below can
 * reach it; an inline style cannot carry a media query.
 */
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

  // Opponent tokens, same rule as the Default dialog and the rail: on a terminal
  // the foreign duelist's colour is the one variable that isn't phosphor, which
  // is precisely why it gets the left edge and the cast glow.
  const accent = factionCssVar(foe.faction_slug, 'card-accent')
  const theme: DuelSlotTheme = { accent, muted: PHOSPHOR_DIM, bodyFont: TERMINAL }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.heading}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        padding: 'var(--space-lg)',
        // Explicit near-black, not the theme's scrim: the panel is always-dark,
        // so a light-mode page must not show through around it.
        background: 'radial-gradient(circle, rgba(2,8,4,0.72), rgba(2,8,4,0.9))',
      }}
    >
      <div
        className="w-full max-w-[460px]"
        style={{
          ...TERMINAL_GROUND,
          borderRadius: 6,
          overflow: 'hidden',
          border: `1px solid ${HAIRLINE}`,
          borderLeft: `3px solid ${accent}`,
          boxShadow: `0 0 44px -18px color-mix(in srgb, ${accent} 55%, transparent)`,
          color: PHOSPHOR_DIM,
          fontFamily: TERMINAL,
        }}
      >
        <div style={{ padding: 'var(--space-lg)' }}>
          {/* Prompt line — `$` sigil, the heading, and the one blinking cursor. */}
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

          <p
            className="content-text"
            style={{
              lineHeight: 1.55,
              color: copy.danger ? 'var(--color-danger)' : PHOSPHOR_DIM,
            }}
          >
            {copy.body}
          </p>

          {/* The free-reopen half of the truth — the same condition the Default
              skin uses, because it is a fact about the duel, not a flourish.
              `copy.note` is null in forfeit mode; there is nothing reassuring
              left to say, and that silence is the design. */}
          {copy.note && (
            <p
              className="content-text"
              style={{ marginTop: 'var(--space-sm)', color: 'var(--color-success)' }}
            >
              <span aria-hidden>{'// '}</span>
              {copy.note}
            </p>
          )}

          {/* Green glass panel: the stakes pair and the cast roster. */}
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
          {/* ponytail: SealActions keeps the shared btn-outline / btn-primary
              pair rather than growing a terminal-button skin slot, on the same
              reasoning CovenDuelSealConfirm recorded — the global
              [Cancel] … [Submit] order (#646) is worth more than a bracketed
              `[ SEAL ]`, and a skin prop on the shared component is foundation
              work, not a skin change. */}
        </div>
      </div>

      <style>{CURSOR_CSS}</style>
    </div>
  )
}

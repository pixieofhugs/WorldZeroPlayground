/**
 * Singularity duel seal-confirm (#723).
 *
 * ONE responsive component since #1313 retired the `mobileDuelSeal` twin.
 * `DuelSealSheet` centres this terminal in a card on a laptop and lets it BE the
 * screen on a phone — which is exactly what the twin did, and its whole reason
 * to exist. The glass, the scanlines and the opponent's spine are `ground`; the
 * small radius and the hairline frame are `card`.
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
 *
 * WHICH IS EXACTLY WHY THE GLOBAL FUNCTIONAL INKS FAILED HERE (#1168). They
 * flip on the THEME; this chassis does not flip at all, so the LIGHT halves of
 * `--color-success` (#14532d) and `--color-danger` (#dc2626) — chosen against
 * the app's near-white page — land on near-black. Measured with
 * `utils/contrast.ts`: the reopen note 2.14:1, the win figure and the roster's
 * "sealed" mark 1.99:1 on the glass, the forfeit body 4.03:1. All three take
 * `--faction-singularity-card-credit` / `-card-notice`, which are invariant like
 * the chassis (11.18 / 10.40 / 11.67). Two pairings clear as shipped and are
 * left alone: the 24px heading in `--color-danger` at 4.03 (a 3:1 floor) and the
 * Snide zero figure at 3.75 on the glass, also 24px bold.
 */
import { factionCssVar } from '../../utils/factions'
import { factionRoleVars } from '../../utils/factionRoles'
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

/**
 * Four ROLES under this sheet's own prefix (#2675). The element they are
 * declared on is the one `DuelSealSheet` paints from the `ground` prop — the
 * container every child here mounts inside, on both the phone sheet and the
 * desktop card — so a read below resolves against it, and against today's token
 * anywhere else. `-phosphor-dim`, `-card-notice` and `-card-credit` are not
 * roles: the two functional inks are a component's STATE rather than a ground,
 * which is why the vocabulary deliberately stops at nine.
 */
const GROUND = 'var(--duel-seal-paper, var(--faction-singularity-card-bg))'
const PHOSPHOR = 'var(--duel-seal-accent, var(--faction-singularity-card-accent))'
const PHOSPHOR_DIM = 'var(--faction-singularity-phosphor-dim)'
const BRAND_BLUE = 'var(--duel-seal-quiet, var(--faction-singularity-card-muted))'
const TERMINAL = 'var(--duel-seal-face, var(--faction-singularity-card-font))'
/**
 * The two sheet-measured functional inks (#694). This chassis is near-black in
 * BOTH themes while `--color-success` / `--color-danger` flip with the viewer,
 * so the light-theme halves of those tokens land on a ground they were never
 * chosen for: the green reads 2.14:1 here and 1.99:1 on the glass (#1168).
 * These two are amber and phosphor-green, invariant like the chassis.
 */
const NOTICE = 'var(--faction-singularity-card-notice)'
const CREDIT = 'var(--faction-singularity-card-credit)'

/** Hairline rules and panel edges: the accent at low opacity, never a solid. */
const HAIRLINE = `color-mix(in srgb, ${PHOSPHOR} 22%, transparent)`
/**
 * The panel edge, as three longhands: the opponent's spine is `ground` and a
 * `border` shorthand in `card` would reset it (#1313).
 */
const HAIRLINE_EDGE = `1px solid ${HAIRLINE}`
/** The always-dark scrim — see the ALWAYS-DARK note above. */
const SCRIM = 'radial-gradient(circle, rgba(2,8,4,0.72), rgba(2,8,4,0.9))'
/** Translucent green glass — the inner panel that holds the slots. */
const GLASS = `color-mix(in srgb, ${PHOSPHOR} 5%, transparent)`

/**
 * The two soft radial glows plus the scanline wash, as one background stack.
 * Both glows sit at very low opacity — they lift the black, they do not tint it.
 *
 * ONE PAIR OF PERCENTAGES, NOT TWO (#1313). The retired phone twin spread the
 * same two glows wider and flatter (`70% 40%` / `65% 35%`) because it was
 * anchoring them to a whole screen rather than to a 460px card. They are
 * percentages of the painted box either way, so the card values re-scale to the
 * screen on their own; the twin's numbers were a hand-tuned duplicate of a
 * calculation CSS already does, and collapsing them loses nothing a viewer can
 * name.
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
 * The blinking block cursor — solid phosphor, used once per surface.
 * `sg-cursor` carries the reduced-motion-guarded blink from index.css; an
 * inline style cannot hold a media query, so the animation lives on the class.
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
  // `credit` is the #1168 seam: the shared slots' default `--color-success` is
  // 1.99:1 on the green glass in light. `alarm` is deliberately NOT passed —
  // `--color-danger` measures 3.75:1 there and the zero figure is 24px bold, so
  // it clears its 3:1 floor and keeps the red the design wants.
  const theme: DuelSlotTheme = {
    accent,
    muted: PHOSPHOR_DIM,
    bodyFont: TERMINAL,
    credit: CREDIT,
  }

  return (
    <DuelSealSheet
      label={copy.heading}
      // Explicit near-black, not the theme's scrim: the panel is always-dark,
      // so a light-mode page must not show through around it.
      scrim={SCRIM}
      ground={{
        ...factionRoleVars('singularity', 'duel-seal'),
        ...TERMINAL_GROUND,
        // The opponent still owns the edge that faces them — a spine on the
        // card, full-height when the terminal IS the screen.
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

        {/* NOTICE, not the global red: `--color-danger` reads 4.03:1 on this
            always-dark chassis in light and this is 18px body copy (#1168).
            The red survives as the rule beside it, carrying no text — and it
            stays on the 24px heading above, where a 3:1 floor applies. */}
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

        {/* The free-reopen half of the truth — the same condition the Default
            skin uses, because it is a fact about the duel, not a flourish.
            `copy.note` is null in forfeit mode; there is nothing reassuring
            left to say, and that silence is the design. */}
        {copy.note && (
          <p
            className="content-text"
            style={{ marginTop: 'var(--space-sm)', color: CREDIT }}
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
    </DuelSealSheet>
  )
}

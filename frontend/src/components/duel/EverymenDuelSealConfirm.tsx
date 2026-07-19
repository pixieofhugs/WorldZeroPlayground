/**
 * Everymen DESKTOP duel seal-confirm (#721) — the design's `EvDuelDialog.dc.html`.
 *
 * Everymen files everything as paperwork, so the one irreversible beat in the
 * duel becomes a stamped form served over the composer: red masthead with a
 * faint guilloche and a rotated dashed division seal, a red→gold stripe rule,
 * the opponent on a bordered card, the stakes in a hard-bordered panel, and a
 * tan footer band. Cream paper, ink rules, hard zero-blur shadows — the idiom
 * `EverymenEditPraxis` and `EverymenPraxisDetail` already wear, no new tokens.
 *
 * BOTH MODES, ONE FILE (#751). `mode` is `submit` or `forfeit` and
 * `useDuelSealCopy` owns every string that differs — heading, body, the
 * free-reopen note, the confirm label and the destructive tone. This skin
 * re-derives none of it; in particular the reopen note's
 * `active && !foe.is_submitted` condition is the shared one, because it is a
 * fact about the duel rather than an Everymen flourish. What the mode DOES
 * change here is chrome: the forfeit dialog drops its title a tier and repaints
 * the stakes panel from tan paper to ink with a red-tinted shadow, so the
 * costly dialog does not look like the routine one.
 *
 * Pure frame otherwise. `StakesTiles` computes the win/lose figures from the
 * viewer's own faction config (Snide's 0.0× lose falls out by construction),
 * `RaceRoster` reads `is_submitted`, and `SealActions` owns the global
 * [Cancel] … [Submit] order (#646). None is dropped in either mode.
 *
 * The mock's "FORM D-02" eyebrow and "WHAT'S AT STAKE" rubric are deliberately
 * NOT transcribed: they are invented copy with no `praxis.json` key, and copy is
 * faction-neutral by decision (#718). Their ornament — the gold letterspaced
 * rule and the dashed divider — is kept; their words are not.
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

const PAPER = 'var(--everymen-paper)'
const PAPER_DEEP = 'var(--everymen-paper-deep)'
const CREAM = 'var(--everymen-cream)'
const INK = 'var(--everymen-ink)'
const PAPER_TEXT = 'var(--everymen-paper-text)'
const MUTED = 'var(--everymen-muted)'
const RED = 'var(--everymen-red)'
const GOLD = 'var(--everymen-gold)'
const POSTER = 'var(--font-accent)' // Bebas Neue
const BODY = 'var(--font-body)'

/** The masthead's faint radial guilloche, as on `EverymenBackdrop`. */
const GUILLOCHE =
  `repeating-conic-gradient(from 0deg at 50% -8%, color-mix(in srgb, ${CREAM} 10%, transparent) 0 5deg, transparent 5deg 11deg)`

export default function EverymenDuelSealConfirm({
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

  // Opponent tokens, the same rule as the rail and the Default dialog: the
  // foreign duelist looks foreign even inside Everymen's own paperwork (#310).
  const accent = factionCssVar(foe.faction_slug, 'card-accent')

  // The stakes panel flips to ink in forfeit mode, so the slots inside it need
  // the light muted tone to stay legible. This is a MODE branch, not a theme
  // branch — dark mode is handled entirely by the token cascade.
  const onInk = copy.danger
  const theme: DuelSlotTheme = { accent, muted: onInk ? CREAM : MUTED, bodyFont: BODY }

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
          background: PAPER,
          color: PAPER_TEXT,
          fontFamily: BODY,
          border: `3px solid ${INK}`,
          // Exaggerated hard offset, zero blur — the dialog is a document
          // physically laid on top of the composer.
          boxShadow: `14px 14px 0 color-mix(in srgb, ${INK} 30%, transparent)`,
        }}
      >
        {/* ── Stamped red masthead ── */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: 'var(--space-lg) var(--space-xl)',
            background: RED,
            backgroundImage: GUILLOCHE,
            color: CREAM,
          }}
        >
          {/* Duel-division seal: a rotated dashed medallion, pure ornament. */}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: -14,
              right: -14,
              width: 92,
              height: 92,
              borderRadius: '50%',
              border: `2px dashed ${CREAM}`,
              opacity: 0.45,
              transform: 'rotate(-12deg)',
            }}
          />
          {/* Gold rule standing in for the mock's form-reference eyebrow, which
              was invented copy with no catalog key. */}
          <span
            aria-hidden
            style={{ display: 'block', width: 56, height: 3, background: GOLD, marginBottom: 'var(--space-sm)' }}
          />
          <h2
            style={{
              position: 'relative',
              margin: 0,
              fontFamily: POSTER,
              fontWeight: 400,
              // The forfeit dialog speaks quieter than the routine one — a tier
              // down, not a raw number. Both sit in the Content ramp (§4a).
              fontSize: onInk ? 'var(--text-heading)' : 'var(--text-display)',
              lineHeight: 1,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              textShadow: `3px 3px 0 color-mix(in srgb, ${INK} 55%, transparent)`,
            }}
          >
            {copy.heading}
          </h2>
        </div>

        {/* red→gold stripe rule */}
        <div
          aria-hidden
          style={{ height: 7, background: `linear-gradient(90deg, ${RED} 0 50%, ${GOLD} 50% 100%)` }}
        />

        <div style={{ padding: 'var(--space-xl)' }}>
          {/* ── Opponent card: ink monogram disc on tan stock ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
              padding: 'var(--space-sm) var(--space-md)',
              background: PAPER_DEEP,
              border: `2px solid ${INK}`,
              borderLeft: `5px solid ${accent}`,
            }}
          >
            <span
              aria-hidden
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: INK,
                color: CREAM,
                fontFamily: POSTER,
                fontSize: 'var(--text-title)',
                lineHeight: 1,
                boxShadow: `inset 0 0 0 2px ${PAPER_DEEP}, inset 0 0 0 3px ${accent}`,
              }}
            >
              {foe.display_name.slice(0, 1)}
            </span>
            <span className="content-text" style={{ fontFamily: POSTER, letterSpacing: '0.05em', minWidth: 0 }}>
              {foe.display_name}
            </span>
          </div>

          {/* ── The body line. Forfeit mode is the destructive one and says so. ── */}
          <p
            className="content-text"
            style={{
              marginTop: 'var(--space-lg)',
              lineHeight: 1.6,
              ...(copy.danger ? { color: RED, fontWeight: 700 } : {}),
            }}
          >
            {copy.body}
          </p>

          {/* The free-reopen half of the truth — the shared condition, not an
              Everymen one. A forfeit has no such note and `copy.note` is null. */}
          {copy.note && (
            <p
              className="content-text"
              style={{ marginTop: 'var(--space-sm)', color: 'var(--color-success)' }}
            >
              {copy.note}
            </p>
          )}

          {/* dashed divider — the mock's rubric rule, minus its invented words */}
          <div
            aria-hidden
            style={{ marginTop: 'var(--space-lg)', borderTop: `2px dashed color-mix(in srgb, ${INK} 45%, transparent)` }}
          />

          {/* ── Stakes + roster panel. Tan stock normally; ink with a red-tinted
              shadow in forfeit mode, where the figures are the cost. ── */}
          <div
            style={{
              marginTop: 'var(--space-lg)',
              padding: 'var(--space-md)',
              background: onInk ? INK : PAPER_DEEP,
              color: onInk ? CREAM : PAPER_TEXT,
              border: `2px solid ${INK}`,
              boxShadow: onInk
                ? `4px 4px 0 color-mix(in srgb, ${RED} 45%, transparent)`
                : `3px 3px 0 color-mix(in srgb, ${INK} 18%, transparent)`,
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
        </div>

        {/* ── Footer band ── */}
        <div
          style={{
            padding: 'var(--space-md) var(--space-xl)',
            background: PAPER_DEEP,
            borderTop: `2px solid ${INK}`,
          }}
        >
          {/* ponytail: SealActions keeps its shared btn-outline / btn-primary
              pair rather than growing an Everymen stamped-button slot. The
              global [Cancel] … [Submit] order (#646) and the shared `danger`
              tone are worth more than a poster button, and adding a skin prop
              to the shared component would be foundation work. */}
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
  )
}

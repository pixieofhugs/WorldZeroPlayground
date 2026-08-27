/**
 * Everymen duel seal-confirm (#721) — the design's `EvDuelDialog.dc.html`.
 *
 * ONE responsive component. The form is the same document at both widths:
 * `DuelSealSheet` serves it as a bordered card over a scrim on a laptop and
 * full-bleed on a phone, and the masthead / scrolling middle / pinned action
 * band are plain flex regions — they cost nothing on an auto-height card and
 * are what puts the actions under a thumb on a phone.
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
 *
 * CONTRAST (#1168), measured with `utils/contrast.ts` in both themes. Two
 * failures, and the second is the reason the mode branch above is not merely
 * cosmetic:
 *
 *  - The forfeit body was `--everymen-red` on the paper: **4.49:1 light, 4.16:1
 *    dark**, the only body pairing in the family that failed in BOTH themes.
 *    WORLD_ZERO_STYLE §3 records the light figure and adds "nothing on this card
 *    sets PROSE in it" — this dialog did. It takes `NOTICE` now (5.45 / 10.25)
 *    and the red keeps the rule beside it, which is a fill role, not an ink one.
 *  - The stakes panel INVERTS in forfeit mode, and the shared slots' inks did
 *    not invert with it: `--color-success` is 5.86:1 on the tan stock and
 *    **1.88:1** on the ink. Hence `credit: onInk ? GOLD : undefined`.
 *
 * Left alone as measured: the reopen note in `--color-success` on the paper
 * (7.01 / 9.82), the zero figure in `--color-danger` on both panel stocks (3.10
 * tan / 3.55 ink, 24px bold at a 3:1 floor), and the roster's "walking" in CREAM
 * on the ink (14.55).
 *
 * The pairing #1168 left below threshold — `--everymen-muted` at 4.25:1 on the
 * tan `--everymen-paper-deep`, a faction ink on a faction SUB-SHEET rather than a
 * global ink on faction paper — is fixed in #1173, and the fix is a token rather
 * than a call-site swap: the slots take `--everymen-quiet` (4.77 / 7.39), the
 * muted ink walked down for the deeper stock. `theme.muted` reaches only
 * `StakesTiles` and `RaceRoster`, both of which are inside that panel, so no
 * other line on this dialog moves.
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
import DuelSealSheet from './DuelSealSheet'

const PAPER = 'var(--everymen-paper)'
const PAPER_DEEP = 'var(--everymen-paper-deep)'
const CREAM = 'var(--everymen-cream)'
const INK = 'var(--everymen-ink)'
const PAPER_TEXT = 'var(--everymen-paper-text)'
/**
 * The DEEP STOCK's muted ink (#1173). `--everymen-muted` is measured on
 * `--everymen-paper` (5.09:1) and this dialog sets muted copy one sheet down, on
 * the tan `PAPER_DEEP` panel, where the same ink is **4.25:1** — under the 4.5:1
 * an 18px line owes. `--everymen-quiet` is that brown walked down for the deeper
 * stock: 4.77 / 7.39. The muted ink is untouched and keeps the paper.
 */
const QUIET = 'var(--everymen-quiet)'
const RED = 'var(--everymen-red)'
const GOLD = 'var(--everymen-gold)'
/**
 * The sheet-measured warning ink (#694). `--everymen-red` is 4.49:1 on the
 * paper and 4.16:1 on the dark-theme paper — WORLD_ZERO_STYLE §3 already records
 * the light figure and says "nothing on this card sets PROSE in it", and this
 * dialog was setting its 18px forfeit body in it (#1168). The red keeps its rule
 * and fill roles; this ink carries the words, at 5.45 / 10.25.
 */
const NOTICE = 'var(--faction-everymen-card-notice)'
const POSTER = 'var(--font-accent)' // Bebas Neue
const BODY = 'var(--font-body)'

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
  // The panel's polarity decides the slots' inks, not the theme's. On the tan
  // stock the shared defaults clear (`--color-success` 5.86:1); the moment the
  // panel flips to INK the same green is 1.88:1, so the win figure and the
  // roster's "sealed" mark take the gold this faction already values things in
  // (7.03 / 10.81). Passing `undefined` off the ink branch is why `DuelSlotTheme`
  // resolves field-by-field rather than by spread (#1168).
  const theme: DuelSlotTheme = {
    accent,
    muted: onInk ? CREAM : QUIET,
    bodyFont: BODY,
    credit: onInk ? GOLD : undefined,
  }

  return (
    <DuelSealSheet
      label={copy.heading}
      ground={{ background: PAPER, color: PAPER_TEXT, fontFamily: BODY }}
      card={{
        border: `3px solid ${INK}`,
        // Exaggerated hard offset, zero blur — the dialog is a document
        // physically laid on top of the composer. On a phone there is nothing
        // to lie on top of, so the chassis drops both this and the border.
        boxShadow: `14px 14px 0 color-mix(in srgb, ${INK} 30%, transparent)`,
      }}
    >
      {/* ── Stamped red masthead ── */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          padding: 'var(--space-lg) var(--space-xl)',
          background: RED,
          color: CREAM,
        }}
      >
        {/* The faction's ONE ornament (#2195). The stamped bar carried its own
            guilloche — a conic from 50% -8% at its own pitch, one of nine
            Everymen bursts — and mounts the shared drawing now. `knockout`
            because the plate is red, not paper. */}
        <div aria-hidden className="em-burst em-burst-knockout" />
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
        style={{ flexShrink: 0, height: 7, background: `linear-gradient(90deg, ${RED} 0 50%, ${GOLD} 50% 100%)` }}
      />

      {/* The document's middle. `flex: 1` + its own scroll is what pins the
          masthead and the action band to the edges when the sheet IS the
          screen; on a laptop the card is auto-height and neither fires. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--space-xl)' }}>
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

        {/* ── The body line. Forfeit mode is the destructive one and says so —
            in NOTICE, with the red as the rule beside it. Red-as-prose was
            4.49 / 4.16 here, which is the pairing §3 already warned about. ── */}
        <p
          className="content-text"
          style={{
            marginTop: 'var(--space-lg)',
            lineHeight: 1.6,
            ...(copy.danger
              ? {
                  color: NOTICE,
                  fontWeight: 700,
                  paddingLeft: 'var(--space-md)',
                  borderLeft: `3px solid ${RED}`,
                }
              : {}),
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
          flexShrink: 0,
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
    </DuelSealSheet>
  )
}

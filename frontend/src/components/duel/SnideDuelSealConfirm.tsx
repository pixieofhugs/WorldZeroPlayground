/**
 * S.N.I.D.E. duel seal-confirm (#722) — the rail's zine clipping scaled up to a
 * dialog: photocopier-black ground under the same 5px halftone screen, a 2px
 * acid-green border, the opponent's colour on a fat left edge, and a hard offset
 * shadow tinted hot pink. Square corners throughout.
 *
 * ONE responsive component since #1313 retired the `mobileDuelSeal` twin.
 * `DuelSealSheet` centres this clipping over a scrim on a laptop and lets it
 * take the whole screen on a phone. The halftone and the opponent's fat edge are
 * `ground` and survive full-bleed; the acid frame and the pink offset shadow are
 * `card`, because a hard 6px shadow and a border at the viewport edge are a card
 * pretending it still floats.
 *
 * Pure frame. `StakesTiles` computes the win/lose figures from `useGameConfig()`
 * and the VIEWER's own faction — which is why a Snide duelist correctly reads a
 * literal **0** in the lose tile (2.0× / 0.0×, `eras/era_1.py`). That zero is the
 * faction's whole personality, not a missing value, and nothing here special-
 * cases it. `RaceRoster` reads `is_submitted`; `useDuelSealCopy` owns the
 * heading, body, note, confirm label and danger tone for both modes. This file
 * re-derives none of it.
 *
 * TWO MODES (#751). `submit` and `forfeit` render the same slots in the same
 * order; only the chrome around the body line changes. In `forfeit` the body sits
 * in a REDACTION BAR — a blacked-out panel with a pink hard shadow, the design's
 * "black bar dropped on the page" — because a forfeit is the one duel beat with
 * a consequence you cannot undo. The copy for it is the shipped `duelForfeit.*`
 * catalog, via the shared hook, unchanged.
 *
 * Copy is faction-neutral by decision (#718): Snide's voice is visual only. No
 * new locale keys, and no string in this file.
 *
 * CONTRAST (#1168), measured with `utils/contrast.ts` in both themes. This skin
 * had already routed its own body ink — the redaction bar sets PINK on INK at
 * 5.38:1 and the reopen note ACID at 15.55:1, so neither moves. What it could
 * NOT route were the shared slots' hardcoded figures: `--color-success` reads
 * **2.07:1** on the halftone ground in the light theme, which sank both the win
 * tile and the roster's 18px "sealed" mark. That is what the `credit` seam on
 * `DuelSlotTheme` exists for. Left alone as measured: the zero figure in
 * `--color-danger` (3.90 / 6.81, 24px bold, a 3:1 floor) and the roster's
 * "walking" muted at 12.89 / 11.79.
 */
import type { CSSProperties } from 'react'
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

const INK = 'var(--faction-snide-ink)'
const ACID = 'var(--faction-snide-acid)'
const PINK = 'var(--faction-snide-pink)'
const PAPER = 'var(--faction-snide-paper)'
const MUTED = 'var(--snd-duel-quiet, var(--faction-snide-card-muted))'
/**
 * The sheet-measured "sealed / positive" ink (#694). `--color-success` is the
 * shared slots' default and reads **2.07:1** on this photocopier ink in the
 * light theme — the ground is dark in BOTH themes while the token flips with
 * the viewer, so light mode hands it a near-black page it was never chosen for
 * (#1168). This one is the phosphor green in both, at 10.81:1.
 */
const CREDIT = 'var(--faction-snide-card-credit)'
const MARKER = 'var(--faction-snide-font-marker)'

/**
 * The clipping's own dimmer scrim — Snide dims harder than the shared
 * {@link SEAL_SCRIM}, so the photocopier black never floats on a lit page.
 */
const SCRIM = 'radial-gradient(circle, rgba(0,0,0,0.6), rgba(0,0,0,0.82))'

/**
 * The acid frame, as three longhands: the opponent's fat left edge is `ground`
 * and a `border` shorthand in `card` would reset it (#1313).
 */
const ACID_EDGE = `2px solid ${ACID}`

/** The xerox screen: a 1px dot on a 5px grid, barely there. */
const HALFTONE: CSSProperties = {
  backgroundColor: INK,
  backgroundImage: `radial-gradient(color-mix(in srgb, ${PAPER} 20%, transparent) 1px, transparent 1px)`,
  backgroundSize: '5px 5px',
}

/**
 * The ransom-note masthead strip: cut squares of acid and pink at broken angles.
 * Ornament — not an icon, not text, and carrying none of the dialog's meaning.
 *
 * Local since #1313: it was exported for the retired phone twin, and nothing
 * outside this file cuts one.
 */
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

  // Opponent tokens, same rule as the Default dialog and the rail: the foreign
  // duelist looks foreign even on Snide's own paper.
  const accent = factionCssVar(foe.faction_slug, 'card-accent')
  // `credit` is the #1168 seam. `alarm` is deliberately NOT passed: the zero
  // figure in `--color-danger` measures 3.90:1 on this ink and is 24px bold, so
  // it clears its 3:1 floor — and a Snide duelist's literal 0 should stay red.
  const theme: DuelSlotTheme = {
    accent,
    muted: MUTED,
    bodyFont: 'var(--font-body)',
    credit: CREDIT,
  }

  return (
    <DuelSealSheet
      label={copy.heading}
      scrim={SCRIM}
      ground={{
        /* `ground` IS this surface's root style — `DuelSealSheet` spreads it on
           the phone sheet and on the desktop card, both of which contain every
           child — so the role map is declared here rather than on a wrapper
           this component does not own (#2676). */
        ...factionRoleVars('snide', 'snd-duel'),
        ...HALFTONE,
        borderLeft: `7px solid ${accent}`,
        color: PAPER,
        fontFamily: 'var(--font-body)',
      }}
      card={{
        borderTop: ACID_EDGE,
        borderRight: ACID_EDGE,
        borderBottom: ACID_EDGE,
        boxShadow: `6px 6px 0 color-mix(in srgb, ${PINK} 55%, transparent)`,
      }}
    >
      {/* masthead: accent wash under a dashed acid rule */}
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
        {/* forfeit: the body goes behind a redaction bar — blacked out, pink
            hard shadow, acid edge. `copy.danger` is the mode's own signal, so
            this branches on the tone rather than on the mode name. */}
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

        {/* The free-reopen half of the truth — same condition as every other
            skin, because it is the same fact. A forfeit has no such note and
            `copy.note` is null there. */}
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

        {/* pasted-up panel: the stakes tiles and the race roster on one scrap */}
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

        {/* ponytail: SealActions keeps its shared btn-outline / btn-primary
            pair rather than growing a Snide poster-button skin slot. The
            global [Cancel] … [Submit] order (#646) and the shared destructive
            tone matter more here than an acid-green button, and adding a skin
            prop to the shared component would be foundation work. */}
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
    </DuelSealSheet>
  )
}

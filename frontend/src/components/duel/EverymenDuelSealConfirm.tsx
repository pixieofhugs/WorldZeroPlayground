/**
 * Everymen duel seal-confirm (#721, `EvDuelDialog.dc.html`): a stamped form over
 * the composer. Masthead / scrolling middle / pinned action band are flex regions,
 * so actions sit under a thumb on a phone. Pure frame; copy from `useDuelSealCopy`
 * (#751, neutral #718: the mock's invented eyebrow/rubric words are not shipped).
 * Forfeit mode drops the title a tier and inverts the stakes panel to ink.
 *
 * Contrast (#1168): red as prose fails (4.49 / 4.16), so the forfeit body uses
 * `NOTICE`; on the inverted panel `--color-success` is 1.88:1, hence the gold credit.
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
import { factionBodyVars } from '../../utils/factionBodyFace'

const PAPER = 'var(--everymen-paper)'
const PAPER_DEEP = 'var(--everymen-paper-deep)'
const CREAM = 'var(--everymen-cream)'
const INK = 'var(--everymen-ink)'
const PAPER_TEXT = 'var(--everymen-paper-text)'
/** Muted ink for the deep stock (#1173): `--everymen-muted` is 4.25:1 there; this is 4.77 / 7.39. */
const QUIET = 'var(--everymen-quiet)'
const RED = 'var(--everymen-red)'
const GOLD = 'var(--everymen-gold)'
/** Sheet-measured warning ink (#694): 5.45 / 10.25; red keeps rule and fill roles. */
const NOTICE = 'var(--faction-everymen-card-notice)'
const POSTER = 'var(--font-accent)' // Bebas Neue
const BODY = 'var(--faction-everymen-body-font)'

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

  // Opponent's tokens, as in the Default dialog (#310).
  const accent = factionCssVar(foe.faction_slug, 'card-accent')

  // A MODE branch, not a theme one: the stakes panel flips to ink in forfeit.
  const onInk = copy.danger
  // On ink the shared green is 1.88:1, so credit takes gold (7.03 / 10.81). `undefined`
  // works because `DuelSlotTheme` resolves field-by-field (#1168).
  const theme: DuelSlotTheme = {
    accent,
    muted: onInk ? CREAM : QUIET,
    bodyFont: BODY,
    credit: onInk ? GOLD : undefined,
  }

  return (
    <DuelSealSheet
      label={copy.heading}
      ground={{ ...factionBodyVars("everymen"), background: PAPER, color: PAPER_TEXT, fontFamily: BODY }}
      card={{
        border: `3px solid ${INK}`,
        boxShadow: `14px 14px 0 color-mix(in srgb, ${INK} 30%, transparent)`,
      }}
    >
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
        {/* The shared burst (#2195); `knockout` because the plate is red. */}
        <div aria-hidden className="em-burst em-burst-knockout" />
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
        <span
          aria-hidden
          style={{ display: 'block', width: 56, height: 3, background: GOLD, marginBottom: 'var(--space-sm)' }}
        />
        <h2
          style={{
            position: 'relative',
            margin: 0,
            fontFamily: POSTER,
            // Forfeit sits a tier quieter (§4a).
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

      <div
        aria-hidden
        style={{ flexShrink: 0, height: 7, background: `linear-gradient(90deg, ${RED} 0 50%, ${GOLD} 50% 100%)` }}
      />

      {/* `flex: 1` + own scroll pins masthead and actions on a phone */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--space-xl)' }}>
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

        {copy.note && (
          <p
            className="content-text"
            style={{ marginTop: 'var(--space-sm)', color: 'var(--color-success)' }}
          >
            {copy.note}
          </p>
        )}

        <div
          aria-hidden
          style={{ marginTop: 'var(--space-lg)', borderTop: `2px dashed color-mix(in srgb, ${INK} 45%, transparent)` }}
        />

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
            me={me}
            opponentName={foe.display_name}
            taskPointValue={taskPointValue}
            status={duel.status}
            theme={theme}
          />
          <RaceRoster me={me} foe={foe} theme={theme} />
        </div>
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: 'var(--space-md) var(--space-xl)',
          background: PAPER_DEEP,
          borderTop: `2px solid ${INK}`,
        }}
      >
        {/* ponytail: shared SealActions buttons, no stamped-button skin slot;
            add a skin prop to SealActions if wanted. */}
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

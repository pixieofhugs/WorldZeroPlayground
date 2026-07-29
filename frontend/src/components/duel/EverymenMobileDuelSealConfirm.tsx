/**
 * Everymen MOBILE duel seal-confirm (#721) — the desktop form as a full-screen
 * dispatch, the shape `EvPraxisPhone.dc.html` implies.
 *
 * Same document, thumbed: the panel goes full-bleed on the page background with
 * no floating shadow (there is nothing for it to float above), the masthead
 * loses its exaggerated offset, the footer band pins to the bottom so the thumb
 * lands on the actions, and the middle scrolls. Single-column throughout —
 * SPEC-faction-ui-profile §1a forbids a fixed-px grid on the mobile path.
 *
 * Both modes (#751), same as the desktop skin: `useDuelSealCopy` owns every
 * string that differs and the forfeit dialog re-dresses the stakes panel in ink
 * rather than dropping it. `StakesTiles`, `RaceRoster` and `SealActions` are all
 * present in both modes — none of the duel's arithmetic lives here.
 *
 * The contrast readings are the desktop form's verbatim — same paper, same
 * inverting stakes panel — so the same two routings apply (#1168): NOTICE for
 * the forfeit body with the red as its rule, and GOLD for the shared slots'
 * `credit` while the panel is ink. See `EverymenDuelSealConfirm.tsx`.
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
/** The sheet-measured warning ink — see `EverymenDuelSealConfirm` (#1168). */
const NOTICE = 'var(--faction-everymen-card-notice)'
const POSTER = 'var(--font-accent)'
const BODY = 'var(--font-body)'

const GUILLOCHE =
  `repeating-conic-gradient(from 0deg at 50% -8%, color-mix(in srgb, ${CREAM} 10%, transparent) 0 5deg, transparent 5deg 11deg)`

export default function EverymenMobileDuelSealConfirm({
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
  const onInk = copy.danger
  // The panel's polarity decides the slots' inks — see the desktop skin (#1168).
  const theme: DuelSlotTheme = {
    accent,
    muted: onInk ? CREAM : MUTED,
    bodyFont: BODY,
    credit: onInk ? GOLD : undefined,
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.heading}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: PAPER, color: PAPER_TEXT, fontFamily: BODY }}
    >
      {/* ── Stamped red masthead ── */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          padding: 'var(--space-lg)',
          background: RED,
          backgroundImage: GUILLOCHE,
          color: CREAM,
          borderBottom: `3px solid ${INK}`,
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: -18,
            right: -18,
            width: 88,
            height: 88,
            borderRadius: '50%',
            border: `2px dashed ${CREAM}`,
            opacity: 0.45,
            transform: 'rotate(-12deg)',
          }}
        />
        <span
          aria-hidden
          style={{ display: 'block', width: 48, height: 3, background: GOLD, marginBottom: 'var(--space-sm)' }}
        />
        <h2
          style={{
            position: 'relative',
            margin: 0,
            fontFamily: POSTER,
            fontWeight: 400,
            // A tier down in forfeit mode, as on desktop — the costly dialog
            // does not shout. Both are Content-ramp tokens (§4a).
            fontSize: onInk ? 'var(--text-title)' : 'var(--text-heading)',
            lineHeight: 1,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            textShadow: `2px 2px 0 color-mix(in srgb, ${INK} 55%, transparent)`,
          }}
        >
          {copy.heading}
        </h2>
      </div>

      <div
        aria-hidden
        style={{ flexShrink: 0, height: 6, background: `linear-gradient(90deg, ${RED} 0 50%, ${GOLD} 50% 100%)` }}
      />

      {/* ── Scrolling middle ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-lg)' }}>
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
              width: 34,
              height: 34,
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

        {/* NOTICE, with the red as the rule — see the desktop form (#1168). */}
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
            boxShadow: onInk ? `4px 4px 0 color-mix(in srgb, ${RED} 45%, transparent)` : 'none',
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

      {/* ── Pinned footer band ── */}
      <div
        style={{
          flexShrink: 0,
          padding: 'var(--space-md) var(--space-lg)',
          background: PAPER_DEEP,
          borderTop: `2px solid ${INK}`,
        }}
      >
        {/* ponytail: the shared SealActions pair again — thumb-sized styling
            would need a skin slot on the shared component, which is foundation
            work rather than a skin change. */}
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
  )
}

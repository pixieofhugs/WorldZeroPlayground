import { useFormFactor } from '../../hooks/useFormFactor'
import type { FeedFrameProps } from './feedFrameProps'

/**
 * Warriors of Whimsy — THE CHRONICLE PROCLAMATION (feed chassis v2, #1204).
 *
 * The card every WOW-actor update is proclaimed on: a 6px gold/plum barber
 * ribbon crowning a cream sheet bound in a 2px gold frame at radius 9, the
 * herald's ✦ leading a MedievalSharp kicker, the date set in Lora italic at the
 * far end, and the ribbon repeating as a 3px section rule between the head and
 * the body. It is the quest decree's own chrome (`WowTaskCard`, #1023) folded
 * down to a feed card — a WOW surface must look like the decree (§6).
 *
 * WHAT THIS IS, AND WHAT IT IS NOT (the three-layer seam, #1194):
 *
 *   FeedItemSlot      the ARCHIVE — the ✕, the swipe, the write, the 6s undo.
 *   └ THIS FILE       the CHASSIS — kicker · tag · time, and it PLACES the ✕.
 *       └ children    the shared PAYLOAD. Faction-blind. Never touched here.
 *
 * So this file is dress and nothing else. It draws all four chrome slots
 * ({@link FeedFrameProps}) and rebuilds none of them: `archive` arrives finished
 * — hover/focus-gated, keyboard reachable, labelled, and `null` on
 * `awaiting_submission`, which is state rather than an event and offers no
 * control at all. It paints in `currentColor`, so the head tints it plum simply
 * by being plum. Swipe, the undo strip and the archived list are inherited whole.
 *
 * NOT A WORD OF THE SHEET'S OWN DIALECT SHIPS (epic #1192). The design is
 * written in the Court's voice and every string on this card is the neutral one
 * from the `feed` catalog: the kicker is `feed:kicker.<type>`, the tag is
 * "Still waiting". The skin is the identification — no faction name appears
 * anywhere on it, and the old HERALD'S DISPATCH masthead is gone with #1194's
 * rule that `kicker` is a card's ONLY kind label. Two labels naming one card's
 * kind is what that rule exists to stop. `feed:identity.wow.dispatch` therefore
 * has no reader left; the key stays in the catalog untouched, because a dress
 * issue may not edit the shared `feed` catalog while the other seven faction
 * agents are in flight, and sweeping it belongs to whoever tidies the catalog
 * once the epic lands. `feed:row.wow.*` (#898) is still unclaimed for the same
 * reason it always was: it belongs to the row SENTENCE, which the shared body
 * composes generically and a chassis cannot see.
 *
 * THE SHEET'S CROOKED POINTS PLAQUE IS NOT DRAWN HERE, and cannot be from this
 * seam. Points live on the shared, faction-blind body (`FeedRowContent` sets
 * them beside the level), and the chassis only ever sees `children` — it has no
 * points value to strike a plaque with, and reaching into the body's markup to
 * restyle one would be the chassis special-casing a payload, which the seam
 * forbids. Drawing its own plaque would print the figure twice, exactly as
 * re-drawing the kit's wax seal would have put two crests on one row (the actor's
 * portrait already IS the crest, `WowAvatar` #897). It stays undrawn until the
 * shared body grows a slot for it.
 *
 * WHERE THE SHEET'S LITERALS LANDED. Every one maps onto a shipped
 * `--faction-wow-*` token; nothing is ported and nothing new is minted:
 *   ribbon   → `--faction-wow-quest-ribbon` (the composed gold/plum 11px stripe)
 *   cardBg   → `--faction-wow-card-bg`     · gold  → `--faction-wow-chronicle-gold`
 *   ink      → `--faction-wow-card-text`   · muted → `--faction-wow-card-muted`
 *   ctaBg    → `--faction-wow-plum-surface` under `--faction-wow-on-plum`
 *   goldDeep → `--faction-wow-stamp-total` (the herald's ✦)
 *
 * TWO AA FINDINGS FROM #1221 ARE HONOURED BY AVOIDANCE, not by re-measuring:
 * `--faction-wow-card-muted` is a CREAM-ONLY ink (4.77:1 on `-card-bg`, but
 * 4.25:1 on `-chronicle-panel`), so the date sits on the cream sheet and this
 * card grows no parchment head plate for it to fail on — the v1 dispatch band
 * was exactly such a plate; and `-stamp-chip-text` on `-chip-bg` is 4.14:1 in
 * dark, so the tag chip takes the theme-invariant `-plum-surface` / `-on-plum`
 * pair (5.16:1 in both themes) that every other measured WOW chip uses.
 *
 * ONE RESPONSIVE COMPONENT, no mobile twin (ADR-0056 / 0058 / 0063):
 * `useFormFactor` picks the padding and the kicker's tier, and the head wraps
 * with the date and the ✕ held together as one cluster, so a narrow card breaks
 * between the label and the controls rather than orphaning the ✕.
 *
 * Both themes come from the `[data-theme="dark"]` cascade.
 */

const MED = 'var(--faction-wow-card-font)' /* MedievalSharp */
const LORA = 'var(--faction-wow-body-font)' /* Lora */
const GOLD = 'var(--faction-wow-chronicle-gold)'
const GILT = 'var(--faction-wow-stamp-total)'
const PLUM = 'var(--faction-wow-card-accent)'
const RIBBON = 'var(--faction-wow-quest-ribbon)'

/** The barber ribbon's two weights: the 6px crown and the 3px section rule.
 *  Ornament geometry — the drawn stripe itself, not layout spacing (§4a). */
const CROWN_HEIGHT = 6
const RULE_HEIGHT = 3
/** The rule is the same ribbon held back so it divides without competing. */
const RULE_OPACITY = 0.75

interface SizeSet {
  head: string
  kicker: string
}

const SIZES: Record<'desktop' | 'mobile', SizeSet> = {
  desktop: { head: 'var(--space-sm) var(--space-lg)', kicker: 'var(--text-lg)' },
  mobile: { head: 'var(--space-xs) var(--space-md)', kicker: 'var(--text-md)' },
}

export default function WowFeedFrame({
  kicker,
  time,
  tag,
  archive,
  children,
}: FeedFrameProps) {
  const formFactor = useFormFactor()
  const size = SIZES[formFactor]

  return (
    <article
      data-form-factor={formFactor}
      style={{
        borderRadius: 9,
        overflow: 'hidden',
        background: 'var(--faction-wow-card-bg)',
        color: 'var(--faction-wow-card-text)',
        border: `2px solid ${GOLD}`,
        boxShadow: 'var(--faction-wow-quest-shadow)',
        fontFamily: LORA,
      }}
    >
      {/* The crown. A stripe carrying NO text, which is the only reason the
          undimmed gold/plum ships as drawn (§3, #840). */}
      <div aria-hidden style={{ height: CROWN_HEIGHT, background: RIBBON }} />

      {/* The proclamation head. Plum is the head's ink, so the pre-composed
          archive node inherits it — that is how a chassis tints a control it
          must not rebuild. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-sm)',
          padding: size.head,
          color: PLUM,
        }}
      >
        <span className="wow-tw" aria-hidden style={{ color: GILT }}>
          ✦
        </span>

        <span
          className="eyebrow"
          style={{
            fontFamily: MED,
            fontSize: size.kicker,
            letterSpacing: '0.14em',
            color: 'inherit',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {kicker}
        </span>

        {/* "Still waiting" — an archived challenge or invite is still open, since
            archiving never answers anything (ADR-0066). Struck as the decree's
            own plum lozenge, the one WOW chip pairing measured in both themes. */}
        {tag && (
          <span
            className="eyebrow"
            style={{
              fontFamily: MED,
              fontSize: 'var(--text-md)',
              letterSpacing: '0.1em',
              color: 'var(--faction-wow-on-plum)',
              background: 'var(--faction-wow-plum-surface)',
              borderRadius: 4,
              padding: '0 var(--space-sm)',
              whiteSpace: 'nowrap',
            }}
          >
            {tag}
          </span>
        )}

        {/* The date and the ✕ travel together: when the head wraps it must break
            before this cluster, never inside it. */}
        <span
          style={{
            marginLeft: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
          }}
        >
          <span
            style={{
              fontFamily: LORA,
              fontStyle: 'italic',
              fontSize: 'var(--text-lg)',
              // The cream-only ink, on the cream sheet it was measured against.
              color: 'var(--faction-wow-card-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            {time}
          </span>
          {archive}
        </span>
      </div>

      {/* The section rule — the crown again, thinner and held back. */}
      <div
        aria-hidden
        style={{ height: RULE_HEIGHT, background: RIBBON, opacity: RULE_OPACITY }}
      />

      {/* The payload pads itself — every shared body and all three companions set
          their own `var(--space-md) var(--space-lg)` — so the chassis adds none.
          The v1 frame wrapped children in another `--space-md` and double-padded
          every card. */}
      {children}
    </article>
  )
}

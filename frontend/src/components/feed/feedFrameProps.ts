import type { ReactNode } from 'react'

/**
 * THE CHASSIS SEAM (epic #1192, F2 #1194).
 *
 * A faction's feed card is ONE chassis × shared payload bodies — not a bespoke
 * card per faction × per feed type. This is the whole contract between the two:
 * the frame owns the physical chrome and the three things every design sheet
 * draws on it (kicker band, timestamp, dismiss control); the body arrives as
 * `children` and is faction-blind.
 *
 * Before #1194 a frame owned only `{ children }`, which is why every card drew
 * its own timestamp inside the body and no card could be dismissed at all.
 *
 * RULES FOR A FACTION FRAME
 * -------------------------
 * 1. **Draw all four slots.** `kicker`, `time` and `archive` are chrome; a frame
 *    that swallows one loses a feature, not a decoration. `tag` is nullable.
 * 2. **Never print a faction name.** The skin is the identification (epic
 *    decision 5). `kicker` is a neutral domain noun — "Duel challenge", "Vote".
 * 3. **`archive` is a pre-composed node.** Place it; do not rebuild it. It is
 *    already boxed and squared to its own target, already keyboard reachable,
 *    already labelled, and already ABSENT when the card cannot be archived
 *    (`awaiting_submission`) — a frame must never render a disabled stand-in.
 *    It paints in `currentColor`, so a frame tints it by setting `color` on the
 *    element it sits in — and it spends that ink at FULL strength, which is what
 *    #2091 fixed and what makes the band ink a frame publishes here the one
 *    thing standing between this control and WCAG 1.4.11.
 * 4. **One responsive component per faction** — no mobile twin (ADR-0056 /
 *    0058 / 0063). Size from `useFormFactor()` inside the component if needed.
 * 5. **Nothing else changes.** Swipe-to-archive, the undo strip and the archived
 *    list live OUTSIDE the frame, in `FeedItemSlot` — a faction skin inherits
 *    all three for free and must not reimplement them.
 */
export interface FeedFrameProps {
  /**
   * The neutral name for this card's kind, drawn as the kicker band's label.
   * Comes from `feed:kicker.<feed type>`. Never a faction name.
   */
  kicker: string
  /** Relative timestamp, already formatted ("2h ago"). */
  time: string
  /**
   * A neutral status tag for the band, or null. Today the only one is
   * "Still waiting" — the tag an archived duel challenge / collab invite
   * carries, because archiving never answers anything (ADR-0070).
   */
  tag: string | null
  /**
   * The dismiss (or, in the archived view, restore) control — already built.
   * `null` when the card offers neither, which is `awaiting_submission`: it is
   * state, not an event, and the backend refuses to archive it.
   */
  archive: ReactNode
  /** The payload body — a shared row or a companion card. Faction-blind. */
  children: ReactNode
}

import type { ReactNode } from 'react'

/**
 * The chassis seam (epic #1192, #1194): one chassis per faction × shared,
 * faction-blind payload bodies.
 *
 * Rules for a faction frame:
 * 1. Draw all four slots (`tag` is nullable); dropping one loses a feature.
 * 2. Never print a faction name (epic decision 5).
 * 3. Place `archive`, never rebuild it or draw a disabled stand-in. It paints
 *    in `currentColor` at full strength (#2091), so the frame's ink must clear
 *    WCAG 1.4.11.
 * 4. One responsive component, no mobile twin (ADR-0056/0058/0063).
 * 5. Swipe, undo strip and archived list live in `FeedItemSlot`; don't
 *    reimplement them.
 */
export interface FeedFrameProps {
  /** Neutral kind label from `feed:kicker.<type>`. Never a faction name. */
  kicker: string
  /** Already formatted ("2h ago"). */
  time: string
  /** Neutral status tag or null; today only "Still waiting" (ADR-0070). */
  tag: string | null
  /** The finished dismiss/restore control; `null` on `awaiting_submission`. */
  archive: ReactNode
  /** Faction-blind payload body. */
  children: ReactNode
}

/**
 * Per-faction feed-card frame dispatch (surface #12, SPEC-faction-ui-profile.md).
 *
 * The activity feed itself is neutral; each *card* themes to its faction. This is
 * the single seam where a faction's bespoke feed skin plugs in — wrap the
 * event-type card (FeedCardRouter) in the frame for `item.context_faction_slug`,
 * falling back to a neutral passthrough until design delivers an archetype.
 *
 * Wiring is ready ahead of the components: add one row to FACTION_FEED_FRAMES
 * (e.g. `everymen: EverymenFeedFrame`) and that faction's feed cards adopt its
 * skin with no other change. Mirrors CARD_COMPONENTS / FACTION_BACKDROPS.
 */
import type { ComponentType, ReactNode } from 'react'

import { pickVariant } from '../../utils/factionDispatch'
import EverymenFeedFrame from './EverymenFeedFrame'
import EphemeristsFeedFrame from './EphemeristsFeedFrame'
import WowFeedFrame from './WowFeedFrame'
import SnideFeedFrame from './SnideFeedFrame'
import SingularityFeedFrame from './SingularityFeedFrame'

type FrameProps = { children: ReactNode }

/** Per-faction frames. Each row makes that faction's feed cards bespoke.
 *  albescent/aged_out inherit ua via pickVariant. UA feed is undesigned, so
 *  ua falls through to the neutral DefaultFeedFrame (#224). */
const FACTION_FEED_FRAMES: Record<string, ComponentType<FrameProps>> = {
  everymen: EverymenFeedFrame,
  ephemerists: EphemeristsFeedFrame,
  wow: WowFeedFrame,
  snide: SnideFeedFrame,
  singularity: SingularityFeedFrame,
}

/** Neutral fallback: render the card unchanged (today's behaviour — the event
 *  cards carry their own tint, so the default frame adds no chrome). */
function DefaultFeedFrame({ children }: FrameProps) {
  return <>{children}</>
}

interface Props {
  slug: string | null | undefined
  children: ReactNode
}

export default function FactionFeedFrame({ slug, children }: Props) {
  const Frame = pickVariant(FACTION_FEED_FRAMES, slug, DefaultFeedFrame)
  return <Frame>{children}</Frame>
}

export { FACTION_FEED_FRAMES, DefaultFeedFrame }

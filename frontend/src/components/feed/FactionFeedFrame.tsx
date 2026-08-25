/**
 * Per-faction feed-card CHASSIS dispatch (surface #12, SPEC-faction-ui-profile.md).
 *
 * The activity feed itself is neutral; each *card* is drawn on its faction's own
 * chassis. This is the single seam where a faction's bespoke feed skin plugs in:
 * claim `feedFrame` in the faction's manifest and every card whose
 * `context_faction_slug` is that faction adopts the skin with no other change.
 *
 * #1194 WIDENED THE SEAM. A frame used to own only `{ children }`, so it could
 * not draw the kicker band, the timestamp or the dismiss control — all three of
 * which every design sheet puts on the chassis. The contract is now
 * {@link FeedFrameProps}; read its docblock before writing a faction skin.
 * Nothing may be written against the old `{ children }` shape.
 *
 * `DefaultFeedFrame` IS THE `na` SKIN AND LIVES IN ITS OWN MODULE (#2530). It
 * used to be defined below and passed as `pickVariant`'s fallback, and the
 * dispatcher then special-cased it by IDENTITY to hand it the slug the faction
 * frames do not take. It is a manifest row now like the other eight, so the
 * identity check became a SLUG check: `na` is the resolved key, not a component
 * to compare against — which is also the only form that survives the archetype
 * arriving as a code-split wrapper rather than as the module itself.
 */
import type { ComponentType } from 'react'
import { resolveSlug } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'
import { UNAFFILIATED_FACTION_SLUG } from '../../utils/factions'
import type { FeedFrameProps } from './feedFrameProps'

interface Props extends FeedFrameProps {
  slug: string | null | undefined
}

export default function FactionFeedFrame({ slug, ...frame }: Props) {
  const frames = surfaceMap('feedFrame')
  const key = resolveSlug(frames, slug)
  const Frame = frames[key]
  // Only the na chassis needs the slug (to tint); bespoke skins are slug-blind
  // — they ARE the faction, so there is nothing to dispatch on. The cast is the
  // price of that asymmetry: `feedFrame` is typed at the contract all nine share
  // and this one prop is na's alone, exactly as `ornament` is DefaultAvatar's.
  if (key === UNAFFILIATED_FACTION_SLUG) {
    const Na = Frame as ComponentType<FeedFrameProps & { slug?: string | null }>
    return <Na slug={slug} {...frame} />
  }
  return <Frame {...frame} />
}

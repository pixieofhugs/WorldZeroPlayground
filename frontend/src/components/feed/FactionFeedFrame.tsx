/**
 * Per-faction feed-card chassis dispatch (surface #12, SPEC-faction-ui-profile.md).
 * Claim `feedFrame` in a manifest and that faction's cards adopt the skin. The
 * contract is {@link FeedFrameProps} (#1194) — read it before writing a skin.
 * `na` is a manifest row like the others, dispatched by SLUG, not identity (#2530).
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
  // Only the na chassis takes the slug (to tint); bespoke skins are slug-blind.
  // `feedFrame` is typed at the shared contract, hence the cast.
  if (key === UNAFFILIATED_FACTION_SLUG) {
    const Na = Frame as ComponentType<FeedFrameProps & { slug?: string | null }>
    return <Na slug={slug} {...frame} />
  }
  return <Frame {...frame} />
}

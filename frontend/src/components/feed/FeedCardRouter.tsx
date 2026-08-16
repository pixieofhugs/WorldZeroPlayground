import type { ReactNode } from 'react'
import type { ActivityFeedItem } from '../../api/activityFeed'
import i18n from '../../i18n'
import { relativeTime } from '../../utils/dates'
import { hasOwnKey } from '../../utils/hasOwnKey'
import FactionFeedFrame from './FactionFeedFrame'
import FeedItemSlot from './FeedItemSlot'
import FeedRowContent from './FeedRowContent'
import { normalizeFeedItem } from './normalizeFeedItem'
import { feedKicker, isStillWaiting } from './feedItemLabels'
import FeedCardEraAnnouncement from './FeedCardEraAnnouncement'
import FeedCardCollabInvite from './FeedCardCollabInvite'
import FeedCardDuelChallenge from './FeedCardDuelChallenge'
import FeedCardInvitationLetter from './FeedCardInvitationLetter'

/**
 * THE CHASSIS SEAM, assembled. Read this and {@link FeedFrameProps} before
 * building a faction feed skin (#1194).
 *
 * Every feed item is three layers, and each one owns exactly one thing:
 *
 *   FeedItemSlot   the archive — the control, the swipe, the write, the undo
 *                  strip that stands in the slot. Faction-blind. Nothing in a
 *                  skin touches this.
 *   FactionFeedFrame  the CHASSIS — one per faction, dispatched on
 *                  `context_faction_slug`. It draws the kicker band, the tag,
 *                  the time and places the archive node. THIS is what a dress
 *                  issue rewrites.
 *   the body       shared payload — either the slot-driven `FeedRowContent` or
 *                  one of the three interactive companions. Faction-blind.
 *
 * So the whole of "give this faction its own feed card" is: claim `feedFrame` in
 * the faction's manifest. Nothing else changes, and no body needs touching.
 *
 * THE ONE EXCEPTION is `era_announcement` (epic #1192 decision 6). It is the
 * single factionless type and must stay that way — an era turn can strip a
 * player of their faction, so speaking that card in their faction's voice is
 * exactly backwards. It keeps its own neutral always-dark chrome, is NOT wrapped
 * in a chassis, and gains only the ✕.
 *
 * `comment_mention` was the seam's first customer and its proof: #1196 gave it a
 * body in `normalizeFeedItem` and it picked up the chassis, the kicker, the
 * timestamp, the ✕ and the swipe with NOT ONE LINE changed here. All fifteen
 * backend types now render.
 */

/**
 * What every companion body is handed. `onNotNow` is the slot's archive write
 * under the body's own label — only the invitation letter takes it (#1424); the
 * other two answer their request outright and archiving is not their deferral.
 */
interface CompanionProps {
  item: ActivityFeedItem
  onNotNow?: () => void
}

/** The three interactive companions — payload BODIES inside the chassis since
 *  #1194, keeping their own accept/decline handlers (epic decision 9). */
const COMPANION_BODIES: Record<string, React.ComponentType<CompanionProps>> = {
  invitation_letter: FeedCardInvitationLetter,
  duel_challenge: FeedCardDuelChallenge,
  collab_invite: FeedCardCollabInvite,
}

interface Props {
  item: ActivityFeedItem
  /** Drawn in the Archived tab: the control restores instead of archiving, and
   *  an unanswered challenge or invite carries the "still waiting" tag. */
  archivedView?: boolean
  /** Fired after a successful archive write so the surrounding feed can refresh
   *  its counts. */
  onArchiveChange?: () => void
}

export default function FeedCardRouter({ item, archivedView = false, onArchiveChange }: Props) {
  const row = normalizeFeedItem(item)
  // Own-property-only (#1821): a bracket read reaches `Object.prototype`, so a
  // type of `constructor` resolved to the `Object` function and this rendered it
  // as the companion body — past the `!Companion` guard below, which is exactly
  // the "type the backend emits ahead of a frontend case" path that guard exists
  // for.
  const Companion = hasOwnKey(COMPANION_BODIES, item.type)
    ? COMPANION_BODIES[item.type]
    : undefined
  const isEraAnnouncement = item.type === 'era_announcement'

  // A type with no body renders nothing rather than an empty chassis. Every one
  // of the fifteen the backend emits has a body as of #1196, so this guards a
  // type added to the backend registry ahead of its frontend case — the exact
  // fault that hid every @mention ever sent.
  if (!row && !Companion && !isEraAnnouncement) return null

  // "Still waiting" only in the archive, and only where something really is
  // still waiting: archiving never answers anything (ADR-0070), so an archived
  // duel challenge or collab invite that is STILL PENDING is open and says so —
  // one accepted or declined after it was archived is not, and must not (#1342).
  // In the live feed the card's own buttons already make that plain.
  const tag =
    archivedView && isStillWaiting(item) ? i18n.t('feed:archive.stillWaiting') : null

  // "Not now" is the archive write, so it is only offered where the slot's
  // action IS archiving. In the Archived tab that action is restore, and a
  // "Not now" that un-archived the card would mean the opposite of its label.
  const renderBody = (act: (() => void) | null): ReactNode => {
    if (row) return <FeedRowContent row={row} avatarUrl={item.actor_avatar_url} />
    // Unreachable while `isEraAnnouncement` is the only way past the early
    // return above with neither a row nor a companion — but the lookup's type is
    // honest about the miss now (#1821), and a body-less card renders nothing
    // rather than throwing inside React's render, which is what the old
    // `ComponentType`-that-was-really-undefined did.
    if (!Companion) return null
    return <Companion item={item} onNotNow={archivedView ? undefined : (act ?? undefined)} />
  }

  return (
    <FeedItemSlot item={item} archivedView={archivedView} onArchiveChange={onArchiveChange}>
      {(archive, act) =>
        isEraAnnouncement ? (
          <FeedCardEraAnnouncement item={item} archive={archive} />
        ) : (
          <FactionFeedFrame
            slug={row ? row.slug : item.context_faction_slug}
            kicker={feedKicker(item.type)}
            time={relativeTime(item.timestamp)}
            tag={tag}
            archive={archive}
          >
            {renderBody(act)}
          </FactionFeedFrame>
        )
      }
    </FeedItemSlot>
  )
}

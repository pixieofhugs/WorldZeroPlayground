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
 * The chassis seam, assembled (#1194; see {@link FeedFrameProps}):
 *   FeedItemSlot      archive (control, swipe, write, undo). Faction-blind.
 *   FactionFeedFrame  per-faction chassis on `context_faction_slug`; draws
 *                     kicker, tag, time, places the archive.
 *   body              `FeedRowContent` or a companion. Faction-blind.
 * A faction's feed card = claim `feedFrame` in its manifest.
 *
 * Exception: `era_announcement` (epic #1192 d6) stays unwrapped and neutral —
 * an era turn can strip a faction, so speaking in one is backwards.
 */

/** `onNotNow`: the archive write under the body's own label; letter only (#1424). */
interface CompanionProps {
  item: ActivityFeedItem
  onNotNow?: () => void
}

/** Payload bodies with their own accept/decline (epic decision 9). */
const COMPANION_BODIES: Record<string, React.ComponentType<CompanionProps>> = {
  invitation_letter: FeedCardInvitationLetter,
  duel_challenge: FeedCardDuelChallenge,
  collab_invite: FeedCardCollabInvite,
}

interface Props {
  item: ActivityFeedItem
  /** Archived tab: restore instead of archive, plus the "still waiting" tag. */
  archivedView?: boolean
  onArchiveChange?: () => void
}

export default function FeedCardRouter({ item, archivedView = false, onArchiveChange }: Props) {
  const row = normalizeFeedItem(item)
  // Own-property-only (#1821): a bracket read of `constructor` reached `Object`.
  const Companion = hasOwnKey(COMPANION_BODIES, item.type)
    ? COMPANION_BODIES[item.type]
    : undefined
  const isEraAnnouncement = item.type === 'era_announcement'

  // Guards a backend type that lands ahead of its frontend case (that hid every @mention once).
  if (!row && !Companion && !isEraAnnouncement) return null

  // Archive only, and only if still pending (ADR-0070, #1342).
  const tag =
    archivedView && isStillWaiting(item) ? i18n.t('feed:archive.stillWaiting') : null

  // "Not now" is the archive write, so never in the Archived tab (action = restore).
  const renderBody = (act: (() => void) | null): ReactNode => {
    if (row) return <FeedRowContent row={row} avatarUrl={item.actor_avatar_url} />
    // Unreachable today (#1821); render nothing rather than throw.
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

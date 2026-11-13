/**
 * WOW's feed chassis (#1204): the four chrome slots survive and the skin is the
 * only identification. Archive behaviour is `feedChassis.test.tsx`'s. Desktop
 * sizes (no matchMedia).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../i18n'
import i18n from '../../i18n'
import FactionFeedFrame from '../feed/FactionFeedFrame'
import FeedCardRouter from '../feed/FeedCardRouter'
import { FEED_TYPES, feedKicker, NON_ARCHIVABLE_TYPES } from '../feed/feedItemLabels'
import type { ActivityFeedItem } from '../../api/activityFeed'
import { resolveRoleReads } from "../../test/sourceScan";

/** The chassis, exercised through the dispatcher the way the feed reaches it. */
function frame(tag: string | null = null): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <FactionFeedFrame
        slug="wow"
        kicker="Task completed"
        time="2h ago"
        tag={tag}
        archive={<button type="button">archive-node</button>}
      >
        <span>card-body</span>
      </FactionFeedFrame>
    </MemoryRouter>,
  )
}

/** Rich enough for whichever type is asking. */
const FAT_PAYLOAD = {
  character_id: 3,
  praxis_id: 7,
  task_id: 9,
  task_title: 'Reforest the verge',
  task_point_value: 40,
  task_level_required: 2,
  value: 4,
  praxis_title: 'A returned proof',
  praxis_type: 'collab',
  from_character_id: 4,
  from_name: 'Ada',
  to_name: 'Bo',
  faction_slug: 'wow',
  old_faction_slug: 'wow',
  new_faction_slug: 'snide',
  era_name: 'Era One',
  duel_id: 5,
  challenger_praxis_id: 6,
  challenger_character_id: 3,
  invite_id: 8,
  inviter_character_id: 3,
  task_faction_slug: 'wow',
}

function card(type: string, archivedView = false): string {
  const item: ActivityFeedItem = {
    type,
    item_key: `${type}:1`,
    timestamp: '2026-01-01T00:00:00Z',
    actor_display_name: 'Ada',
    actor_faction_slug: 'wow',
    actor_avatar_url: null,
    payload: FAT_PAYLOAD,
    context_faction_slug: 'wow',
  }
  return renderToStaticMarkup(
    <MemoryRouter>
      <FeedCardRouter item={item} archivedView={archivedView} />
    </MemoryRouter>,
  )
}

/** The crown, and the same ribbon again as the section rule. */
const RIBBON = '--faction-wow-quest-ribbon'

describe('the four chrome slots (the contract every frame owes)', () => {
  it('draws the kicker, the time, the tag and the archive node', () => {
    const html = frame('Still waiting')
    expect(html, 'kicker').toContain('Task completed')
    expect(html, 'time').toContain('2h ago')
    expect(html, 'tag').toContain('Still waiting')
    expect(html, 'the archive node is PLACED, not rebuilt').toContain('archive-node')
  })

  it('keeps the payload body intact', () => {
    expect(frame()).toContain('<span>card-body</span>')
  })

  it('omits the tag entirely when there is none', () => {
    expect(frame()).not.toContain('Still waiting')
  })

  it('tints the archive by INHERITANCE — the head is plum, the ✕ paints in currentColor', () => {
    // The control arrives finished; it is tinted via `color`, never rebuilt (#2674).
    expect(resolveRoleReads(frame())).toContain(
      'color:var(--faction-wow-card-accent)',
    )
  })
})

describe('the skin is the identification (epic decision 5)', () => {
  it('prints no faction name', () => {
    const html = frame('Still waiting')
    expect(html).not.toContain('Warriors of Whimsy')
    expect(html).not.toContain('Whimsy')
  })

  it('carries no second kind label beside the kicker', () => {
    // #1194: `kicker` is a card's only kind label. Spelled as copy, not a key,
    // since the key was deleted (#1909).
    const html = frame()
    expect(html).not.toContain("Herald's Dispatch")
    expect(html.split('Task completed').length - 1, 'the kind is named once').toBe(1)
  })
})

describe('the proclamation chrome', () => {
  it('crowns the card with the barber ribbon and repeats it as the section rule', () => {
    const html = frame()
    expect(html.split(RIBBON).length - 1, 'the ribbon is drawn twice').toBe(2)
    expect(html, 'the 6px crown').toContain('height:6px')
    expect(html, 'the 3px rule, held back').toContain('height:3px')
    expect(html).toContain('opacity:0.75')
  })

  it('binds the sheet in a 2px gold frame on the cream ground, at the list radius', () => {
    // The radius value lives in the token (#2403; `factionCardFrame.test.ts`).
    const html = frame()
    expect(resolveRoleReads(html)).toContain(
      'border-radius:var(--faction-wow-card-radius)',
    )
    expect(html).toContain('2px solid var(--faction-wow-chronicle-gold)')
    expect(resolveRoleReads(html)).toContain(
      'background:var(--faction-wow-card-bg)',
    )
  })

  it('never lays the muted date ink on the parchment plate (#1221)', () => {
    // `--faction-wow-card-muted` is a cream-only ink: 4.25:1 on the plate.
    const html = frame()
    expect(html).toContain('var(--faction-wow-card-muted)')
    expect(html).not.toContain('--faction-wow-chronicle-panel')
  })

  it('strikes the tag as the measured plum lozenge, not the failing chip pair', () => {
    // The chip pair is 4.14:1 in dark; plum-surface/on-plum is 5.16:1 in both.
    const html = frame('Still waiting')
    expect(html).toContain('var(--faction-wow-plum-surface)')
    expect(html).toContain('var(--faction-wow-on-plum)')
    expect(html).not.toContain('--faction-wow-stamp-chip-text')
  })

  it('adds no padding of its own around the body — the payload pads itself', () => {
    // The head pads `--space-sm --space-lg`; a lone `--space-md` would double-pad.
    expect(frame()).not.toContain('padding:var(--space-md)"')
  })
})

describe('every type the backend emits, inside this chassis', () => {
  /** All but `era_announcement`, neutral by design (epic decision 6). */
  const TYPES = FEED_TYPES.filter((type) => type !== 'era_announcement')

  it('dresses every type but the exempt one in the proclamation, kicker and all', () => {
    for (const type of TYPES) {
      const html = card(type)
      expect(html, `${type} is proclaimed`).toContain(RIBBON)
      expect(html, `${type} is named`).toContain(feedKicker(type))
      if (!NON_ARCHIVABLE_TYPES.has(type)) {
        expect(html, `${type} can be dismissed`).toContain(i18n.t('feed:archive.dismissLabel'))
      }
    }
  })

  it('dresses the mention and leaves the one exempt type alone', () => {
    expect(card('comment_mention'), 'the mention is proclaimed like any row').toContain(RIBBON)
    expect(card('era_announcement'), 'keeps its own neutral chrome').not.toContain(RIBBON)
  })

  it('keeps the companions answerable inside the chassis', () => {
    const duel = card('duel_challenge')
    expect(duel).toContain(i18n.t('feed:duelChallenge.accept'))
    expect(duel).toContain(i18n.t('common:actions.decline'))

    const collab = card('collab_invite')
    expect(collab).toContain(i18n.t('common:actions.accept'))
    expect(collab).toContain(i18n.t('common:actions.decline'))

    expect(card('invitation_letter')).toContain(i18n.t('feed:invitationLetter.viewFactions'))
  })

  it('offers no archive control on awaiting_submission, and none disabled', () => {
    // `archive` arrives as `null`; never draw a disabled stand-in.
    const html = card('awaiting_submission')
    expect(html).toContain(RIBBON)
    expect(html).not.toContain(i18n.t('feed:archive.dismissLabel'))
    expect(html).not.toContain('disabled')
  })

  it('tags an archived challenge "still waiting" (ADR-0070)', () => {
    expect(card('duel_challenge', true)).toContain(i18n.t('feed:archive.stillWaiting'))
    expect(card('friend_completion', true)).not.toContain(i18n.t('feed:archive.stillWaiting'))
  })
})

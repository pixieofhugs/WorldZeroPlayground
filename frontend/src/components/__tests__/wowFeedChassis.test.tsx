/**
 * WOW's feed chassis — THE CHRONICLE PROCLAMATION (#1204, epic #1192).
 *
 * A dress issue's guards, so they hold the two things a dress can break and
 * nothing the shared layers already own: the four chrome slots survive, and the
 * skin is the only identification (no faction name, no second kind label).
 *
 * `renderToStaticMarkup`, per the frontend harness — no DOM, so no effect runs
 * and no pointer event fires. The swipe, the 6s undo and the archive write live
 * in `FeedItemSlot` and are pinned by `feedChassis.test.tsx`; nothing here
 * re-asserts them. `useFormFactor` resolves to its no-matchMedia default
 * (desktop), which is the size set every expectation below reads.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../i18n'
import i18n from '../../i18n'
import FactionFeedFrame from '../feed/FactionFeedFrame'
import FeedCardRouter from '../feed/FeedCardRouter'
import { feedKicker } from '../feed/feedItemLabels'
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

/** Rich enough for whichever of the fifteen types is asking. */
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
    // Rule 3 of the seam: the control arrives finished and is tinted by setting
    // `color` on what it sits in, never by rebuilding it.
    // The head's plum is the `accent` ROLE now (#2674), carrying today's
    // token as its fallback — the same value, asked for by role.
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
    // v1 headed every card "HERALD'S DISPATCH" as well as its kicker. #1194 made
    // `kicker` a card's ONLY kind label; two labels naming one kind is exactly
    // what that rule exists to stop.
    //
    // Spelled out because #1909 DELETED `feed:identity.wow.dispatch`: a key
    // kept alive only by a negative assertion is one the next dead-key sweep
    // cannot tell from a live one.
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
    // The radius was a literal 9 here until #2403 ruled the frame list's middle
    // to a single rung; the VALUE now lives once, in `--faction-wow-card-radius`
    // (`utils/__tests__/factionCardFrame.test.ts` holds it to the list). So this
    // asks that the frame reads it — restating the pixel is the thing the token
    // exists to stop.
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
    // `--faction-wow-card-muted` is 4.77:1 on the cream card but only 4.25:1 on
    // `--faction-wow-chronicle-panel` — a CREAM-ONLY ink. v1's head was that
    // plate. The head is now the cream sheet, so the plate is absent entirely.
    const html = frame()
    expect(html).toContain('var(--faction-wow-card-muted)')
    expect(html).not.toContain('--faction-wow-chronicle-panel')
  })

  it('strikes the tag as the measured plum lozenge, not the failing chip pair', () => {
    // `-stamp-chip-text` on `-chip-bg` is 4.14:1 in dark (#1221 measured that
    // pair against the duel ribbon, not against each other). `-plum-surface` /
    // `-on-plum` is 5.16:1 in BOTH themes.
    const html = frame('Still waiting')
    expect(html).toContain('var(--faction-wow-plum-surface)')
    expect(html).toContain('var(--faction-wow-on-plum)')
    expect(html).not.toContain('--faction-wow-stamp-chip-text')
  })

  it('adds no padding of its own around the body — the payload pads itself', () => {
    // v1 wrapped `{children}` in another `var(--space-md)`, double-padding every
    // card. The head's own padding is `--space-sm --space-lg`, so a lone
    // `--space-md` in this markup could only be that wrapper coming back.
    expect(frame()).not.toContain('padding:var(--space-md)"')
  })
})

describe('every type the backend emits, inside this chassis', () => {
  /**
   * Thirteen of the fifteen. The two the chassis deliberately does not dress are
   * asserted below: `era_announcement`, neutral by design because an era turn can
   * strip a player of their faction (epic decision 6), and `comment_mention`,
   * which has no body until #1196.
   */
  const TYPES = [
    'friend_completion',
    'foe_completion',
    'friend_signup',
    'friend_defection',
    'vote_on_mine',
    'vote_changed_on_mine',
    'foe_taunt',
    'global_task',
    'collaborator_submitted',
    'awaiting_submission',
    'nudge',
    'invitation_letter',
    'duel_challenge',
    'collab_invite',
  ]

  it('dresses all fourteen in the proclamation, kicker and all', () => {
    for (const type of TYPES) {
      const html = card(type)
      expect(html, `${type} is proclaimed`).toContain(RIBBON)
      expect(html, `${type} is named`).toContain(feedKicker(type))
    }
  })

  it('dresses the mention and leaves the one exempt type alone', () => {
    // #1196 landed while this branch was open and gave `comment_mention` a body,
    // so the old assertion here (`toBe('')`) had pinned a BUG as a rule. The
    // mention is an ordinary row now: it takes the chassis like any other.
    // `era_announcement` is the only genuinely exempt type — deliberately, since
    // an era turn can strip a player of their faction (epic #1192 decision 6).
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
    // It is state, not an event. `archive` arrives as `null` and a chassis must
    // never draw a disabled stand-in.
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

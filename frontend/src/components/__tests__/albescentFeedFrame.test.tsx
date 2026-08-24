/**
 * Albescent's feed chassis (#1203, epic #1192 decision 13).
 *
 * The dress issue's acceptance criteria, pinned. Two of them can only be checked
 * here rather than in `feedChassis.test.tsx`, whose fixtures are all Coven: that
 * ALL FIFTEEN backend types survive inside this particular chassis, and that the
 * nine the design sheet never drew are not a special case.
 *
 * What this file does NOT re-prove: the archive control, the swipe and the
 * six-second undo. They live in `FeedItemSlot`, outside every frame, and
 * `feedChassis.test.tsx` owns them. What is asserted here is that this chassis
 * still PLACES the control it is handed — the one way a frame can silently lose
 * the whole keyboard and screen-reader route into the archive.
 *
 * The harness is `renderToStaticMarkup`: no DOM, so no effect runs and no pointer
 * event fires. The ornament layers' inertness is asserted as `aria-hidden` here;
 * their `pointer-events: none` is index.css's and cannot be read without a DOM.
 */
import { Children } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../i18n'
import i18n from '../../i18n'
import AlbescentFeedFrame from '../feed/AlbescentFeedFrame'
import FeedCardRouter from '../feed/FeedCardRouter'
import { feedKicker, NON_ARCHIVABLE_TYPES } from '../feed/feedItemLabels'
import { surfaceMap } from '../../factions'
import type { ActivityFeedItem } from '../../api/activityFeed'

/** Every type the backend emits. */
const ALL_FEED_TYPES = [
  'friend_completion',
  'foe_completion',
  'vote_on_mine',
  'vote_changed_on_mine',
  'foe_taunt',
  'friend_signup',
  'friend_defection',
  'global_task',
  'collaborator_submitted',
  'awaiting_submission',
  'nudge',
  'era_announcement',
  'invitation_letter',
  'duel_challenge',
  'collab_invite',
  'comment_mention',
]

/** The eleven rows plus the three companions — every type the chassis wraps.
 *  `era_announcement` is exempt by TYPE (epic decision 6), not by slug. */
const CHASSIS_TYPES = ALL_FEED_TYPES.filter((type) => type !== 'era_announcement')

/** A payload rich enough for whichever type is asking. The faction slugs in it
 *  are OTHER factions on purpose: an Albescent actor completing a Coven task is
 *  an ordinary item, and the actor's slug is the only thing that skins the card
 *  (SPEC-faction-ui-profile.md §2). */
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
  faction_slug: 'coven',
  old_faction_slug: 'coven',
  new_faction_slug: 'snide',
  era_name: 'Era One',
  duel_id: 5,
  challenger_praxis_id: 6,
  challenger_character_id: 3,
  invite_id: 8,
  inviter_character_id: 3,
  task_faction_slug: 'coven',
  comment_id: 11,
  excerpt: 'your name came up',
}

function item(type: string, slug: string | null = 'albescent'): ActivityFeedItem {
  return {
    type,
    item_key: `${type}:1`,
    timestamp: '2026-01-01T00:00:00Z',
    actor_display_name: 'Ada',
    actor_faction_slug: slug,
    actor_avatar_url: null,
    payload: FAT_PAYLOAD,
    context_faction_slug: slug,
  }
}

function render(feedItem: ActivityFeedItem, archivedView = false): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <FeedCardRouter item={feedItem} archivedView={archivedView} />
    </MemoryRouter>,
  )
}

const ARCHIVE_LABEL = i18n.t('feed:archive.dismissLabel')
const RESTORE_LABEL = i18n.t('feed:archive.restoreLabel')

describe('every type this chassis carries', () => {
  it('wraps all fourteen chassis types, including the nine the sheet never drew', () => {
    // The sheet drew collab_invite, duel_challenge, collaborator_submitted,
    // awaiting_submission, nudge and comment_mention. It never drew the six
    // plain social rows, global_task or the invitation letter — and a payload
    // shape a design never saw is a CHASSIS problem if it looks wrong, never a
    // per-type special case. There is no branch in this frame to special-case
    // with.
    for (const type of CHASSIS_TYPES) {
      const html = render(item(type))
      // `alb-prism` joined `alb-feed` at #2499: the wash stopped being a span
      // and became a layer of the card's own background, reached by the class.
      expect(html, `${type} is dressed`).toContain('class="alb-feed alb-prism"')
      expect(html, `${type} keeps its kicker`).toContain(feedKicker(type))
      expect(html, `${type} carries the edge`).toContain('class="alb-feed-edge"')
    }
  })

  it('leaves era_announcement alone even when its slug says albescent', () => {
    // Chassis-exempt by TYPE, not by a null slug (epic decision 6): an era turn
    // can strip a player of their faction, so speaking that one card in their
    // voice is exactly backwards. Forced to 'albescent' here precisely because
    // the real item carries null — a frame that exempted it by slug would look
    // correct in production and be wrong.
    const html = render(item('era_announcement'))
    expect(html).not.toContain('alb-feed')
    expect(html, 'keeps its own always-dark chrome').toContain('--badge-admin-bg')
    expect(html, 'still gains the ✕').toContain(ARCHIVE_LABEL)
  })

  it('places the archive control it is handed, on every archivable type', () => {
    // The one way a frame silently loses a feature. The control itself is
    // `FeedItemSlot`'s; all this chassis can do is fail to draw it.
    for (const type of CHASSIS_TYPES) {
      if (NON_ARCHIVABLE_TYPES.has(type)) continue
      expect(render(item(type)), `${type} offers the ✕`).toContain(ARCHIVE_LABEL)
    }
  })

  it('draws no archive control on awaiting_submission, and none disabled', () => {
    // It is state, not an event, and the backend 400s on it. The chassis still
    // draws — a card with no dismiss control is not a card with no chrome.
    const html = render(item('awaiting_submission'))
    expect(html).toContain('class="alb-feed alb-prism"')
    expect(html).not.toContain(ARCHIVE_LABEL)
    expect(html).not.toContain(RESTORE_LABEL)
    expect(html).not.toContain('disabled')
  })

  it('keeps the two companions answerable inside the chassis', () => {
    // Epic decision 9 held for this skin too: the handlers did not move, so
    // accepting a duel or a collab from inside this card still works.
    const duel = render(item('duel_challenge'))
    expect(duel).toContain('class="alb-feed alb-prism"')
    expect(duel).toContain(i18n.t('feed:duelChallenge.accept'))
    expect(duel).toContain(i18n.t('common:actions.decline'))

    const collab = render(item('collab_invite'))
    expect(collab).toContain('class="alb-feed alb-prism"')
    expect(collab).toContain(i18n.t('common:actions.accept'))
    expect(collab).toContain(i18n.t('common:actions.decline'))
  })

  it('forwards the tag slot — an archived challenge still says still waiting', () => {
    expect(render(item('duel_challenge'), true)).toContain(
      i18n.t('feed:archive.stillWaiting'),
    )
  })

  it('draws the kicker and the timestamp once each', () => {
    const html = render(item('friend_completion'))
    expect(html.split(feedKicker('friend_completion')).length - 1).toBe(1)
    expect(html.split('ago').length - 1).toBeLessThanOrEqual(1)
  })
})

describe('the society stays hidden', () => {
  it('never prints the faction name on the card', () => {
    // Epic decision 5 for every faction; ADR-0027 twice over for this one, whose
    // whole design constraint is that a member is indistinguishable from an
    // unaffiliated player. The types below are the ones whose payload names no
    // faction of its own — friend_defection and invitation_letter legitimately
    // print the factions their CONTENT is about.
    for (const type of ['friend_completion', 'vote_on_mine', 'comment_mention', 'duel_challenge', 'collab_invite']) {
      expect(render(item(type)), `${type} names no faction`).not.toContain('Albescent')
    }
  })

  it('hides the ornament layer from assistive tech', () => {
    // One span since #2499. The ground needs no hiding at all — a background
    // layer is not in the accessibility tree to begin with, which is one more
    // thing the move off an overlay buys.
    const html = render(item('friend_completion'))
    expect(html).toContain('aria-hidden="true" class="alb-feed-edge"')
    expect(html, 'the retired wash is not back as a span').not.toContain('alb-feed-aurora')
  })
})

/**
 * The drift stops at user media here too (#1646's ruling, reaching this surface
 * on #1942).
 *
 * ## The seam, and why it is the ELEMENT TREE rather than the HTML
 *
 * The wash used to be a SIBLING of the card. It could not stay one:
 * `.sidebar-card` declares `backdrop-filter`, and a computed `backdrop-filter`
 * other than `none` makes an element a stacking context — so the card paints
 * atomically and no `z-index` on the actor's photograph inside it can rise above
 * a layer mounted outside it. The filter is not removable either; index.css says
 * so at its own site, because #1148's `position: fixed` companion modals need
 * the card as their containing block. So the ornaments are handed DOWN as
 * `children`.
 *
 * That relocation is a claim about STRUCTURE, and `renderToStaticMarkup` flattens
 * structure into a string where "inside the card" and "after the card" look
 * nearly alike. So it is asserted on the React element the component returns,
 * before rendering — which is exactly the claim, with nothing inferred.
 *
 * WHAT NO TEST HERE CAN PROVE: that a photo comes out untinted. No DOM, no
 * layout, no compositing. That is visual QA and it is outstanding on the PR.
 */
describe('the drift stops at user media (#1942)', () => {
  // One ornament since #2499; the wash is the card's own background now.
  const ORNAMENTS = ['alb-feed-edge']

  function ornamentMount() {
    const tree = AlbescentFeedFrame({
      kicker: 'kick',
      time: '2h ago',
      tag: null,
      archive: null,
      children: <p>body</p>,
    }) as ReactElement<{ children: ReactElement<{ children: ReactNode }> }>
    const chassis = tree.props.children
    return {
      wrapper: Children.toArray(tree.props.children),
      chassisChildren: Children.toArray(chassis.props.children),
    }
  }

  it('hands the ornament to the chassis instead of mounting it beside it', () => {
    const { wrapper, chassisChildren } = ornamentMount()
    // `.alb-feed` holds ONE child now — the chassis. An ornament left out here
    // is an ornament outside the card's stacking context, i.e. inert.
    expect(wrapper).toHaveLength(1)
    const classes = chassisChildren.map((child) =>
      (child as ReactElement<{ className?: string }>)?.props?.className,
    )
    for (const ornament of ORNAMENTS) {
      expect(classes, `${ornament} goes through the chassis`).toContain(ornament)
    }
  })

  it('still puts it last, so the ring traces the body it is handed', () => {
    // The relocation must not turn into "the ornament moved behind the content".
    // #1646 rejected that for the WASH, when Default's sheet was opaque and the
    // tell would have vanished; #2497 made the sheet a token and #2499 took the
    // option, so it is the ring — which traces a border and has to paint over
    // it — that the ordering is now about.
    const { chassisChildren } = ornamentMount()
    const last = chassisChildren.slice(-1).map((child) =>
      (child as ReactElement<{ className?: string }>).props.className,
    )
    expect(last).toEqual(ORNAMENTS)
  })

  it('hooks the actor photograph and the anchor that would cap it', () => {
    // Two hooks, one photo: the anchor is `#1893`'s lift, which is a stacking
    // context of its own, so the class has to land on it as well as on the
    // `<img>` (the anchor is absent when the row names no target).
    const withPhoto = { ...item('friend_completion'), actor_avatar_url: 'avatars/ada.png' }
    const html = render(withPhoto)
    expect(html, 'the anchor carries the scope').toContain('feed-avatar-link user-media')
    expect(html, 'and so does the photo').toMatch(/class="user-media"[^>]*src=/)
  })

  it('leaves the monogram disc in the wash — it is the site\'s furniture', () => {
    // The whole of #1646's distinction. A generated initial on a faction fill is
    // drawn BY the site; only the player's own photograph comes out.
    const html = render(item('friend_completion'))
    expect(html, 'no avatar url, so no photo').not.toContain('user-media')
    expect(html, 'and the anchor keeps its plain lift').toContain('class="feed-avatar-link"')
  })
})

describe('epic decision 13, both halves', () => {
  it('claims the chassis', () => {
    expect(surfaceMap('feedFrame')['albescent']).toBeDefined()
  })

  it('claims NO comment voice — Albescent keeps DefaultComment', () => {
    // `albescent ≡ na + drift` (ADR-0048): the comment voice does not need to
    // differ, because the card is sufficiently distinct on its own once the light
    // is on it. Owner's call at grill, and the title of the issue that built
    // this. An AlbescentComment appearing here would be the drift ADR-0027 is
    // about — a per-faction WORD is as identifying as a per-faction hue.
    expect(surfaceMap('comment')['albescent']).toBeUndefined()
  })
})

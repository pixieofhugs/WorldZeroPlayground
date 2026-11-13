/**
 * Albescent's feed chassis (#1203, epic #1192 decision 13). Archive behaviour is
 * `feedChassis.test.tsx`'s; here only that this chassis still PLACES the control.
 */
import { Children } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../i18n'
import i18n from '../../i18n'
import AlbescentFeedFrame from '../feed/AlbescentFeedFrame'
import AlbescentComment from '../comments/voices/AlbescentComment'
import { resolvedArchetype } from '../../factions/lazyArchetype'
import FeedCardRouter from '../feed/FeedCardRouter'
import { FEED_TYPES, feedKicker, NON_ARCHIVABLE_TYPES } from '../feed/feedItemLabels'
import { surfaceMap } from '../../factions'
import type { ActivityFeedItem } from '../../api/activityFeed'

/** `era_announcement` is exempt by TYPE (epic decision 6), not by slug. */
const CHASSIS_TYPES = FEED_TYPES.filter((type) => type !== 'era_announcement')

/** Other factions' slugs on purpose: only the actor's slug skins the card (SPEC-faction-ui-profile.md §2). */
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
  it('wraps every chassis type, including those the sheet never drew', () => {
    for (const type of CHASSIS_TYPES) {
      const html = render(item(type))
      expect(html, `${type} is dressed`).toContain('class="alb-feed alb-prism"')
      expect(html, `${type} keeps its kicker`).toContain(feedKicker(type))
      expect(html, `${type} carries the edge`).toContain('class="alb-feed-edge"')
    }
  })

  it('leaves era_announcement alone even when its slug says albescent', () => {
    // Forced to 'albescent' because the real item carries null, which would hide a slug-based exemption.
    const html = render(item('era_announcement'))
    expect(html).not.toContain('alb-feed')
    expect(html, 'keeps its own always-dark chrome').toContain('--badge-admin-bg')
    expect(html, 'still gains the ✕').toContain(ARCHIVE_LABEL)
  })

  it('places the archive control it is handed, on every archivable type', () => {
    for (const type of CHASSIS_TYPES) {
      if (NON_ARCHIVABLE_TYPES.has(type)) continue
      expect(render(item(type)), `${type} offers the ✕`).toContain(ARCHIVE_LABEL)
    }
  })

  it('draws no archive control on awaiting_submission, and none disabled', () => {
    // State, not an event; the backend 400s on it.
    const html = render(item('awaiting_submission'))
    expect(html).toContain('class="alb-feed alb-prism"')
    expect(html).not.toContain(ARCHIVE_LABEL)
    expect(html).not.toContain(RESTORE_LABEL)
    expect(html).not.toContain('disabled')
  })

  it('keeps the two companions answerable inside the chassis', () => {
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
    // ADR-0027. Only types whose payload names no faction of its own.
    for (const type of ['friend_completion', 'vote_on_mine', 'comment_mention', 'duel_challenge', 'collab_invite']) {
      expect(render(item(type)), `${type} names no faction`).not.toContain('Albescent')
    }
  })

  it('hides the ornament layer from assistive tech', () => {
    const html = render(item('friend_completion'))
    expect(html).toContain('aria-hidden="true" class="alb-feed-edge"')
    expect(html, 'the retired wash is not back as a span').not.toContain('alb-feed-aurora')
  })
})

/**
 * The drift stops at user media (#1646, #1942). `.sidebar-card`'s
 * `backdrop-filter` makes it a stacking context, so ornaments must be handed
 * DOWN as children — a structural claim, asserted on the element tree since
 * static markup flattens it. Untinted photos are visual QA, not provable here.
 */
describe('the drift stops at user media (#1942)', () => {
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
    // An ornament outside the chassis is outside the stacking context, i.e. inert.
    expect(wrapper).toHaveLength(1)
    const classes = chassisChildren.map((child) =>
      (child as ReactElement<{ className?: string }>)?.props?.className,
    )
    for (const ornament of ORNAMENTS) {
      expect(classes, `${ornament} goes through the chassis`).toContain(ornament)
    }
  })

  it('still puts it last, so the ring traces the body it is handed', () => {
    // The ring traces a border, so it must paint over the content.
    const { chassisChildren } = ornamentMount()
    const last = chassisChildren.slice(-1).map((child) =>
      (child as ReactElement<{ className?: string }>).props.className,
    )
    expect(last).toEqual(ORNAMENTS)
  })

  it('hooks the actor photograph and the anchor that would cap it', () => {
    // The anchor (#1893) is a stacking context too, so it needs the class as well.
    const withPhoto = { ...item('friend_completion'), actor_avatar_url: 'avatars/ada.png' }
    const html = render(withPhoto)
    expect(html, 'the anchor carries the scope').toContain('feed-avatar-link user-media')
    expect(html, 'and so does the photo').toMatch(/class="user-media"[^>]*src=/)
  })

  it('leaves the monogram disc in the wash — it is the site\'s furniture', () => {
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
    // A voice of its own would identify members (ADR-0027, ADR-0048). The row is a
    // pass-through wrapper (#2531); byte-identity is in `albescentWrapperKinds.test.tsx`.
    expect(resolvedArchetype(surfaceMap('comment')['albescent'])).toBe(AlbescentComment)
  })
})

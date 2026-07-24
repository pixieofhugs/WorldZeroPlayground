/**
 * Full-adoption feed (#376): the faction owns every "someone did X" row via one
 * slot-driven body; the four structural/interactive events keep bespoke cards.
 * This guards (a) the normalizer maps each faction event to the right slots and
 * leaves the four companions alone, and (b) the row renders its invariant slots.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { normalizeFeedItem, FACTION_ROW_TYPES } from '../feed/normalizeFeedItem'
import FeedRowContent from '../feed/FeedRowContent'
import type { ActivityFeedItem } from '../../api/activityFeed'
import '../../i18n'

function item(type: string, payload: Record<string, unknown>): ActivityFeedItem {
  return {
    type,
    timestamp: '2026-01-01T00:00:00Z',
    actor_display_name: 'Ada',
    actor_faction_slug: 'coven',
    actor_avatar_url: null,
    payload,
    context_faction_slug: 'coven',
  }
}

describe('normalizeFeedItem', () => {
  it('maps a friend completion to actor/action/headline slots', () => {
    const row = normalizeFeedItem(item('friend_completion', { character_id: 3, praxis_id: 7, task_title: 'Reforest', task_point_value: 40 }))!
    expect(row.actor).toBe('Ada')
    expect(row.action).toBe('completed a task')
    expect(row.actorHref).toBe('/characters/3')
    expect(row.headline).toBe('Reforest')
    expect(row.headlineHref).toBe('/praxes/7')
    expect(row.points).toBe('40 pts')
    expect(row.badge?.label).toBe('Friend')
  })

  it('maps a collaborator submission to the your-stuff row (#571)', () => {
    const row = normalizeFeedItem(
      item('collaborator_submitted', {
        character_id: 8,
        praxis_id: 12,
        task_title: 'Plant a tree',
        task_point_value: 25,
      }),
    )!
    expect(row.actor).toBe('Ada')
    expect(row.action).toBe('submitted their part of')
    expect(row.actorHref).toBe('/characters/8')
    expect(row.headline).toBe('Plant a tree')
    expect(row.headlineHref).toBe('/praxes/12')
    expect(row.points).toBe('25 pts')
    expect(row.badge?.label).toBe('Your Stuff')
  })

  it('resolves a taunt from the catalog, quotes it, and drops points', () => {
    // ADR-0031: payload is a structured reference; the catalog owns the words.
    // coven/score_overtake has 2 variants; taunt_id 9 -> 9 % 2 = 1 -> the second.
    const row = normalizeFeedItem(
      item('foe_taunt', {
        from_character_id: 9,
        taunt_id: 9,
        faction_slug: 'coven',
        trigger_type: 'score_overtake',
        from_name: 'Ada',
        to_name: 'Bo',
      }),
    )!
    expect(row.action).toBe('taunts you')
    expect(row.headline).toBe('One small spell, quietly cast — and Ada slips ahead of Bo. No hard feelings, only glitter.')
    expect(row.headlineQuoted).toBe(true)
    expect(row.points).toBeNull()
  })

  it('falls back to the default faction when a faction has no taunt entry', () => {
    // albescent has no taunts branch; default/level_up has 2 variants, id 2 -> index 0.
    const row = normalizeFeedItem(
      item('foe_taunt', {
        from_character_id: 4,
        taunt_id: 2,
        faction_slug: 'albescent',
        trigger_type: 'level_up',
        from_name: 'Cy',
        to_name: 'Di',
      }),
    )!
    expect(row.headline).toBe('Cy leveled up while Di was napping.')
  })

  it('gives UA a quiet acknowledgement instead of the default gloat', () => {
    // #850: UA used to fall through to `default`, which gloats. It now
    // overrides with its own acknowledgements. ua/level_up has 2 variants,
    // id 2 -> index 0. `from_name` is the achiever (the taunt's sender).
    const row = normalizeFeedItem(
      item('foe_taunt', {
        from_character_id: 4,
        taunt_id: 2,
        faction_slug: 'ua',
        trigger_type: 'level_up',
        from_name: 'Cy',
        to_name: 'Di',
      }),
    )!
    expect(row.headline).toBe('Cy settles a little deeper into the practice.')
    expect(row.headline).not.toContain('napping')
  })

  it('has an actorless system row for a global task', () => {
    const row = normalizeFeedItem(item('global_task', { task_id: 5, task_title: 'New job', task_point_value: 10, task_level_required: 2 }))!
    expect(row.actor).toBeNull()
    expect(row.headlineHref).toBe('/tasks/5')
    expect(row.level).toBe(2)
  })

  it('returns null for the four companion (structural/interactive) types', () => {
    for (const type of ['era_announcement', 'invitation_letter', 'duel_challenge', 'collab_invite']) {
      expect(normalizeFeedItem(item(type, {})), type).toBeNull()
    }
  })

  it('normalizes every registered faction-row type without throwing', () => {
    for (const type of FACTION_ROW_TYPES) {
      expect(normalizeFeedItem(item(type, {})), type).not.toBeNull()
    }
  })
})

describe('FeedRowContent', () => {
  it('renders actor, action, and headline slots', () => {
    const row = normalizeFeedItem(item('friend_completion', { character_id: 3, praxis_id: 7, task_title: 'Reforest', task_point_value: 40 }))!
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <FeedRowContent row={row} avatarUrl={null} />
      </MemoryRouter>,
    )
    expect(html).toContain('Ada')
    expect(html).toContain('completed a task')
    expect(html).toContain('Reforest')
    expect(html).toContain('href="/praxes/7"')
  })

  // ADR-0039: an unaffiliated (na) actor's monogram avatar is the rainbow ring,
  // not the flat grey a scalar factionColor would hand it. Real factions keep
  // their tinted disc.
  it('gives an na actor the rainbow-ring avatar, a real faction a tinted disc', () => {
    const naRow = normalizeFeedItem({ ...item('friend_completion', { character_id: 3, praxis_id: 7, task_title: 'Reforest', task_point_value: 40 }), context_faction_slug: 'na' })!
    const naHtml = renderToStaticMarkup(<MemoryRouter><FeedRowContent row={naRow} avatarUrl={null} /></MemoryRouter>)
    expect(naHtml).toContain('--faction-default-ring')

    const covenRow = normalizeFeedItem(item('friend_completion', { character_id: 3, praxis_id: 7, task_title: 'Reforest', task_point_value: 40 }))!
    const covenHtml = renderToStaticMarkup(<MemoryRouter><FeedRowContent row={covenRow} avatarUrl={null} /></MemoryRouter>)
    expect(covenHtml).not.toContain('--faction-default-ring')
  })
})

/**
 * The feed body's click target (#1893), static structure only: the overlay sits
 * on exactly ONE anchor (`headlineHref ?? actorHref`, never a wrapping <a>),
 * is absent when neither href exists, and every other control is lifted
 * (`z-index: 1`). The band is a sibling of the body, so it's out of reach by
 * construction.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import { AuthContext } from '../../../auth/AuthContext'
import FeedRowContent from '../FeedRowContent'
import FeedCardCollabInvite from '../FeedCardCollabInvite'
import FeedCardDuelChallenge from '../FeedCardDuelChallenge'
import { normalizeFeedItem } from '../normalizeFeedItem'
import type { ActivityFeedItem } from '../../../api/activityFeed'
import type { CurrentUser } from '../../../api/auth'

const OVERLAY = 'position:absolute;inset:0'
const LIFT = 'position:relative;z-index:1'

function item(type: string, payload: Record<string, unknown>): ActivityFeedItem {
  return {
    type,
    item_key: `${type}:1`,
    timestamp: '2026-01-01T00:00:00Z',
    actor_display_name: 'Ada',
    actor_faction_slug: 'coven',
    actor_avatar_url: null,
    payload,
    context_faction_slug: 'coven',
  }
}

function renderRow(type: string, payload: Record<string, unknown>): string {
  const row = normalizeFeedItem(item(type, payload))
  if (!row) throw new Error(`normalizeFeedItem returned null for ${type}`)
  return renderToStaticMarkup(
    <MemoryRouter>
      <FeedRowContent row={row} avatarUrl={null} />
    </MemoryRouter>,
  )
}

function renderCompanion(node: React.ReactNode): string {
  const user = { character: { id: 1, faction_slug: 'coven' } } as unknown as CurrentUser
  return renderToStaticMarkup(
    <AuthContext.Provider
      value={{
        user,
        loading: false,
        refetch: async () => {},
        applyUser: () => {},
        signOut: async () => {},
      }}
    >
      <MemoryRouter>{node}</MemoryRouter>
    </AuthContext.Provider>,
  )
}

/**
 * Href of the anchor holding the overlay (the nearest preceding `<a href>`).
 * Null = no overlay at all (plain body).
 */
function stretchedHref(html: string): string | null {
  const at = html.indexOf(OVERLAY)
  if (at === -1) return null
  const opens = [...html.slice(0, at).matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)]
  const last = opens[opens.length - 1]
  if (!last) throw new Error('overlay rendered outside any anchor')
  return last[1]
}

function overlayCount(html: string): number {
  return html.split(OVERLAY).length - 1
}

/** Whole opening tags: React serializes `style` before `href` on a `Link`. */
function anchorsTo(html: string, href: string): string[] {
  return [...html.matchAll(/<a\b[^>]*>/g)]
    .map((match) => match[0])
    .filter((tag) => tag.includes(`href="${href}"`))
}

describe('FeedRowContent — the body-wide target', () => {
  it('stretches the HEADLINE anchor when the headline has an href', () => {
    const html = renderRow('friend_completion', {
      character_id: 4,
      praxis_id: 9,
      task_title: 'Plant a tree',
      task_point_value: 3,
    })
    expect(overlayCount(html)).toBe(1)
    expect(stretchedHref(html)).toBe('/praxis/9')
  })

  it('lifts the actor link above the overlay so it still reaches the profile', () => {
    const html = renderRow('friend_completion', {
      character_id: 4,
      praxis_id: 9,
      task_title: 'Plant a tree',
    })
    // Both actor anchors must beat the overlay. The avatar's lift is the
    // `.feed-avatar-link` class (#1942, see `MaybeLink`);
    // `albescentDriftStopsAtMedia` asserts it computes to `z-index: 1`.
    const actorAnchors = anchorsTo(html, '/characters/4')
    expect(actorAnchors).toHaveLength(2)
    const inline = actorAnchors.filter((tag) => tag.includes(LIFT))
    const byClass = actorAnchors.filter((tag) => tag.includes('feed-avatar-link'))
    expect(inline, "the name's anchor keeps the inline lift").toHaveLength(1)
    expect(byClass, "the avatar's anchor takes it as a class").toHaveLength(1)
    expect(byClass[0], 'and takes it INSTEAD, not as well').not.toContain(LIFT)
    expect(overlayCount(html)).toBe(1)
  })

  it('falls back to the ACTOR anchor where the headline has no href', () => {
    // foe_taunt: no taunt page (ADR-0031), so the taunter's profile.
    const html = renderRow('foe_taunt', {
      from_character_id: 4,
      taunt_id: 'x',
      faction_slug: 'coven',
      trigger_type: 'duel_win',
      from_name: 'Ada',
      to_name: 'Bo',
    })
    expect(overlayCount(html)).toBe(1)
    expect(stretchedHref(html)).toBe('/characters/4')
  })

  it('falls back to the actor where there is no headline at all', () => {
    const html = renderRow('friend_defection', {
      character_id: 7,
      old_faction_slug: 'coven',
      new_faction_slug: 'wow',
    })
    expect(stretchedHref(html)).toBe('/characters/7')
  })

  it('renders a PLAIN body when neither href exists — no dead click zone', () => {
    const html = renderRow('global_task', { task_title: 'Sweep the commons' })
    expect(overlayCount(html)).toBe(0)
    expect(html).not.toContain('cursor:pointer')
  })
})

describe('the two bespoke bodies that were ruled in', () => {
  const collabPayload = {
    praxis_id: 12,
    invite_id: 3,
    task_title: 'Build a shed',
    task_point_value: 5,
    task_level_required: 1,
    inviter_character_id: 4,
  }

  it('points the collab invite at the praxis it is inviting you into', () => {
    const html = renderCompanion(
      <FeedCardCollabInvite item={item('collab_invite', collabPayload)} />,
    )
    expect(overlayCount(html)).toBe(1)
    expect(stretchedHref(html)).toBe('/praxis/12')
  })

  it('keeps Accept and Decline discrete on top of the collab overlay', () => {
    const html = renderCompanion(
      <FeedCardCollabInvite item={item('collab_invite', collabPayload)} />,
    )
    // The buttons aren't links; the row is lifted as a block.
    expect(html).toContain(LIFT)
    expect(html.split(LIFT).length - 1).toBeGreaterThanOrEqual(2)
  })

  it('points the duel challenge at the challenger praxis', () => {
    const html = renderCompanion(
      <FeedCardDuelChallenge
        item={item('duel_challenge', {
          duel_id: 2,
          challenger_praxis_id: 30,
          task_title: 'Run a mile',
          task_point_value: 4,
          challenger_character_id: 4,
        })}
      />,
    )
    expect(overlayCount(html)).toBe(1)
    expect(stretchedHref(html)).toBe('/praxis/30')
  })

  it('renders a plain duel body in the run-up, where there is no praxis yet', () => {
    const html = renderCompanion(
      <FeedCardDuelChallenge
        item={item('duel_challenge', {
          duel_id: 2,
          challenger_praxis_id: null,
          task_title: 'Run a mile',
          task_point_value: 4,
          challenger_character_id: 4,
        })}
      />,
    )
    expect(overlayCount(html)).toBe(0)
    expect(html).not.toContain('/praxis/null')
  })
})

/**
 * THE FEED BODY'S CLICK TARGET (#1893).
 *
 * The seam under test is the RENDERED STRUCTURE of a feed card's body: which
 * anchor carries the stretched overlay, what that anchor points at, and which
 * inner controls are lifted above it. Not the click — the harness is
 * `renderToStaticMarkup`, so there is no DOM, no effect and no event. What it
 * can prove is the whole of the mechanism's static half:
 *
 *   1. The overlay exists on exactly ONE anchor, and that anchor is
 *      `headlineHref ?? actorHref` — never a second element and never a
 *      wrapping <a>, which is what would break tab order and nest anchors.
 *   2. Where NEITHER href exists the overlay is absent entirely: a plain body,
 *      not a dead click zone (ruling §3).
 *   3. Every other link and control in the body carries `z-index: 1`, which is
 *      what keeps it clickable through an overlay painted over the same box.
 *
 * The BAND is not asserted here and cannot be: `FeedChassisBand` and the body
 * are SIBLINGS inside each faction chassis, and the overlay resolves against
 * the body's own `position: relative` root. The band is out of reach by
 * construction rather than by a rule this test could check.
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

/** The stretched pseudo-element, as React serializes it. */
const OVERLAY = 'position:absolute;inset:0'
/** The lift every inner control takes so it stays clickable through it. */
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
 * The href of the anchor the overlay sits inside.
 *
 * The overlay is that anchor's last child and nothing else opens an <a> between
 * them, so the nearest PRECEDING `<a href>` is its parent. Returns null when no
 * overlay was rendered at all — the plain-body case, which is a distinct answer
 * from "an overlay pointing nowhere".
 */
function stretchedHref(html: string): string | null {
  const at = html.indexOf(OVERLAY)
  if (at === -1) return null
  const opens = [...html.slice(0, at).matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)]
  const last = opens[opens.length - 1]
  if (!last) throw new Error('overlay rendered outside any anchor')
  return last[1]
}

/** How many overlays the body drew. Exactly one, or none — never two. */
function overlayCount(html: string): number {
  return html.split(OVERLAY).length - 1
}

/**
 * The opening tags of every anchor pointing at `href`.
 *
 * Read as whole tags rather than with one regex over the markup, because React
 * serializes `style` BEFORE `href` on a react-router `Link` — an assertion that
 * assumed either order would pass or fail on the wrong thing.
 */
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
    // The actor's own anchor and the avatar disc's — both a different
    // destination from the stretched one, so both have to win the hit test over
    // the box they share with it.
    //
    // TWO SPELLINGS OF ONE LIFT (#1942). The name still carries it inline; the
    // AVATAR's anchor takes it as `.feed-avatar-link`, which declares the same
    // three properties in index.css. The move was forced: an inline `z-index`
    // cannot be overridden by a selector, and an integer z-index makes this
    // anchor a stacking context — so the Albescent card could not lift the
    // player's photograph out of its own wash while the number was inline. The
    // hit-test claim is unchanged either way; `albescentDriftStopsAtMedia`
    // asserts the class still computes to `z-index: 1`.
    const actorAnchors = anchorsTo(html, '/characters/4')
    expect(actorAnchors).toHaveLength(2)
    const inline = actorAnchors.filter((tag) => tag.includes(LIFT))
    const byClass = actorAnchors.filter((tag) => tag.includes('feed-avatar-link'))
    expect(inline, "the name's anchor keeps the inline lift").toHaveLength(1)
    expect(byClass, "the avatar's anchor takes it as a class").toHaveLength(1)
    expect(byClass[0], 'and takes it INSTEAD, not as well').not.toContain(LIFT)
    // …and neither of them grew an overlay of its own.
    expect(overlayCount(html)).toBe(1)
  })

  it('falls back to the ACTOR anchor where the headline has no href', () => {
    // foe_taunt: the words are the catalog's (ADR-0031), so there is no taunt
    // page to point at. The taunter's profile is the row's only referent.
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
    // friend_defection draws an action line and nothing else.
    const html = renderRow('friend_defection', {
      character_id: 7,
      old_faction_slug: 'coven',
      new_faction_slug: 'wow',
    })
    expect(stretchedHref(html)).toBe('/characters/7')
  })

  it('renders a PLAIN body when neither href exists — no dead click zone', () => {
    // A global task with no id: nothing to navigate to, and no actor either.
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
    // The button row is lifted as a block — the buttons are not links and must
    // never navigate, so they need to win the hit test over the overlay.
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
    // …and nothing points at `/praxis/null`.
    expect(html).not.toContain('/praxis/null')
  })
})

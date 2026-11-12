/** Feed rows (#376): normalizer slot mapping, and the row's invariant slots. */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import { normalizeFeedItem, FACTION_ROW_TYPES } from '../feed/normalizeFeedItem'
import FeedRowContent from '../feed/FeedRowContent'
import { FeedRowSkinContext, type FeedRowSkin } from '../feed/feedRowSkin'
import type { ActivityFeedItem } from '../../api/activityFeed'
import i18n from '../../i18n'
import { collabCopy } from '../collab/collabCopy'
import { AA_NORMAL, contrastRatio, formatRatio, parseColor, requiredRatio } from '../../utils/contrast'
import { FACTION_RAINBOW_ORDER } from '../../utils/factions'
import { readThemes, resolveVar } from '../../utils/__tests__/cssVars'
import { readIndexCss } from '../../test/indexCss'

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

describe('normalizeFeedItem', () => {
  it('maps a friend completion to actor/action/headline slots', () => {
    const row = normalizeFeedItem(item('friend_completion', { character_id: 3, praxis_id: 7, task_title: 'Reforest', task_point_value: 40 }))!
    expect(row.actor).toBe('Ada')
    expect(row.action).toBe('completed a task')
    expect(row.actorHref).toBe('/characters/3')
    expect(row.headline).toBe('Reforest')
    expect(row.headlineHref).toBe('/praxis/7')
    expect(row.points).toBe(i18n.t('feed:row.points', { points: 40, count: 40 }))
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
    expect(row.headlineHref).toBe('/praxis/12')
    expect(row.points).toBe(i18n.t('feed:row.points', { points: 25, count: 25 }))
    expect(row.badge?.label).toBe('Your Stuff')
    expect(row.actions.map((a) => a.id)).toEqual(['fileYours'])
  })

  // #2284: the row is still news once the viewer filed; only the CTA goes.
  it('drops the Submit-yours CTA once the viewer has filed their part (#2284)', () => {
    const row = normalizeFeedItem(
      item('collaborator_submitted', {
        character_id: 8,
        praxis_id: 12,
        task_title: 'Plant a tree',
        task_point_value: 25,
        viewer_has_submitted: true,
      }),
    )!
    expect(row.actions).toEqual([])
    expect(row.action).toBe('submitted their part of')
    expect(row.headlineHref).toBe('/praxis/12')
  })

  it('keeps the Submit-yours CTA while the viewer still owes their part (#2284)', () => {
    const row = normalizeFeedItem(
      item('collaborator_submitted', {
        character_id: 8,
        praxis_id: 12,
        task_title: 'Plant a tree',
        task_point_value: 25,
        viewer_has_submitted: false,
      }),
    )!
    expect(row.actions.map((a) => a.id)).toEqual(['fileYours'])
    expect(row.actions[0].href).toBe('/praxis/12/edit')
  })

  it('maps a nudge to a row linking into the recipient own editor (#1083)', () => {
    // Sits beside the `awaiting_submission` row, so borrows its badge and /edit link.
    const row = normalizeFeedItem(
      item('nudge', {
        nudge_id: 4,
        praxis_id: 12,
        praxis_type: 'collab',
        from_character_id: 8,
        from_name: 'Ada',
        task_title: 'Plant a tree',
        task_point_value: 25,
      }),
    )!
    expect(row.actor).toBe('Ada')
    expect(row.action).toBe(collabCopy('coven', 'nudgeFeedAction'))
    expect(row.actorHref).toBe('/characters/8')
    expect(row.headline).toBe('Plant a tree')
    expect(row.headlineHref).toBe('/praxis/12/edit')
    expect(row.badge?.label).toBe('Collab')
  })

  it('badges a duel nudge as a duel', () => {
    const row = normalizeFeedItem(
      item('nudge', {
        nudge_id: 5,
        praxis_id: 13,
        // A duel side is type='solo' + a duel_id (ADR-0011).
        praxis_type: 'solo',
        from_character_id: 8,
        task_title: 'Out-walk me',
      }),
    )!
    expect(row.badge?.label).toBe('Duel')
    expect(row.headlineHref).toBe('/praxis/13/edit')
  })

  it('resolves a taunt from the catalog, quotes it, and drops points', () => {
    // ADR-0031. coven/score_overtake has 2 variants; 9 % 2 = 1 -> the second.
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
    // #850. ua/level_up has 2 variants, id 2 -> index 0. `from_name` is the achiever.
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

  // vote_changed_on_mine (#1712): same payload and slots as `vote_on_mine`; the
  // different sentence is the whole feature.

  it('says the vote CHANGED, and shows the points that stand now', () => {
    const payload = { vote_id: 4, value: 5, praxis_id: 9, praxis_title: 'Reforest', task_point_value: 5 }
    const changed = normalizeFeedItem(item('vote_changed_on_mine', payload))!
    const cast = normalizeFeedItem(item('vote_on_mine', payload))!

    expect(changed.action).toBe('changed their vote on your praxis')
    expect(changed.action).not.toBe(cast.action)
    expect({ ...changed, action: null }).toEqual({ ...cast, action: null })
    expect(changed.points).toBe('+5 pts')
    expect(changed.headlineHref).toBe('/praxis/9')
  })

  // #2402: `points_from_votes` is a plain `sum(Vote.value)` added after the
  // multipliers, so one voter's contribution is exactly their own `value`.

  it('prints the stars this voter gave, not the praxis total', () => {
    const row = normalizeFeedItem(
      item('vote_on_mine', {
        vote_id: 4,
        value: 3,
        praxis_id: 9,
        praxis_title: 'Reforest',
        task_point_value: 5,
      }),
    )!
    expect(row.points).toBe('+3 pts')
  })

  it('renders the changed row rather than dropping it', () => {
    // A type missing from FACTION_ROW_TYPES renders as nothing, silently (#1196).
    expect(FACTION_ROW_TYPES.has('vote_changed_on_mine')).toBe(true)
  })

  // comment_mention (#1196)

  it('maps a mention to a quoted excerpt over the praxis it sits on', () => {
    const row = normalizeFeedItem(
      item('comment_mention', {
        comment_id: 11,
        character_id: 8,
        praxis_id: 12,
        task_id: null,
        excerpt: 'the second half is yours @ada',
      }),
    )!
    expect(row.actor).toBe('Ada')
    expect(row.actorHref).toBe('/characters/8')
    expect(row.action).toBe('mentioned you in a comment')
    expect(row.badge?.label).toBe('Your Stuff')
    expect(row.headline).toBe('the second half is yours @ada')
    expect(row.headlineQuoted).toBe(true)
    expect(row.headlineHref).toBe('/praxis/12')
    expect(row.points).toBeNull()
    expect(row.level).toBeNull()
  })

  it('sends a mention on a TASK comment to the task instead', () => {
    // A DB CHECK guarantees exactly one of praxis_id/task_id is set.
    const row = normalizeFeedItem(
      item('comment_mention', {
        comment_id: 12,
        character_id: 8,
        praxis_id: null,
        task_id: 5,
        excerpt: 'thought of you for this one',
      }),
    )!
    expect(row.headlineHref).toBe('/tasks/5')
  })

  it('offers exactly one CTA on a mention, into the page holding the thread', () => {
    // The Snide sheet draws composer + thread CTAs, but `CommentThread` mounts the
    // composer under the list, so both would share one href (cf. #1194).
    const row = normalizeFeedItem(
      item('comment_mention', { comment_id: 11, praxis_id: 12, excerpt: 'hi' }),
    )!
    expect(row.actions.map((action) => action.id)).toEqual(['reply'])
    expect(row.actions[0].href).toBe('/praxis/12')
    expect(row.actions[0].call).toBeUndefined()
  })

  it('builds no mention CTA when the payload names no target', () => {
    const row = normalizeFeedItem(item('comment_mention', { comment_id: 11 }))!
    expect(row.actions).toEqual([])
    expect(row.headlineHref).toBeNull()
  })

  // comment_on_mine (#2159): shares the mention's branch and payload; pins what
  // differs — it is registered, and it speaks its own sentence.

  it('renders the comment-on-mine row rather than dropping it', () => {
    expect(FACTION_ROW_TYPES.has('comment_on_mine')).toBe(true)
  })

  it('says someone commented, not that they named you', () => {
    const row = normalizeFeedItem(
      item('comment_on_mine', {
        comment_id: 21,
        character_id: 8,
        praxis_id: 12,
        task_id: null,
        excerpt: 'the render came out beautifully',
      }),
    )!
    expect(row.action).toBe('commented on your praxis')
    expect(row.action).not.toBe(
      normalizeFeedItem(item('comment_mention', { comment_id: 21, praxis_id: 12, excerpt: 'x' }))!
        .action,
    )
    // Otherwise the mention's row, deliberately.
    expect(row.actorHref).toBe('/characters/8')
    expect(row.badge?.label).toBe('Your Stuff')
    expect(row.headline).toBe('the render came out beautifully')
    expect(row.headlineQuoted).toBe(true)
    expect(row.headlineHref).toBe('/praxis/12')
    expect(row.actions.map((action) => action.id)).toEqual(['reply'])
    expect(row.actions[0].href).toBe('/praxis/12')
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
    expect(html).toContain('href="/praxis/7"')
  })

  // ADR-0039.
  it('gives an na actor the rainbow-ring avatar, a real faction a tinted disc', () => {
    const naRow = normalizeFeedItem({ ...item('friend_completion', { character_id: 3, praxis_id: 7, task_title: 'Reforest', task_point_value: 40 }), context_faction_slug: 'na' })!
    const naHtml = renderToStaticMarkup(<MemoryRouter><FeedRowContent row={naRow} avatarUrl={null} /></MemoryRouter>)
    expect(naHtml).toContain('var(--faction-default-rainbow-conic)')

    const covenRow = normalizeFeedItem(item('friend_completion', { character_id: 3, praxis_id: 7, task_title: 'Reforest', task_point_value: 40 }))!
    const covenHtml = renderToStaticMarkup(<MemoryRouter><FeedRowContent row={covenRow} avatarUrl={null} /></MemoryRouter>)
    expect(covenHtml).not.toContain('var(--faction-default-rainbow-conic)')
  })

  // Actor ink, monogram disc and headline rule must all be cascade lookups, so
  // they follow the dark-theme lift and can be checked against index.css.
  it('paints every faction accent from the cascade, never a JS hex (#1269)', () => {
    const html = renderToStaticMarkup(<MemoryRouter><FeedRowContent row={completionRow('ua')} avatarUrl={null} /></MemoryRouter>)
    expect(html).toContain('var(--faction-ua)')
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  // #983: a border is a scalar and cannot hold the na gradient; a fill can.
  it('draws the headline rule as a filled bar, never a border', () => {
    const row = completionRow('coven')
    const html = renderToStaticMarkup(<MemoryRouter><FeedRowContent row={row} avatarUrl={null} /></MemoryRouter>)
    expect(html).not.toContain('border-left')
    expect(html).toContain('background:var(--faction-coven)')
  })

  it('gives an na headline rule the VERTICAL rainbow, not the horizontal one', () => {
    // A 90deg ramp across a 3px rule is seven stops in three pixels: mud.
    const html = renderToStaticMarkup(<MemoryRouter><FeedRowContent row={completionRow('na')} avatarUrl={null} /></MemoryRouter>)
    expect(html).toContain('--faction-default-rainbow-vertical')
  })

  it('hands albescent exactly what na gets, rule included (#783)', () => {
    const naHtml = renderToStaticMarkup(<MemoryRouter><FeedRowContent row={completionRow('na')} avatarUrl={null} /></MemoryRouter>)
    const albHtml = renderToStaticMarkup(<MemoryRouter><FeedRowContent row={completionRow('albescent')} avatarUrl={null} /></MemoryRouter>)
    expect(albHtml).toBe(naHtml)
  })

  // A taunt has no page to link to (ADR-0031); a mention does.
  it('links a quoted excerpt to its target, and leaves a taunt inert', () => {
    const mention = normalizeFeedItem(
      item('comment_mention', {
        comment_id: 11,
        character_id: 8,
        praxis_id: 12,
        excerpt: 'over to you',
      }),
    )!
    const mentionHtml = renderToStaticMarkup(
      <MemoryRouter><FeedRowContent row={mention} avatarUrl={null} /></MemoryRouter>,
    )
    expect(mentionHtml).toContain('“over to you”')
    expect(mentionHtml).toContain('href="/praxis/12"')
    expect(mentionHtml).toContain('Reply')

    const taunt = normalizeFeedItem(
      item('foe_taunt', {
        from_character_id: 9,
        taunt_id: 2,
        faction_slug: 'coven',
        trigger_type: 'level_up',
        from_name: 'Ada',
        to_name: 'Bo',
      }),
    )!
    const tauntHtml = renderToStaticMarkup(
      <MemoryRouter><FeedRowContent row={taunt} avatarUrl={null} /></MemoryRouter>,
    )
    expect(tauntHtml).toContain('href="/characters/9"')
    expect(tauntHtml, 'the quote is a paragraph, not a link').toContain('<p class="font-body"')
    for (const route of ['href="/praxis', 'href="/tasks']) {
      expect(tauntHtml, `${route} must not appear on a taunt`).not.toContain(route)
    }
  })

  // ADR-0039: a name is single-ink text; no ramp stop is legible as one (#649).
  // Unskinned rows use a neutral text tier (#2108): several faction hues fail
  // as an 18px/700 name on the neutral feed ground.
  it('paints an na actor name from a text tier, never the ramp', () => {
    const html = renderToStaticMarkup(<MemoryRouter><FeedRowContent row={completionRow('na')} avatarUrl={null} /></MemoryRouter>)
    expect(html).toContain('color:var(--color-text-primary)')
    expect(html).not.toContain('color:var(--faction-default)')
    expect(html).not.toContain('background-clip:text')
  })
})

/** Chassis → body seam (#1252). An empty skin must be inert: most chassis publish none. */
describe('FeedRowContent skin seam', () => {
  const skinned = (skin: FeedRowSkin, slug = 'coven') =>
    renderToStaticMarkup(
      <MemoryRouter>
        <FeedRowSkinContext.Provider value={skin}>
          <FeedRowContent row={completionRow(slug)} avatarUrl={null} />
        </FeedRowSkinContext.Provider>
      </MemoryRouter>,
    )
  const bare = (slug: string) =>
    renderToStaticMarkup(
      <MemoryRouter>
        <FeedRowContent row={completionRow(slug)} avatarUrl={null} />
      </MemoryRouter>,
    )

  it('renders identically inside an empty provider and outside any provider', () => {
    for (const slug of ['coven', 'wow', 'singularity', 'na', 'albescent']) {
      expect(skinned({}, slug), slug).toBe(bare(slug))
    }
  })

  it('lets a chassis repoint the actor ink and the monogram glyph', () => {
    const html = skinned({ ink: { actor: 'var(--faction-coven-card-text)', monogram: 'var(--faction-coven-ward-card)' } })
    expect(html).toContain('color:var(--faction-coven-card-text)')
    expect(html).toContain('color:var(--faction-coven-ward-card)')
    // Only the named fields: the headline rule is a fill and stays the faction's (ADR-0039).
    expect(html).toContain('background:var(--faction-coven)')
  })

  it('lets a chassis draw the points figure as an object, with the row values', () => {
    const html = skinned({
      points: (figure) => <b data-plaque>{`${figure.points}/${figure.level}`}</b>,
    })
    expect(html).toContain(`<b data-plaque="true">${i18n.t('feed:row.points', { points: 40, count: 40 })}/null</b>`)
    // The shared eyebrow is replaced, never printed twice.
    expect(html).not.toContain('class="eyebrow"')
  })

  it('never calls the points renderer for a row with no figure', () => {
    const taunt = normalizeFeedItem(
      item('foe_taunt', { from_character_id: 9, taunt_id: 2, faction_slug: 'coven', trigger_type: 'level_up', from_name: 'Ada', to_name: 'Bo' }),
    )!
    let calls = 0
    renderToStaticMarkup(
      <MemoryRouter>
        <FeedRowSkinContext.Provider value={{ points: () => { calls += 1; return null } }}>
          <FeedRowContent row={taunt} avatarUrl={null} />
        </FeedRowSkinContext.Provider>
      </MemoryRouter>,
    )
    expect(calls).toBe(0)
  })
})

/**
 * The monogram glyph ink, measured as the pairing the row actually emits (#1252),
 * not just whether a token clears AA on its documented surface.
 */
describe('the monogram disc is inked with the faction pair, not a global neutral', () => {
  const THEMES = readThemes(readIndexCss())
  // #2815: the slugs that have a fill are exactly the hue wheel; albescent (#783)
  // and na paint no disc.
  const FILL_SLUGS = FACTION_RAINBOW_ORDER

  it.each(FILL_SLUGS)('%s: the emitted glyph ink clears AA on the disc fill in both themes', (slug) => {
    const html = renderToStaticMarkup(<MemoryRouter><FeedRowContent row={completionRow(slug)} avatarUrl={null} /></MemoryRouter>)
    // Scoped to the disc: `FeedBadge` keeps the global neutral, which its
    // theme-invariant fills all clear (friend 9.11, collab 5.02, duel 4.83:1).
    const disc = html.match(/<div style="width:28px[^"]*"/)?.[0] ?? ''
    expect(disc, `${slug} monogram disc`).toContain(`color:var(--faction-${slug}-on-fill)`)
    expect(disc).not.toContain('var(--color-text-on-accent)')

    for (const theme of ['light', 'dark'] as const) {
      const glyph = parseColor(resolveVar(`--faction-${slug}-on-fill`, theme, THEMES) ?? '')
      const fill = parseColor(resolveVar(`--faction-${slug}`, theme, THEMES) ?? '')
      expect(glyph, `${slug} on-fill (${theme})`).not.toBeNull()
      expect(fill, `${slug} fill (${theme})`).not.toBeNull()
      const ratio = contrastRatio(glyph!, fill!)
      expect(ratio, `${slug} monogram on its disc (${theme}) = ${formatRatio(ratio)}`).toBeGreaterThanOrEqual(AA_NORMAL)
    }
  })

  // WORLD_ZERO_STYLE §3: check the size before the threshold.
  it('measures the glyph at the normal-text floor', () => {
    expect(requiredRatio(12, 700)).toBe(AA_NORMAL)
  })
})

/** A friend-completion row (actor + headline + points) in a given faction. */
function completionRow(slug: string) {
  return normalizeFeedItem({
    ...item('friend_completion', { character_id: 3, praxis_id: 7, task_title: 'Reforest', task_point_value: 40 }),
    context_faction_slug: slug,
  })!
}

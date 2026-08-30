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
    // `"{type}:{source row PK}"` (#1193) — the archive's only handle on an item.
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

  // #2284 — the CTA was gated only on a praxis id existing, so it appeared to
  // people who had already filed and led them to an editor that is closed. The
  // ROW is still correct news; only the action is wrong, so these two assert
  // opposite CTAs on an otherwise identical payload.
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
    // The news survives the CTA it no longer carries.
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
    // The nudge lands BESIDE the `awaiting_submission` row for the same praxis,
    // so it borrows that row's badge and its /edit link — the reminder and the
    // obligation are two cards about one thing.
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
    // Copy comes through collabCopy (shared default + faction overrides), not
    // the `feed` catalog — it is the composer's own vocabulary.
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
        // A duel side is type='solo' + a duel_id (ADR-0011), so anything that is
        // not a collab reads as the duel side it is.
        praxis_type: 'solo',
        from_character_id: 8,
        task_title: 'Out-walk me',
      }),
    )!
    expect(row.badge?.label).toBe('Duel')
    expect(row.headlineHref).toBe('/praxis/13/edit')
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

  // ── vote_changed_on_mine (#1712) ───────────────────────────────────────────
  //
  // Same payload as `vote_on_mine`, same slots, one different sentence — and
  // that sentence is the feature. A re-rate used to reach the author as the
  // ORIGINAL card quietly restating a new number, so a changed row that reads
  // "voted on your praxis" beside `+25 pts` is the bug with extra steps.

  it('says the vote CHANGED, and shows the points that stand now', () => {
    const payload = { vote_id: 4, value: 5, praxis_id: 9, praxis_title: 'Reforest', task_point_value: 5 }
    const changed = normalizeFeedItem(item('vote_changed_on_mine', payload))!
    const cast = normalizeFeedItem(item('vote_on_mine', payload))!

    expect(changed.action).toBe('changed their vote on your praxis')
    expect(changed.action).not.toBe(cast.action)
    // Everything else is the vote row verbatim — one sentence is the whole delta.
    expect({ ...changed, action: null }).toEqual({ ...cast, action: null })
    expect(changed.points).toBe('+5 pts')
    expect(changed.headlineHref).toBe('/praxis/9')
  })

  // ── the number is the DELTA (#2402) ──────────────────────────────────────
  //
  // A row read `+19 pts` under "voted on your praxis" when the voter gave three
  // stars — 19 was the praxis's whole score. `points_from_votes` is a plain
  // `sum(Vote.value)` added AFTER the multipliers, so one voter's contribution
  // is their own `value`, exactly: no dependence on the other votes, the
  // author's faction, the task's points, a metatask or a duel.

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
    // A type missing from FACTION_ROW_TYPES normalizes to null and the router
    // renders NOTHING — a blank row, not a loud failure. That is how
    // `comment_mention` shipped broken (below), so the new type asserts it too.
    expect(FACTION_ROW_TYPES.has('vote_changed_on_mine')).toBe(true)
  })

  // ── comment_mention (#1196) ────────────────────────────────────────────────
  //
  // The type shipped with a correct query, a complete payload and NO case here,
  // so the normalizer returned null, `FeedCardRouter` fell through to `return
  // null`, and every @mention anyone ever received rendered as nothing at all.

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
    // News about you, not a request of you — nothing is being asked.
    expect(row.badge?.label).toBe('Your Stuff')
    expect(row.headline).toBe('the second half is yours @ada')
    // Speech, so it is quoted like a taunt rather than titled like a task.
    expect(row.headlineQuoted).toBe(true)
    expect(row.headlineHref).toBe('/praxis/12')
    expect(row.points).toBeNull()
    expect(row.level).toBeNull()
  })

  it('sends a mention on a TASK comment to the task instead', () => {
    // Exactly one of the two ids is ever set — `num_nonnulls(praxis_id, task_id)
    // = 1` is a DB CHECK — so reading them in order cannot pick the wrong target.
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
    // The Snide sheet draws two — "open the composer" and "open the thread" — and
    // in this app those are the SAME navigation: `CommentThread` mounts the
    // composer directly under the list, and no route, hash or query parameter
    // opens one without the other. Two buttons with identical hrefs is not two
    // affordances, so the quoted excerpt opens the thread and this is the
    // invitation to answer it. Same ground on which #1194 struck "Nudge back".
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

  // ── comment_on_mine (#2159) ───────────────────────────────────────────────
  //
  // Someone commented on a praxis that is yours. It shares the mention's branch
  // and its payload, so the tests that matter are the two things that are NOT
  // shared: it must be a registered row type at all (the #1196 failure mode is
  // silent — an unregistered type renders as nothing), and it must not speak the
  // mention's sentence.

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
    // Everything else is the mention's row, deliberately: same slots, same
    // quoted excerpt, same single CTA into the page holding the thread.
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

  // ADR-0039: an unaffiliated (na) actor's monogram avatar is the rainbow ring,
  // not the flat grey a scalar accent would hand it. Real factions keep their
  // tinted disc.
  it('gives an na actor the rainbow-ring avatar, a real faction a tinted disc', () => {
    const naRow = normalizeFeedItem({ ...item('friend_completion', { character_id: 3, praxis_id: 7, task_title: 'Reforest', task_point_value: 40 }), context_faction_slug: 'na' })!
    const naHtml = renderToStaticMarkup(<MemoryRouter><FeedRowContent row={naRow} avatarUrl={null} /></MemoryRouter>)
    expect(naHtml).toContain('var(--faction-default-rainbow-conic)')

    const covenRow = normalizeFeedItem(item('friend_completion', { character_id: 3, praxis_id: 7, task_title: 'Reforest', task_point_value: 40 }))!
    const covenHtml = renderToStaticMarkup(<MemoryRouter><FeedRowContent row={covenRow} avatarUrl={null} /></MemoryRouter>)
    expect(covenHtml).not.toContain('var(--faction-default-rainbow-conic)')
  })

  // #1269: the row's THREE faction paints — actor ink, monogram disc, headline
  // rule — must every one of them be a cascade lookup. The disc was the holdout:
  // it interpolated a JS hex (`${accent}, ${accent}88`), so it could neither
  // follow the [data-theme="dark"] lift nor be checked against index.css. UA is
  // the slug that proved it — its JS literal was #c2541f, the na spectrum's
  // orange, while --faction-ua is #c24a18.
  it('paints every faction accent from the cascade, never a JS hex (#1269)', () => {
    const html = renderToStaticMarkup(<MemoryRouter><FeedRowContent row={completionRow('ua')} avatarUrl={null} /></MemoryRouter>)
    expect(html).toContain('var(--faction-ua)')
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  // #983: the headline rule read grey for `na` only because it was written as a
  // `border`, which is a scalar and so can never hold a gradient. Drawn as a
  // filled bar it is a fill, and ADR-0039 gives it the spectrum unamended.
  it('draws the headline rule as a filled bar, never a border', () => {
    const row = completionRow('coven')
    const html = renderToStaticMarkup(<MemoryRouter><FeedRowContent row={row} avatarUrl={null} /></MemoryRouter>)
    expect(html).not.toContain('border-left')
    expect(html).toContain('background:var(--faction-coven)')
  })

  it('gives an na headline rule the VERTICAL rainbow, not the horizontal one', () => {
    // The cut matters as much as the spectrum: the bar's 90deg ramp across a 3px
    // rule is seven stops in three pixels, i.e. mud.
    const html = renderToStaticMarkup(<MemoryRouter><FeedRowContent row={completionRow('na')} avatarUrl={null} /></MemoryRouter>)
    expect(html).toContain('--faction-default-rainbow-vertical')
  })

  it('hands albescent exactly what na gets, rule included (#783)', () => {
    const naHtml = renderToStaticMarkup(<MemoryRouter><FeedRowContent row={completionRow('na')} avatarUrl={null} /></MemoryRouter>)
    const albHtml = renderToStaticMarkup(<MemoryRouter><FeedRowContent row={completionRow('albescent')} avatarUrl={null} /></MemoryRouter>)
    expect(albHtml).toBe(naHtml)
  })

  // A quoted headline used to be unconditionally inert, which was right while
  // `foe_taunt` was the only quoted row (ADR-0031: no taunt page to link to) and
  // wrong the moment a second one arrived carrying a target — the mention's href
  // would have been silently dropped.
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
    // Quoted (curly quotes from the catalog) AND clickable.
    expect(mentionHtml).toContain('“over to you”')
    expect(mentionHtml).toContain('href="/praxis/12"')
    // The CTA is the second route to the same page, not a second destination.
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
    // Its only destination is the actor — the quote itself goes nowhere.
    expect(tauntHtml).toContain('href="/characters/9"')
    expect(tauntHtml, 'the quote is a paragraph, not a link').toContain('<p class="font-body"')
    for (const route of ['href="/praxis', 'href="/tasks']) {
      expect(tauntHtml, `${route} must not appear on a taunt`).not.toContain(route)
    }
  })

  // The other half of ADR-0039, and the half that looks like a bug: an actor's
  // NAME is single-ink text, no stop of a seven-stop ramp is legible as one
  // (#649), so an `na` name is never painted from the ramp.
  //
  // It used to read `--faction-default`, the unaffiliated grey, and #2108 moved
  // every unskinned row onto a NEUTRAL TEXT TIER instead: the same fallback fired
  // for all nine slugs, and on the neutral feed ground three of the eight hues
  // measured 2.36:1–3.10:1 as an 18px/700 name. `--faction-default` itself was
  // the one that happened to pass (5.21:1) — which is exactly why the defect
  // survived a test written around `na`.
  it('paints an na actor name from a text tier, never the ramp', () => {
    const html = renderToStaticMarkup(<MemoryRouter><FeedRowContent row={completionRow('na')} avatarUrl={null} /></MemoryRouter>)
    expect(html).toContain('color:var(--color-text-primary)')
    expect(html).not.toContain('color:var(--faction-default)')
    expect(html).not.toContain('background-clip:text')
  })
})

/**
 * THE CHASSIS → BODY SEAM (#1252).
 *
 * Two claims, and the first is the one worth pinning hardest: a frame that
 * publishes nothing must render byte-for-byte what the body renders outside any
 * provider. Eight chassis publish nothing today, so a seam that is not inert is
 * a silent redress of the whole feed.
 */
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
    // …and only the fields it named: the headline rule is a FILL and stays the
    // faction's own, which is ADR-0039's half of this row.
    expect(html).toContain('background:var(--faction-coven)')
  })

  it('lets a chassis draw the points figure as an object, with the row values', () => {
    const html = skinned({
      points: (figure) => <b data-plaque>{`${figure.points}/${figure.level}`}</b>,
    })
    expect(html).toContain(`<b data-plaque="true">${i18n.t('feed:row.points', { points: 40, count: 40 })}/null</b>`)
    // The shared eyebrow line is REPLACED, never printed twice — drawing the
    // figure beside the skin's own is the duplication the seam exists to avoid.
    expect(html).not.toContain('class="eyebrow"')
  })

  it('never calls the points renderer for a row with no figure', () => {
    // The gate is shared, so a skin gets no empty plaque to guard against.
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
 * The monogram glyph's ink, measured as the PAIRING the row actually emits
 * (#1252). `factionContrast.test.ts` can only ask whether a token clears AA on
 * the surface its documentation names; this asks which token the component put
 * on the disc, and measures that one.
 *
 * The disc read the global `--color-text-on-accent` (#ffffff) until #1252 —
 * white being a statement about the app's accent buttons, not about legibility
 * on a faction hue. It failed 4.5:1 on twelve of these fourteen pairs.
 */
describe('the monogram disc is inked with the faction pair, not a global neutral', () => {
  const THEMES = readThemes(readIndexCss())
  // Derived, not typed (#2815): the pairing under test is `--faction-<slug>`
  // against its `-on-fill`, so the population is exactly the slugs that HAVE a
  // fill. `FACTION_RAINBOW_ORDER` is that set — it is the hue wheel, so a slug
  // is in it iff index.css declares a `--faction-<slug>` colour. The two kits
  // outside it are outside it for that reason: `albescent` ships no
  // `--faction-albescent-*` block at all (#783 — a bar built from the wheel
  // would leak the secret society), and `na` is a state, not a faction, so it
  // paints no monogram disc. A tenth kit with a hue joins this loop by existing.
  const FILL_SLUGS = FACTION_RAINBOW_ORDER

  it.each(FILL_SLUGS)('%s: the emitted glyph ink clears AA on the disc fill in both themes', (slug) => {
    const html = renderToStaticMarkup(<MemoryRouter><FeedRowContent row={completionRow(slug)} avatarUrl={null} /></MemoryRouter>)
    // Scoped to the disc's own element: `FeedBadge` paints the SAME global
    // neutral on its own fills, which is a different pairing and #1252 does not
    // touch it. Measured, because "the same token must be wrong there too" is a
    // guess: the badge fills are theme-invariant and all three clear white —
    // `--badge-friend` 9.11:1, `--badge-collab` 5.02:1, `--badge-duel` 4.83:1.
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

  // The 12px bold glyph owes the 4.5:1 normal floor, not the 3:1 large one —
  // "check the size before the threshold" (WORLD_ZERO_STYLE §3).
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

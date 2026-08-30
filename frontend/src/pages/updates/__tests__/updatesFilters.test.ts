/**
 * The Updates filter axes (#1421, epic #1419) — the pure half of `useUpdates`.
 *
 * The hook self-fetches and the harness has no DOM, so what is pinned here is
 * everything a filter change is a function of: the URL round-trip, which empty
 * state a given filter tuple selects, and which type rows the facet offers.
 *
 * Replaces `archivedTab.test.ts`, whose subject — a seven-way single-select tab
 * set with Archived as its seventh member — no longer exists. The two
 * guarantees that outlived it are kept: Archived still draws no count badge,
 * and the deep links already in the wild still resolve.
 */
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import {
  CLEARED_FILTERS,
  RELATIONSHIPS,
  RELATIONSHIP_DEFAULT,
  RELATIONSHIP_LABEL_KEY,
  FEED_TYPE_LABEL_KEY,
  appliedFilterCount,
  clearedUpdatesParams,
  feedTypeLabel,
  nextUpdatesParams,
  readUpdatesFilters,
  selectUpdatesEmptyState,
  toFeedQuery,
  typeFacet,
  typeFacetOptions,
  type UpdatesFilters,
} from '../updatesFilters'
import { REQUESTS_QUEUE_ANCHOR, REQUESTS_QUEUE_LINK } from '../requestsQueueAnchor'
import feedCatalog from '../../../locales/en/feed.json'

const params = (search: string) => new URLSearchParams(search)

describe('reading the URL', () => {
  it('a bare /updates is the unfiltered feed', () => {
    expect(readUpdatesFilters(params(''))).toEqual(CLEARED_FILTERS)
  })

  it('reads all three axes at once', () => {
    expect(
      readUpdatesFilters(params('?filter=friends&types=nudge&types=foe_taunt')),
    ).toEqual({
      relationship: 'friends',
      archived: false,
      types: ['nudge', 'foe_taunt'],
    })
  })

  it('degrades an unknown relationship to the default rather than erroring', () => {
    // A read projection: a hand-edited or stale link must show something.
    expect(readUpdatesFilters(params('?filter=banana')).relationship).toBe('all')
  })

  it('drops blank repeated type params', () => {
    expect(readUpdatesFilters(params('?types=&types=nudge')).types).toEqual(['nudge'])
  })
})

describe('the seven-tab era deep links still resolve', () => {
  it('?filter=archived — the old seventh tab — reads as the archive', () => {
    const filters = readUpdatesFilters(params('?filter=archived'))
    expect(filters.archived).toBe(true)
    expect(filters.relationship).toBe(RELATIONSHIP_DEFAULT)
  })

  it('?filter=requests degrades to the default feed, because the tab is gone', () => {
    // ADR-0070 deletes the Requests tab: it was byte-for-byte the queue. The
    // bookmark must not 404, it must land somewhere sensible.
    expect(readUpdatesFilters(params('?filter=requests'))).toEqual(CLEARED_FILTERS)
  })

  it('the five surviving relationship tokens are unchanged', () => {
    for (const relationship of RELATIONSHIPS) {
      expect(
        readUpdatesFilters(params(`?filter=${relationship}`)).relationship,
        relationship,
      ).toBe(relationship)
    }
  })

  it('every in-app requests link routes through one agreed anchor', () => {
    expect(REQUESTS_QUEUE_LINK).toBe(`/updates#${REQUESTS_QUEUE_ANCHOR}`)
  })
})

describe('URL round-trip', () => {
  const cases: UpdatesFilters[] = [
    CLEARED_FILTERS,
    { relationship: 'foes', archived: false, types: [] },
    { relationship: 'your_stuff', archived: false, types: ['nudge'] },
    { relationship: 'all', archived: true, types: ['collab_invite', 'duel_challenge'] },
    { relationship: 'global', archived: false, types: ['vote_on_mine', 'era_announcement'] },
  ]

  for (const filters of cases) {
    it(`serialises and parses back identically: ${JSON.stringify(filters)}`, () => {
      const written = nextUpdatesParams(params(''), filters)
      expect(readUpdatesFilters(written)).toEqual(filters)
    })
  }

  it('keeps a clean address for an unfiltered feed', () => {
    // Values meaning "not filtering" are removed rather than spelled out.
    expect(nextUpdatesParams(params(''), CLEARED_FILTERS).toString()).toBe('')
  })

  it('writes the type axis as a repeated key, matching the wire shape', () => {
    const written = nextUpdatesParams(params(''), { types: ['nudge', 'global_task'] })
    expect(written.toString()).toBe('types=nudge&types=global_task')
  })

  it('carries params it does not own straight through', () => {
    const written = nextUpdatesParams(params('?highlight=7'), { relationship: 'foes' })
    expect(written.get('highlight')).toBe('7')
  })

  it('never mutates the params it was handed', () => {
    const previous = params('?filter=foes')
    nextUpdatesParams(previous, { relationship: 'friends' })
    expect(previous.get('filter')).toBe('foes')
  })

  it('rewrites a legacy ?filter=archived link into the state axis on first touch', () => {
    const written = nextUpdatesParams(params('?filter=archived'), { types: ['nudge'] })
    expect(written.get('state')).toBe('archived')
    expect(written.get('filter')).toBeNull()
  })
})

describe('archived crosses with nothing', () => {
  // The backend's `_visible_types` returns the whole `all` set whenever
  // archived=true and ignores `filter` completely — a player looking for
  // something they put away should not have to remember which tab they put it
  // away from. So a relationship cannot survive alongside it, and the bar must
  // not draw a chip for an axis the server is not applying.
  it('normalises a hand-edited ?filter=friends&state=archived on read', () => {
    const filters = readUpdatesFilters(params('?filter=friends&state=archived'))
    expect(filters).toEqual({ relationship: 'all', archived: true, types: [] })
  })

  it('drops the relationship on write too', () => {
    const written = nextUpdatesParams(params('?filter=friends'), { archived: true })
    expect(written.get('filter')).toBeNull()
    expect(written.get('state')).toBe('archived')
  })

  it('sends the request the archive actually answers', () => {
    expect(toFeedQuery({ relationship: 'all', archived: true, types: ['nudge'] })).toEqual({
      filter: 'all',
      archived: true,
      types: ['nudge'],
    })
  })

  it('sends no type constraint at all for an empty selection', () => {
    // An empty multi-select can never mean "match nothing".
    expect(toFeedQuery(CLEARED_FILTERS).types).toBeUndefined()
  })
})

describe('clear all filters', () => {
  it('resets every axis, the state segment included', () => {
    const cleared = clearedUpdatesParams(params('?filter=foes&state=archived&types=nudge'))
    expect(readUpdatesFilters(cleared)).toEqual(CLEARED_FILTERS)
  })

  it('leaves params this page does not own alone', () => {
    expect(clearedUpdatesParams(params('?highlight=7&types=nudge')).get('highlight')).toBe('7')
  })
})

describe('which empty state a filter tuple selects', () => {
  it('an untouched feed gets the register state, with nothing to clear', () => {
    expect(selectUpdatesEmptyState(CLEARED_FILTERS)).toBe('register')
  })

  it('the ARCHIVE with no filters is still the register state', () => {
    // The state segment is not a narrowing filter: counting it would make "The
    // archive is empty" unreachable, and every empty archive would instead
    // claim to be a filtering accident and offer to clear filters nobody set.
    expect(selectUpdatesEmptyState({ ...CLEARED_FILTERS, archived: true })).toBe('register')
    expect(appliedFilterCount({ ...CLEARED_FILTERS, archived: true })).toBe(0)
  })

  it('a type selection makes "filtered to nothing" reachable on any tab', () => {
    expect(
      selectUpdatesEmptyState({ ...CLEARED_FILTERS, types: ['nudge'] }),
    ).toBe('filtered')
  })

  it('a non-default relationship counts as narrowing', () => {
    expect(selectUpdatesEmptyState({ ...CLEARED_FILTERS, relationship: 'foes' })).toBe(
      'filtered',
    )
    expect(
      appliedFilterCount({ relationship: 'foes', archived: true, types: ['a', 'b'] }),
    ).toBe(3)
  })

  it('never claims "caught up" — the feed has no personal rail to check it against', () => {
    for (const types of [[], ['nudge'], ['nudge', 'foe_taunt']]) {
      expect(selectUpdatesEmptyState({ ...CLEARED_FILTERS, types })).not.toBe('caughtUp')
    }
  })
})

describe('the type facet', () => {
  it('hides zero-count rows', () => {
    const options = typeFacetOptions({ nudge: 3, foe_taunt: 0, global_task: 1 }, [])
    expect(options.map((option) => option.value)).toEqual(['nudge', 'global_task'])
  })

  it('drops the four request types from the Inbox without special-casing them', () => {
    // ADR-0070 keeps an unanswered obligation out of the live stream, so the
    // backend simply reports 0 for them there and they fall off by themselves.
    const inbox = { vote_on_mine: 2, collab_invite: 0, duel_challenge: 0, awaiting_submission: 0, invitation_letter: 0 }
    expect(typeFacetOptions(inbox, []).map((option) => option.value)).toEqual(['vote_on_mine'])
  })

  it('brings them back on Archived, where they do have counts', () => {
    const archive = { collab_invite: 2, duel_challenge: 1 }
    expect(typeFacetOptions(archive, []).map((option) => option.value)).toEqual([
      'collab_invite',
      'duel_challenge',
    ])
  })

  it('keeps a SELECTED row at zero, so it can be un-ticked', () => {
    // Otherwise a deep link like ?types=nudge onto a view with no nudges leaves
    // an un-removable filter — and `deriveChips` reads its label off this list,
    // so the chip would print the raw slug.
    const options = typeFacetOptions({ vote_on_mine: 2 }, ['nudge'])
    expect(options.map((option) => option.value)).toEqual(['nudge', 'vote_on_mine'])
    expect(options[0].count).toBe(0)
    expect(options[0].label).not.toBe('nudge')
  })

  it('offers nothing at all on a wiped board (#1567)', () => {
    // Every count is zero, so every row drops off — and `OptionPicker` renders
    // no trigger for an option-less facet rather than opening an empty sheet.
    expect(typeFacetOptions({}, [])).toEqual([])
    expect(typeFacet({}, [], () => {}).options).toHaveLength(0)
  })

  it('but a deep-linked selection keeps the facet non-empty, so it still draws', () => {
    expect(typeFacet({}, ['nudge'], () => {}).options).toHaveLength(1)
  })

  it('sorts selected rows to the top', () => {
    const options = typeFacetOptions({ vote_on_mine: 2, nudge: 1, global_task: 4 }, ['global_task'])
    expect(options.map((option) => option.value)).toEqual([
      'global_task',
      'vote_on_mine',
      'nudge',
    ])
  })

  it('carries each row count through', () => {
    expect(typeFacetOptions({ nudge: 7 }, [])[0].count).toBe(7)
  })

  it('still offers a type the label map has never heard of', () => {
    const options = typeFacetOptions({ some_new_type: 2 }, [])
    expect(options.map((option) => option.value)).toEqual(['some_new_type'])
    expect(options[0].label).toBe('some_new_type')
  })

  it('is labelled Type, not Kicker', () => {
    // A kicker is a typography term for the eyebrow above a headline; nobody
    // filtering their notifications is looking for one (epic decision 5).
    expect(typeFacet({}, [], () => {}).label).toBe('Type')
  })

  it('covers all seventeen feed types', () => {
    expect(Object.keys(FEED_TYPE_LABEL_KEY)).toHaveLength(17)
  })

  it('gives the two comment types DISTINCT labels', () => {
    // They share a payload and a row branch, but as two checkbox rows reading
    // "Mention" twice they would be unfilterable — the same defect the two
    // completion types have their own assertion for, just below.
    expect(feedTypeLabel('comment_mention')).not.toBe(feedTypeLabel('comment_on_mine'))
  })

  it('gives the two completion types DISTINCT labels', () => {
    // They share one kicker ("Task completed"), which is fine above a card that
    // names the actor and useless as two identical checkbox rows.
    expect(feedTypeLabel('friend_completion')).not.toBe(feedTypeLabel('foe_completion'))
  })

  it('resolves every type label to real copy, never a raw key', () => {
    for (const type of Object.keys(FEED_TYPE_LABEL_KEY)) {
      const label = feedTypeLabel(type)
      expect(label, type).not.toContain('feed:')
      expect(label, type).not.toBe(type)
    }
  })
})

describe('the relationship rail', () => {
  it('is five segments, in rail order', () => {
    expect(RELATIONSHIPS).toEqual(['all', 'your_stuff', 'friends', 'foes', 'global'])
  })

  it('has a label key for every segment', () => {
    expect(Object.keys(RELATIONSHIP_LABEL_KEY).sort()).toEqual([...RELATIONSHIPS].sort())
  })

  it('stays inside the measured width budget', () => {
    // `filterState.ts` measured this rail at exactly 30 characters — 261px
    // desktop, 225px phone, against a 240px content box at a 320px viewport.
    // `.filter-bar` is overflow:hidden and a segment never shrinks below its
    // label, so the failure mode past the ceiling is silent clipping. Asserted
    // against the shipped copy rather than the keys, because it is the STRINGS
    // that clip.
    const width = Object.values(feedCatalog.filter.relationship)
      .map((label) => label.length)
      .reduce((sum, length) => sum + length, 0)
    expect(width).toBeLessThanOrEqual(32)
  })

  it('draws no count badge on the state segment', () => {
    // Preserved from the seven-tab era: `FeedCounts` carries no archived count,
    // and inventing one costs a second fifteen-source fan-out (decision 22).
    // The state rail is a rail, and a rail has no count slot at all — this is
    // the assertion that notices if someone gives it one.
    expect(Object.keys(feedCatalog.filter.state)).toEqual(['inbox', 'archived'])
  })
})

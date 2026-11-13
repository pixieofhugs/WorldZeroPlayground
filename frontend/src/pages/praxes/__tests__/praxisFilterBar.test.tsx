/**
 * #1366: the feed renders ONE FilterBar on both form factors, wired to the URL.
 * `useSearchParams` is read during render, so a `MemoryRouter` entry drives it.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'

const mocks = vi.hoisted(() => ({
  formFactor: 'desktop' as 'mobile' | 'desktop',
  user: null as { id: number; can_vote?: boolean } | null,
}))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))
vi.mock('../../../api/praxis', () => ({
  listPraxes: async () => [],
}))
vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user, loading: false, refetch: async () => {} }),
}))

import Praxes from '../../Praxes'
import PraxisFeedEmpty from '../PraxisFeedEmpty'

const SORT_NEWEST = i18n.t('common:filters.bar.sort.newest')
const SORT_MOST_VOTED = i18n.t('common:filters.bar.sort.mostVoted')
const ERA_THIS = i18n.t('common:filters.bar.era.current')
const ERA_ALL = i18n.t('common:filters.bar.era.all')
const FILTERING_BY = i18n.t('common:filters.bar.filteringBy')
const NEEDS_MY_VOTE = i18n.t('praxis:listPage.filter.needsMyVote')
// Literal: the key is deleted (#1368) and `t()` would return the key string.
const TYPE_LABEL = 'type:'
const SEARCH_LABEL = i18n.t('praxis:listPage.filter.searchLabel')
const COUNT = i18n.t('praxis:listPage.count', { count: 0 })

function markup(entry: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[entry]}>
      <Praxes />
    </MemoryRouter>,
  )
}

const text = (entry: string) => markup(entry).replace(/<[^>]*>/g, '')

describe.each(['desktop', 'mobile'] as const)('%s praxis feed', (formFactor) => {
  it('mounts one filter bar — the same one on both form factors', () => {
    mocks.formFactor = formFactor
    mocks.user = { id: 1 }
    const out = markup('/praxis')
    expect(out.match(/class="filter-bar"/g)).toHaveLength(1)
    expect(out.match(/aria-label="[^"]*"/g)?.join(' ')).toContain(SEARCH_LABEL)
    expect(out).toContain('filter-bar__search')
  })

  it('has no type rail — deleted on purpose (#1361 ruling 2)', () => {
    mocks.formFactor = formFactor
    expect(text('/praxis')).not.toContain(TYPE_LABEL)
  })
})

describe('the era rail', () => {
  it('lands on "this era" and says so with a removable chip', () => {
    mocks.formFactor = 'desktop'
    const out = text('/praxis')
    expect(out).toContain(ERA_THIS)
    expect(out).toContain(ERA_ALL)
    expect(out, 'the applied-chip row').toContain(FILTERING_BY)
    expect(
      markup('/praxis'),
      'the chip is a button, so it can be removed',
    ).toContain(i18n.t('common:filters.bar.removeFilter', { label: ERA_THIS }))
  })

  it('raises no chip once widened to all eras — that is the unfiltered state', () => {
    mocks.formFactor = 'desktop'
    expect(text('/praxis?era_scope=all_eras')).not.toContain(FILTERING_BY)
  })
})

describe('the voted rail (#1361 ruling 8)', () => {
  it('is offered to a signed-in reader', () => {
    mocks.formFactor = 'desktop'
    mocks.user = { id: 1 }
    expect(text('/praxis')).toContain(NEEDS_MY_VOTE)
  })

  it('is hidden — not disabled — when logged out, where the server ignores it', () => {
    mocks.formFactor = 'desktop'
    mocks.user = null
    const out = markup('/praxis')
    expect(out.replace(/<[^>]*>/g, '')).not.toContain(NEEDS_MY_VOTE)
    expect(out, 'nothing dead left on screen').not.toContain('disabled')
  })
})

describe('the voted rail follows the server\'s can_vote (#3169)', () => {
  it('is hidden — not disabled — for a character who cannot vote, even via ?voted=no', () => {
    mocks.formFactor = 'desktop'
    mocks.user = { id: 1, can_vote: false }
    const out = markup('/praxis?voted=no')
    expect(out.replace(/<[^>]*>/g, '')).not.toContain(NEEDS_MY_VOTE)
    expect(out).not.toContain('disabled')
  })

  it('returns when the same character becomes eligible', () => {
    mocks.formFactor = 'desktop'
    mocks.user = { id: 1, can_vote: false }
    expect(text('/praxis')).not.toContain(NEEDS_MY_VOTE)
    mocks.user = { id: 1, can_vote: true }
    expect(text('/praxis')).toContain(NEEDS_MY_VOTE)
  })

  it('is kept when the payload has no can_vote field', () => {
    mocks.formFactor = 'desktop'
    mocks.user = { id: 1 }
    expect(text('/praxis')).toContain(NEEDS_MY_VOTE)
  })
})

describe('the URL is the filter state (#1361 ruling 7)', () => {
  it('restores a shared link onto the rails and the chip row', () => {
    mocks.formFactor = 'desktop'
    mocks.user = { id: 1 }
    const out = text('/praxis?sort=most_voted&era_scope=all_eras')
    expect(out).toContain(FILTERING_BY)
    expect(out.split(FILTERING_BY)[1], 'the sort chip').toContain(SORT_MOST_VOTED)
    expect(out.split(FILTERING_BY)[1], 'no era chip — it is unfiltered').not.toContain(ERA_THIS)
  })

  it('degrades a junk sort to the default rather than 422-ing the feed', () => {
    mocks.formFactor = 'desktop'
    const out = text('/praxis?sort=banana')
    expect(out).toContain(SORT_NEWEST)
    expect(out.split(FILTERING_BY)[1] ?? '').not.toContain('banana')
  })
})

describe('the three empty states (#1361 ruling 9)', () => {
  const empty = (kind: 'register' | 'filtered' | 'caughtUp') =>
    renderToStaticMarkup(<PraxisFeedEmpty kind={kind} onClearAll={() => {}} />)

  it('says the register is empty, with nothing to clear', () => {
    const out = empty('register')
    expect(out).toContain(i18n.t('praxis:listPage.empty'))
    expect(out, 'no clear-all on an unfiltered feed').not.toContain(
      i18n.t('common:filters.bar.clearAllFilters'),
    )
  })

  it('says the filters emptied it, and offers the way out', () => {
    const out = empty('filtered')
    expect(out).toContain(i18n.t('praxis:listPage.emptyFiltered'))
    expect(out).toContain(i18n.t('common:filters.bar.clearAllFilters'))
  })

  it('claims "all caught up" only in its own state', () => {
    const out = empty('caughtUp')
    expect(out).toContain(i18n.t('praxis:listPage.emptyCaughtUp'))
    expect(out).toContain(i18n.t('praxis:listPage.emptyCaughtUpHint'))
    expect(empty('filtered')).not.toContain(i18n.t('praxis:listPage.emptyCaughtUp'))
  })
})

describe.each(['desktop', 'mobile'] as const)('%s praxis count (#2262)', (formFactor) => {
  it('prints once, in the bar, beside the controls that change it', () => {
    mocks.formFactor = formFactor
    mocks.user = { id: 1 }
    const out = markup('/praxis')
    expect(out, 'the bar states it').toContain(
      `class="filter-bar__summary">${COUNT}<`,
    )
    expect(
      out.replace(/<[^>]*>/g, '').split(COUNT),
      'exactly one count on screen',
    ).toHaveLength(2)
  })
})

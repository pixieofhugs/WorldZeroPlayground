/**
 * #1421 — the mount seam: does the Updates page actually render ONE shared
 * `FilterBar`, on both form factors, wired to the URL?
 *
 * `renderToStaticMarkup` runs no effects, so the fetch and the results list are
 * out of reach — but `useSearchParams` is read during render, so a
 * `MemoryRouter` entry drives the whole filter surface for real. That covers
 * what a green build would miss: the two hand-rolled filter rows being gone,
 * the form-factor split being gone, the relationship rail disappearing on a
 * view where the server would ignore it, and the labels being localized rather
 * than raw English off a union.
 *
 * Same posture and mocks as `praxes/__tests__/praxisFilterBar.test.tsx`.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))
vi.mock('../../../api/activityFeed', () => ({
  getActivityFeed: async () => ({ items: [], counts: {}, next_cursor: null }),
  dismissAllFeedItems: async () => ({ count: 0, archived: true }),
  restoreAllFeedItems: async () => ({ count: 0, archived: false }),
}))

// Imported after the mocks are registered.
import Updates from '../../Updates'

const INBOX = i18n.t('feed:filter.state.inbox')
const ARCHIVED = i18n.t('feed:filter.state.archived')
const FOES = i18n.t('feed:filter.relationship.foes')
const YOUR_STUFF = i18n.t('feed:filter.relationship.yourStuff')
const TYPE = i18n.t('feed:filter.type')
const FILTERING_BY = i18n.t('common:filters.bar.filteringBy')

function render(entry: string): { html: string; text: string } {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={[entry]}>
      <Updates />
    </MemoryRouter>,
  )
  return { html, text: html.replace(/<[^>]*>/g, ' ') }
}

describe('the Updates page mounts the shared FilterBar', () => {
  it('renders the shared bar, on desktop and on the phone alike', () => {
    for (const formFactor of ['desktop', 'mobile'] as const) {
      mocks.formFactor = formFactor
      expect(render('/updates').html, formFactor).toContain('filter-bar')
    }
    mocks.formFactor = 'desktop'
  })

  it('no longer hand-rolls a stamp — filter implementation #5 is gone', () => {
    // The desktop half drew its own stamp-shaped button duplicating
    // `FilterStamps`: same border, same dashed inset, same Courier recipe. The
    // dashed inset was its tell and nothing else on this page used it. The
    // token itself is gone from index.css (#1445) — this page was its last
    // reader, so the name below is a historical string, not a live var.
    expect(render('/updates').html).not.toContain('--stamp-active-dashed')
  })

  it('no longer dispatches on form factor — filter implementation #6 is gone', () => {
    mocks.formFactor = 'mobile'
    expect(render('/updates').html).not.toContain('data-feed="mobile"')
    mocks.formFactor = 'desktop'
  })

  it('draws the state segment and the type facet', () => {
    const { text } = render('/updates')
    expect(text).toContain(INBOX)
    expect(text).toContain(ARCHIVED)
    // "Type", not "Kicker" — a kicker is a typography term for the eyebrow
    // above a headline (epic decision 5).
    expect(text).toContain(TYPE)
    expect(text).not.toContain('Kicker')
  })

  it('draws the five relationship segments, localized', () => {
    const { text } = render('/updates')
    // The old desktop half printed these straight off the `FeedFilter` union as
    // raw English literals. "Your Stuff" is the catalog's copy now, and the
    // union member it replaced was spelled the same — so the assertion that
    // bites is the phone-only abbreviation being gone.
    expect(text).toContain(YOUR_STUFF)
    expect(text).toContain(FOES)
  })
})

describe('the URL drives the bar', () => {
  it('a bare /updates raises no chips', () => {
    expect(render('/updates').text).not.toContain(FILTERING_BY)
  })

  it('a deep-linked relationship arrives selected, with a removable chip', () => {
    const { text } = render('/updates?filter=foes')
    expect(text).toContain(FILTERING_BY)
    expect(text).toContain(FOES)
  })

  it('a legacy ?filter=archived link still opens the archive', () => {
    const { text } = render('/updates?filter=archived')
    expect(text).toContain(FILTERING_BY)
    expect(text).toContain(ARCHIVED)
  })
})

describe('the relationship rail is hidden on the archive', () => {
  // The backend's `_visible_types` returns the whole `all` set whenever
  // archived=true and ignores `filter` completely, so on that view the rail is
  // a control that cannot work. This page hides those rather than drawing them
  // disabled (CLAUDE.md / STYLE §1.4).
  it('drops every relationship segment', () => {
    const { text } = render('/updates?state=archived')
    expect(text).toContain(ARCHIVED)
    expect(text).not.toContain(FOES)
    expect(text).not.toContain(YOUR_STUFF)
  })

  it('and never leaves a relationship chip behind for an axis nobody applies', () => {
    // A hand-edited link that names both must not chip the one being ignored.
    expect(render('/updates?filter=foes&state=archived').text).not.toContain(FOES)
  })

  it('brings it back in the inbox', () => {
    expect(render('/updates?state=inbox').text).toContain(FOES)
  })
})

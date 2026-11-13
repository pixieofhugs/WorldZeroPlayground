/**
 * #1421: the Updates page renders one shared `FilterBar` on both form factors,
 * driven by a `MemoryRouter` URL (no effects run). Mirrors `praxisFilterBar.test.tsx`.
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

import Updates from '../../Updates'

const INBOX = i18n.t('feed:filter.state.inbox')
const ARCHIVED = i18n.t('feed:filter.state.archived')
const FOES = i18n.t('feed:filter.relationship.foes')
const YOUR_STUFF = i18n.t('feed:filter.relationship.yourStuff')
const TYPE = i18n.t('feed:filter.type')
const NUDGE = i18n.t('feed:kicker.nudge')
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
    // The hand-rolled stamp's tell; the token is gone from index.css (#1445).
    expect(render('/updates').html).not.toContain('--stamp-active-dashed')
  })

  it('no longer dispatches on form factor — filter implementation #6 is gone', () => {
    mocks.formFactor = 'mobile'
    expect(render('/updates').html).not.toContain('data-feed="mobile"')
    mocks.formFactor = 'desktop'
  })

  it('draws the state segment', () => {
    const { text } = render('/updates')
    expect(text).toContain(INBOX)
    expect(text).toContain(ARCHIVED)
  })

  it('draws the type facet when it has rows to offer', () => {
    // No effects, so counts are empty; a selected type keeps its row (#1567).
    const { text } = render('/updates?types=nudge')
    expect(text).toContain(TYPE)
    expect(text).not.toContain('Kicker')
  })

  it('draws the five relationship segments, localized', () => {
    const { text } = render('/updates')
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
  // `_visible_types` ignores `filter` when archived=true.
  it('drops every relationship segment', () => {
    const { text } = render('/updates?state=archived')
    expect(text).toContain(ARCHIVED)
    expect(text).not.toContain(FOES)
    expect(text).not.toContain(YOUR_STUFF)
  })

  it('and never leaves a relationship chip behind for an axis nobody applies', () => {
    expect(render('/updates?filter=foes&state=archived').text).not.toContain(FOES)
  })

  it('brings it back in the inbox', () => {
    expect(render('/updates?state=inbox').text).toContain(FOES)
  })
})

describe('the type facet on an empty board (#1567)', () => {
  // No effects run, so the empty-counts board is the default render here.
  it('draws no Type trigger when every count is zero', () => {
    const { html, text } = render('/updates')
    expect(html).not.toContain('filter-factions__trigger')
    expect(text).not.toContain(TYPE)
  })

  it('still draws the rest of the bar — hiding one facet is not hiding the bar', () => {
    const { html, text } = render('/updates')
    expect(html).toContain('filter-bar')
    expect(text).toContain(INBOX)
    expect(text).toContain(FOES)
  })

  it('KEEPS the trigger for a type selected by deep link, so it can be un-ticked', () => {
    const { html } = render('/updates?types=nudge')
    expect(html).toContain('filter-factions__trigger')
  })

  it('and the chip that names it stays removable and NAMED', () => {
    // `deriveChips` reads the label off the option list.
    const { text } = render('/updates?types=nudge')
    expect(text).toContain(FILTERING_BY)
    expect(text).toContain(NUDGE)
    expect(text).not.toContain('nudge')
  })
})

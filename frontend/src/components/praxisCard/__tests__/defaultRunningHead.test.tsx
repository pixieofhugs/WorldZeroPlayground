/**
 * #1701 — the unaffiliated praxis card has NO running head: both the element
 * and the catalog string are gone (either alone fails while still rendering).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import type { PraxisCardOut } from '../../../api/praxis'
import DefaultPraxisCard from '../desktop/DefaultPraxisCard'

const TITLE = 'Swept the stairwell nobody owns'

const praxis = {
  id: 1,
  title: TITLE,
  task_id: 4,
  task_title: 'A chore nobody asked you to',
  created_by_id: 7,
  created_by_display_name: 'Wren',
  created_by_faction_slug: 'na',
  created_by_avatar_url: '',
  task_faction_slug: 'na',
  task_level_required: 1,
  task_point_value: 5,
  member_count: 1,
  score: 9.5,
  points_from_votes: 3,
  voter_count: 2,
  is_top_for_task: false,
  media_items: [],
  applied_metatasks: [],
} as unknown as PraxisCardOut

const adminProps = {
  praxis,
  showAdminControls: false,
  onHide: () => {},
  onFail: () => {},
  moderateError: null,
} as unknown as Parameters<typeof DefaultPraxisCard>[0]['adminProps']

const html = () =>
  renderToStaticMarkup(
    <MemoryRouter>
      <DefaultPraxisCard praxis={praxis} adminProps={adminProps} />
    </MemoryRouter>,
  )

const text = (markup: string) => markup.replace(/<[^>]*>/g, '')

describe('the quiet sheet drops its running head (#1701)', () => {
  it('reads the title first, with no masthead line above it', () => {
    const rendered = text(html())
    // Spelled out: the key is deleted, so `t()` would echo the path.
    expect(rendered).not.toContain('Praxis · unaffiliated')
    expect(rendered.trimStart().startsWith(TITLE)).toBe(true)
  })

  it('clips no rainbow to type — three appearances remain, not four', () => {
    expect(html()).not.toContain('--faction-default-eyebrow-rainbow')
  })
})

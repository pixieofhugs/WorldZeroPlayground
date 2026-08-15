/**
 * #1701 — the unaffiliated praxis card has NO running head.
 *
 * The seam is the card's rendered markup. Two halves have to hold together: the
 * element is gone (nothing clips the rainbow to type above the title) AND the
 * string is gone from the catalog. Either one surviving alone is a failure that
 * still renders — a live key with no caller is what the next sweep has to guess
 * about, and a caller with no key prints the raw key path on the sheet.
 *
 * SSR-only harness (renderToStaticMarkup, no DOM, effects never run), so these
 * are assertions about markup given props — never interaction.
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
    // The running head's own copy, spelled out rather than read from the
    // catalog: the key is deleted, so `t()` here would just echo the path.
    expect(rendered).not.toContain('Praxis · unaffiliated')
    expect(rendered.trimStart().startsWith(TITLE)).toBe(true)
  })

  it('clips no rainbow to type — three appearances remain, not four', () => {
    // The eyebrow was the only mount of the three-stop cut; the divider and the
    // score stamp both take the full ramp.
    expect(html()).not.toContain('--faction-default-eyebrow-rainbow')
  })
})

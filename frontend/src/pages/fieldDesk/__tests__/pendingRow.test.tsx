/**
 * The pending row's three states, at the two places they are decided (#1554):
 * `selectPendingRow` picks which one, `PendingRowPill` draws it.
 *
 * The pair is split that way because the third state is a NEGATIVE — no link, no
 * chevron, no press state — and a negative is only assertable where the thing
 * that would have been drawn is in scope. The per-skin copies of these
 * assertions live in `mobileArchetypeSlots.test.tsx`; these are the rule itself.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so the three copy keys resolve to English text.
import '../../../i18n'
import { selectPendingRow } from '../useFieldDeskHome'
import PendingRowPill from '../PendingRowPill'
import { UPDATES_LINK } from '../homeDestinations'
import { REQUESTS_QUEUE_ANCHOR } from '../../updates/requestsQueueAnchor'

describe('selectPendingRow', () => {
  it('says nothing at all while the panels are still in flight', () => {
    // Both counts read zero before the response lands. Falling through to
    // "All caught up" there would claim an empty queue over a full one.
    expect(selectPendingRow(0, 0, true)).toBeNull()
    expect(selectPendingRow(4, 9, true)).toBeNull()
  })

  it('leads with the obligation when one is outstanding', () => {
    const row = selectPendingRow(3, 0, false)
    expect(row).toEqual({ kind: 'requests', count: 3, to: expect.any(String) })
    // ADR-0070 deleted the `requests` filter tab; the row expands the queue.
    expect(row?.to).toContain(REQUESTS_QUEUE_ANCHOR)
  })

  it('still leads with the obligation when there is news as well', () => {
    expect(selectPendingRow(1, 12, false)?.kind).toBe('requests')
  })

  it('falls to unfiltered Updates when only news is waiting', () => {
    expect(selectPendingRow(0, 12, false)).toEqual({
      kind: 'notifications',
      count: 0,
      to: UPDATES_LINK,
    })
  })

  it('dead-ends with nothing waiting — the row survives, the route does not', () => {
    expect(selectPendingRow(0, 0, false)).toEqual({ kind: 'clear', count: 0, to: null })
  })
})

function draw(row: Parameters<typeof PendingRowPill>[0]['row']): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <PendingRowPill row={row} chevron={<span data-testid="chevron">›</span>} />
    </MemoryRouter>,
  )
}

describe('PendingRowPill', () => {
  it('draws an obligation as a link with its count and a chevron', () => {
    const html = draw({ kind: 'requests', count: 2, to: '/updates#requests-queue' })
    expect(html).toContain('2 pending requests')
    expect(html).toContain('href="/updates#requests-queue"')
    expect(html).toContain('data-testid="chevron"')
  })

  it('pluralises down to a single request', () => {
    expect(draw({ kind: 'requests', count: 1, to: '/x' })).toContain('1 pending request<')
  })

  it('draws news as a link, without borrowing the requests copy', () => {
    const html = draw({ kind: 'notifications', count: 0, to: UPDATES_LINK })
    expect(html).toContain('New updates')
    expect(html).toContain(`href="${UPDATES_LINK}"`)
    expect(html, 'never a count it cannot know').not.toContain('0')
  })

  it('draws the caught-up state as a sentence: no anchor, no chevron', () => {
    const html = draw({ kind: 'clear', count: 0, to: null })
    expect(html).toContain('All caught up')
    // All three of "the chevron, the link and the press state" go together: an
    // element that is not an anchor has no tap highlight to drop separately.
    expect(html, 'not a link').not.toContain('<a ')
    expect(html, 'no chevron').not.toContain('data-testid="chevron"')
  })

  it('keeps the faction glyph in every state that has one', () => {
    for (const row of [
      { kind: 'requests', count: 1, to: '/x' },
      { kind: 'clear', count: 0, to: null },
    ] as const) {
      const html = renderToStaticMarkup(
        <MemoryRouter>
          <PendingRowPill row={row} chevron={null} glyph={<b data-testid="sigil" />} />
        </MemoryRouter>,
      )
      expect(html, `${row.kind} keeps its mark`).toContain('data-testid="sigil"')
    }
  })
})

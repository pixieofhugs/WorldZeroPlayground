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
import { ACTIVITY_COUNT_CAP } from '../../../api/sidebar'
import { REQUESTS_QUEUE_ANCHOR } from '../../updates/requestsQueueAnchor'

/** The news side as `/me/sidebar` reports it: a total, and the glance's length. */
const news = (total: number | undefined, glanced = Math.min(total ?? 0, 5)) => ({
  total,
  glanced,
})

describe('selectPendingRow', () => {
  it('says nothing at all while the panels are still in flight', () => {
    // Both counts read zero before the response lands. Falling through to
    // "All caught up" there would claim an empty queue over a full one.
    expect(selectPendingRow(0, news(0), true)).toBeNull()
    expect(selectPendingRow(4, news(9), true)).toBeNull()
  })

  it('leads with the obligation when one is outstanding', () => {
    const row = selectPendingRow(3, news(0), false)
    expect(row).toEqual({ kind: 'requests', count: 3, to: expect.any(String) })
    // ADR-0070 deleted the `requests` filter tab; the row expands the queue.
    expect(row?.to).toContain(REQUESTS_QUEUE_ANCHOR)
  })

  it('still leads with the obligation when there is news as well', () => {
    expect(selectPendingRow(1, news(12), false)?.kind).toBe('requests')
  })

  it('carries the WHOLE news count, not the five-item glance (#1587)', () => {
    expect(selectPendingRow(0, news(12), false)).toEqual({
      kind: 'notifications',
      count: 12,
      to: UPDATES_LINK,
    })
  })

  it('degrades to a numberless row when the API predates the count', () => {
    // Deploy skew: the client is ahead, `global_activity_count` is `undefined`.
    // The glance still proves there IS news, so the row stays a link — it just
    // says "New activity" rather than inventing (or printing) a number.
    expect(selectPendingRow(0, news(undefined, 5), false)).toEqual({
      kind: 'notifications',
      count: 0,
      to: UPDATES_LINK,
    })
  })

  it('dead-ends with nothing waiting — the row survives, the route does not', () => {
    expect(selectPendingRow(0, news(0), false)).toEqual({
      kind: 'clear',
      count: 0,
      to: null,
    })
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

  it('draws news as a link, with its number (#1587)', () => {
    const html = draw({ kind: 'notifications', count: 12, to: UPDATES_LINK })
    expect(html).toContain('12 new events')
    expect(html).toContain(`href="${UPDATES_LINK}"`)
    expect(html, 'never the requests copy').not.toContain('pending')
  })

  it('pluralises down to a single event', () => {
    expect(draw({ kind: 'notifications', count: 1, to: UPDATES_LINK })).toContain(
      '1 new event<',
    )
  })

  it('never calls this half a notification (#2083)', () => {
    // The bell counts obligations, this row counts events, and they are two
    // halves of ONE feed (ADR-0070). A quiet bell beside "1 notification" reads
    // as a broken bell; a quiet bell beside "1 new event" reads as a log.
    for (const count of [0, 1, 12, ACTIVITY_COUNT_CAP]) {
      const html = draw({ kind: 'notifications', count, to: UPDATES_LINK })
      expect(html, `${count} still says notification`).not.toContain('notification')
    }
  })

  it('says "50+" at the cap, where the count stops being a total', () => {
    // At or above `SUB_QUERY_LIMIT` the server's number is a floor: one source
    // may have been truncated. Printing it bare would be the only dishonest
    // number this row can produce.
    for (const count of [ACTIVITY_COUNT_CAP, ACTIVITY_COUNT_CAP + 87]) {
      const html = draw({ kind: 'notifications', count, to: UPDATES_LINK })
      expect(html, `${count} is past the cap`).toContain(
        `${ACTIVITY_COUNT_CAP}+ new events`,
      )
      expect(html, 'no floor printed as a total').not.toContain(`${count} new events`)
    }
  })

  it('falls back to the old wording when the API sent no count', () => {
    const html = draw({ kind: 'notifications', count: 0, to: UPDATES_LINK })
    expect(html).toContain('New activity')
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

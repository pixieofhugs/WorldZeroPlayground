/**
 * #1191 — folding the rail away must not silently hide incoming requests.
 *
 * The collapsed handle carries the count of pending collab invites and duel
 * challenges. The badge is decorative (`aria-hidden`, and colour alone), so the
 * count has to reach assistive tech through the button's accessible name — that
 * is what is pinned here.
 *
 * The count arrives as a prop: `SidebarColumn` reads it once, so folding does
 * not cost a second fetch (#1343/#1344).
 *
 * The rail itself no longer lists the requests (#1423, ADR-0070) — the queue on
 * `/updates` does — so the expanded state's silence is now a deliberate gap
 * rather than a redundancy. See `SidebarHandle`'s `pendingCount` docstring.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'

vi.mock('../Sidebar', () => ({ default: () => null, panelStyle: {} }))

import SidebarHandle from '../SidebarHandle'

const noop = () => {}

function render(collapsed: boolean, pending: number): string {
  return renderToStaticMarkup(
    <SidebarHandle collapsed={collapsed} onToggle={noop} pendingCount={pending} />,
  )
}

describe('SidebarHandle — collapsed pending badge', () => {
  it('reports the count in the accessible name, not colour alone', () => {
    const html = render(true, 3)
    expect(html).toContain('aria-label="Expand sidebar — 3 pending requests"')
    expect(html).toContain('>3<')
  })

  it('speaks singular for one request', () => {
    expect(render(true, 1)).toContain('aria-label="Expand sidebar — 1 pending request"')
  })

  it('stays a plain expand handle with nothing pending', () => {
    const html = render(true, 0)
    expect(html).toContain('aria-label="Expand sidebar"')
    expect(html).toContain('aria-expanded="false"')
  })

  it('never shows a badge while expanded — unchanged by #1423, pending an owner call', () => {
    const html = render(false, 3)
    expect(html).toContain('aria-label="Collapse sidebar"')
    expect(html).not.toContain('>3<')
  })
})

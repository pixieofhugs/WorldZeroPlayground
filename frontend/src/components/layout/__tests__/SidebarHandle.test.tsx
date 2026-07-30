/**
 * #1191 — folding the rail away must not silently hide incoming requests.
 *
 * The sidebar's pending-requests panel is the ONLY desktop surface for collab
 * invites and duel challenges, so the collapsed handle carries their count. The
 * badge is decorative (`aria-hidden`, and colour alone), so the count has to
 * reach assistive tech through the button's accessible name — that is what is
 * pinned here.
 *
 * `usePendingRequests` is mocked because it resolves in an effect, and this
 * harness is `renderToStaticMarkup`: effects never run, so a real one would
 * always report zero.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { ActivityFeedItem } from '../../../api/activityFeed'

const pendingMock = vi.fn()
vi.mock('../../../hooks/usePendingRequests', () => ({
  usePendingRequests: () => ({ pendingRequests: pendingMock(), loading: false, refetch: () => {} }),
}))

vi.mock('../Sidebar', () => ({ default: () => null, panelStyle: {} }))

import SidebarHandle from '../SidebarHandle'

const noop = () => {}

function requests(count: number): ActivityFeedItem[] {
  return Array.from({ length: count }) as ActivityFeedItem[]
}

function render(collapsed: boolean, pending: number): string {
  pendingMock.mockReturnValue(requests(pending))
  return renderToStaticMarkup(<SidebarHandle collapsed={collapsed} onToggle={noop} />)
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

  it('never shows a badge while expanded — the rail lists them itself', () => {
    const html = render(false, 3)
    expect(html).toContain('aria-label="Collapse sidebar"')
    expect(html).not.toContain('>3<')
  })
})

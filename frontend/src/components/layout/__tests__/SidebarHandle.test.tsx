/**
 * #1191 — folding the rail away must not silently hide incoming requests.
 * #1457 — neither must UNfolding it.
 *
 * The handle carries the count of pending collab invites and duel challenges in
 * BOTH states. The badge is decorative (`aria-hidden`, and colour alone), so the
 * count has to reach assistive tech through the button's accessible name — that
 * is what is pinned here, in each state.
 *
 * WHY THE EXPANDED SILENCE IS NOT COMING BACK
 * -------------------------------------------
 * An earlier version of this file called the expanded state's silence "a
 * deliberate gap", and it was: the rail LISTED the requests, so a badge on the
 * handle would have counted a list sitting right underneath it. #1423 deleted
 * that list — requests are answered in the queue on `/updates` and nowhere else
 * (ADR-0070) — and the justification went with the panel. What was left was an
 * expanded rail that said nothing while the collapsed one said "3 waiting",
 * which is backwards: expanding is the gesture that means "show me more".
 *
 * So the expanded assertions below are the point of the file, not filler. If
 * one of them starts failing because the badge was scoped back to a single
 * state, the panel it used to duplicate has to come back with it.
 *
 * The count arrives as a prop: `SidebarColumn` reads it once, so folding does
 * not cost a second fetch (#1343/#1344).
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
})

describe('SidebarHandle — expanded pending badge (#1457)', () => {
  it('badges the count while expanded, since #1423 left nothing else to say it', () => {
    const html = render(false, 3)
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('>3<')
  })

  it('reports the count in the accessible name here too', () => {
    expect(render(false, 3)).toContain('aria-label="Collapse sidebar — 3 pending requests"')
  })

  it('speaks singular for one request', () => {
    expect(render(false, 1)).toContain('aria-label="Collapse sidebar — 1 pending request"')
  })

  it('stays a plain collapse handle with nothing pending', () => {
    const html = render(false, 0)
    expect(html).toContain('aria-label="Collapse sidebar"')
    // 0 is never drawn: a zero badge reads as an obligation that is not there.
    expect(html).not.toContain('>0<')
  })
})

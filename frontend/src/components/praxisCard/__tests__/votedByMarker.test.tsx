/** #644 §7 — the "voted by {name}" marker. SSR with the real catalog. */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import type { PraxisCardOut } from '../../../api/praxis'
import { PraxisVotedByMarker } from '../shared'

function praxis(overrides: Partial<PraxisCardOut>): PraxisCardOut {
  return { id: 1, ...overrides } as PraxisCardOut
}

const text = (html: string) => html.replace(/<[^>]*>/g, '')

describe('voted-by marker', () => {
  it('desktop: names the account-mate when voted_by_name is set', () => {
    const html = renderToStaticMarkup(
      <PraxisVotedByMarker praxis={praxis({ voted_by_name: 'Alice' })} />,
    )
    expect(text(html)).toContain('voted by Alice')
  })

  it('desktop: renders nothing without voted_by_name', () => {
    expect(
      renderToStaticMarkup(<PraxisVotedByMarker praxis={praxis({ voted_by_name: null })} />),
    ).toBe('')
  })

  // One responsive component (ADR-0067), so these cover both form factors.
})

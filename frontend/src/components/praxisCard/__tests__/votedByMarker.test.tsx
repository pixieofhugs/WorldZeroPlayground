/**
 * #644 §7 — the "voted by {name}" marker. SSR-renders it in isolation (no
 * effects needed) with the real i18n catalog, so the copy and the account-mate
 * name are pinned.
 *
 * The `FilterStamps` half of #644 §7 (the `label`/`optionLabels` widening) is
 * gone with the component itself (#1368): the show/voted axis it drew is now a
 * `FilterBar` rail, covered by `praxes/__tests__/praxisFilterBar.test.tsx`.
 */
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

  // The praxis card is one responsive component (ADR-0067), so the cases above
  // pin both form factors — there is no second marker to assert against.
})

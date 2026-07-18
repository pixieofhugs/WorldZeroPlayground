/**
 * #644 §7 — the "voted by {name}" marker + the FilterStamps `label`/`optionLabels`
 * widening. SSR-renders each in isolation (no effects needed) with the real i18n
 * catalog, so the copy and the account-mate name are pinned.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import type { PraxisCardOut } from '../../../api/praxis'
import { PraxisVotedByMarker } from '../shared'
import { MobileVotedByMarker } from '../mobile/shared'
import FilterStamps from '../../ui/FilterStamps'

const theme = {
  ink: 'var(--x)',
  muted: 'var(--x)',
  accent: 'var(--x)',
  paper: 'var(--x)',
}

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

  it('mobile: names the account-mate when voted_by_name is set', () => {
    const html = renderToStaticMarkup(
      <MobileVotedByMarker praxis={praxis({ voted_by_name: 'Bob' })} theme={theme} />,
    )
    expect(text(html)).toContain('voted by Bob')
  })

  it('mobile: renders nothing without voted_by_name', () => {
    expect(
      renderToStaticMarkup(<MobileVotedByMarker praxis={praxis({})} theme={theme} />),
    ).toBe('')
  })
})

describe('FilterStamps widening', () => {
  it('shows the custom group label and maps option keys to display labels', () => {
    const html = renderToStaticMarkup(
      <FilterStamps
        label="show:"
        options={['all', 'no']}
        value="no"
        onChange={() => {}}
        optionLabels={{ all: 'All', no: 'needs my vote' }}
      />,
    )
    const body = text(html)
    expect(body).toContain('show:')
    expect(body).toContain('needs my vote')
    // The raw option key is never shown when an optionLabels entry exists.
    expect(body).not.toContain('>no<')
  })
})

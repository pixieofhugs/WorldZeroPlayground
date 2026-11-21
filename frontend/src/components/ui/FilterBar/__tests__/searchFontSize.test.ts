// #3757: iOS Safari zooms a focused input under 16px, so the filter-bar
// search stays on --text-content (18px), never a label-tier token.
import { describe, expect, it } from 'vitest'
import { ruleBodies, stripComments } from '../../../../utils/__tests__/cssVars'
import { readIndexCss } from '../../../../test/indexCss'

const css = stripComments(readIndexCss())

describe('filter-bar search font size (#3757)', () => {
  it('sizes .filter-bar__search on --text-content', () => {
    const bodies = ruleBodies(css, '.filter-bar__search')
    expect(bodies.length, '.filter-bar__search rule must exist').toBeGreaterThan(0)
    expect(bodies.join('\n')).toMatch(/font-size:\s*var\(--text-content\)/)
  })
})

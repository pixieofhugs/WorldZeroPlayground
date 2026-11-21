/** The seal must scroll on a short viewport: auto margins, not flex centring. */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))
vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => mocks.formFactor }))

import DuelSealSheet from '../DuelSealSheet'

describe.each(['mobile', 'desktop'] as const)('seal sheet on a short viewport (%s)', (factor) => {
  it('scrolls the shell and aligns the card with auto margins', () => {
    mocks.formFactor = factor
    const html = renderToStaticMarkup(
      <DuelSealSheet label="Seal" ground={{}}>
        <p>body</p>
      </DuelSealSheet>,
    )
    const shell = html.match(/<div[^>]*data-testid="duel-seal-sheet"[^>]*>/)![0]
    expect(shell).toContain('overflow-y-auto')
    expect(html).not.toMatch(/items-center|justify-center|justify-end/)
    expect(html).toMatch(/class="[^"]*\bm(t)?-auto\b/)
  })
})

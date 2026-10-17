/**
 * #3257: an admin can open a hidden praxis, so the page entry must say so.
 * Seam: the `PraxisDetail` dispatcher, with the data hook stubbed.
 */
import { describe, it, expect, vi } from 'vitest'
import { aPraxis } from '../../../test/fixtures'
import { aPraxisDetailState, markup } from '../../../test/praxisDetail'
import type { PraxisOut } from '../../../api/praxis'
import PraxisDetail from '../../PraxisDetail'

const h = vi.hoisted(() => ({ state: null as unknown }))
vi.mock('../usePraxisDetail', () => ({
  usePraxisDetail: () => h.state,
}))
vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))

const BANNER = 'This praxis is hidden'
const show = (p: Partial<PraxisOut>) => {
  h.state = aPraxisDetailState({ praxis: aPraxis(p) })
  return markup(<PraxisDetail />).text
}

describe('hidden-praxis banner', () => {
  it('shows for a hidden praxis', () => {
    expect(show({ moderation_status: 'hidden' })).toContain(BANNER)
  })
  it('does not show for a visible praxis', () => {
    expect(show({ moderation_status: 'visible' })).not.toContain(BANNER)
  })
})

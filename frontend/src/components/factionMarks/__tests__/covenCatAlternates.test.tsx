/**
 * The cat alternates (#2396): a card on an ornamented ground goes plain, on a
 * plain ground wears the cat. Both Coven cards branch on the same predicate;
 * tested through markup under `BackdropContext` (the predicate itself is in
 * `groundIsBusy.test.tsx`). `coven`'s candlelight is a wash, so its cards keep
 * the cat — why a per-route flag would be wrong.
 */
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'

// `useTheme()` throws outside a `ThemeProvider` (#701).
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggle: () => {} }),
}))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => 'desktop',
}))

import { BackdropContext } from '../../backdrop/BackdropContext'
import CovenTaskCard from '../../taskCard/CovenTaskCard'
import CovenPraxisCard from '../../praxisCard/desktop/CovenPraxisCard'
import { aTask, aPraxisCard } from '../../../test/fixtures'

const TASK = aTask({ primary_faction_slug: 'coven' })
const PRAXIS = aPraxisCard({ task_faction_slug: 'coven' })

const adminProps = {
  praxis: PRAXIS,
  showAdminControls: false,
  onHide: () => {},
  onDelete: () => {},
} as unknown as Parameters<typeof CovenPraxisCard>[0]['adminProps']

function onGround(slug: string | null, card: ReactNode, cardsKeepOrnament = false): string {
  return renderToStaticMarkup(
    <BackdropContext.Provider value={{ slug, cardsKeepOrnament, setGround: () => {} }}>
      <MemoryRouter>{card}</MemoryRouter>
    </BackdropContext.Provider>,
  )
}

const taskCard = (
  <CovenTaskCard
    task={TASK}
    basePoints={TASK.point_value}
    multiplier={1}
    inProgressCount={TASK.in_progress_count}
    onSignup={() => {}}
  />
)

const praxisCard = <CovenPraxisCard praxis={PRAXIS} adminProps={adminProps} />

const CARDS: [string, ReactNode][] = [
  ['task card', taskCard],
  ['praxis card', praxisCard],
]

describe.each(CARDS)('the Coven %s', (_name, card) => {
  it('goes BARE where the cat is not worn — no substitute texture', () => {
    // The slip sheet is paper, not ornament: only the cat differs.
    const plain = onGround('everymen', card)
    const worn = onGround(null, card)
    expect(plain).toContain('--faction-coven-slip-from')
    expect(worn.replace(/<svg class="cvn-wheel".*?<\/svg>/s, '')).toEqual(plain)
  })
})

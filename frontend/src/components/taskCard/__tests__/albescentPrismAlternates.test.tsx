/**
 * The alternation law under the background mechanism (#2499): `.alb-prism` is a
 * background layer, so the law is asserted on the rendered class list — a card
 * that reads `useGroundIsBusy` and forgets to branch would pass anything else.
 *
 * The `albescent` ground keeps the prism: its backdrop is a WASH. The spectrum
 * edge is CHROME and must survive a busy ground — it is ADR-0048's motion tell.
 * Ground is provided via `BackdropContext` (SSR: effects never run).
 */
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'

// The score stamp's `useTheme()` throws outside a `ThemeProvider` (#701).
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggle: () => {} }),
}))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => 'desktop',
}))

import { BackdropContext } from '../../backdrop/BackdropContext'
import AlbescentTaskCard from '../AlbescentTaskCard'
import AlbescentPraxisCard from '../../praxisCard/desktop/AlbescentPraxisCard'
import { aTask, aPraxisCard } from '../../../test/fixtures'

const TASK = aTask({ primary_faction_slug: 'albescent' })
const PRAXIS = aPraxisCard({ task_faction_slug: 'albescent' })

const adminProps = {
  praxis: PRAXIS,
  showAdminControls: false,
  onHide: () => {},
  onDelete: () => {},
} as unknown as Parameters<typeof AlbescentPraxisCard>[0]['adminProps']

function onGround(slug: string | null, card: ReactNode, cardsKeepOrnament = false): string {
  return renderToStaticMarkup(
    <BackdropContext.Provider value={{ slug, cardsKeepOrnament, setGround: () => {} }}>
      <MemoryRouter>{card}</MemoryRouter>
    </BackdropContext.Provider>,
  )
}

const taskCard = (
  <AlbescentTaskCard
    task={TASK}
    basePoints={TASK.point_value}
    multiplier={1}
    inProgressCount={TASK.in_progress_count}
    onSignup={() => {}}
  />
)

const praxisCard = <AlbescentPraxisCard praxis={PRAXIS} adminProps={adminProps} />

const CARDS: [string, ReactNode][] = [
  ['task card', taskCard],
  ['praxis card', praxisCard],
]

describe.each(CARDS)('the Albescent %s', (_name, card) => {
  it('keeps the drifting spectrum edge on a busy ground — the edge is CHROME', () => {
    const plain = onGround('everymen', card)
    expect(plain).toMatch(/alb-task-edge|alb-praxis-card-edge/)
  })

  it('goes BARE where the prism is not worn — no substitute texture', () => {
    // "Either burst, or plain": worn and plain differ by the class and nothing else.
    const worn = onGround(null, card)
    const plain = onGround('everymen', card)
    expect(worn, 'the worn card must actually differ').not.toEqual(plain)
    expect(worn.replace(' alb-prism', '')).toEqual(plain)
  })
})

it('draws no spark on any ground — the twinkle is not in the kit (#2555)', () => {
  // Albescent's delta over na is MOTION, not a mark of its own (ADR-0083).
  for (const ground of [null, 'everymen', 'albescent'] as const) {
    expect(onGround(ground, praxisCard), 'the spark is back').not.toContain('alb-spark')
  }
})

it('draws no ornament SPAN for the ground on either card', () => {
  // An overlay would give the alternation a second mechanism to keep in step.
  for (const [, card] of CARDS) {
    const html = onGround(null, card)
    for (const gone of ['alb-rainbow', 'alb-task-aurora']) {
      expect(html, `${gone} is back as a span`).not.toContain(gone)
    }
  }
})

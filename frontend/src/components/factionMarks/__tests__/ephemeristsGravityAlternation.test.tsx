/**
 * The Ephemerists ornament alternates (#2398): a card on an ornamented ground
 * goes plain, on a plain ground wears the gravity field. The predicate is in
 * `groundIsBusy.test.tsx`; this catches the branch inverted, dropped from a
 * card, or leaking into chrome. Where not worn the ground is bare, so the
 * chart net is no longer a card ground (#2195).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import type { ReactElement } from 'react'
import '../../../i18n'

vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))

// Imported after the mock is registered.
import { BackdropContext } from '../../backdrop/BackdropContext'
import EphemeristsTaskCard from '../../taskCard/EphemeristsTaskCard'
import EphemeristsPraxisCard from '../../praxisCard/desktop/EphemeristsPraxisCard'
import { aTask, aPraxisCard } from '../../../test/fixtures'

/** The field's signature; no other Ephemerists mark draws either. */
const FIELD_ROW = 'd="M-6 '
/** The chart net's canvas. */
const NET = 'viewBox="0 0 1000 600"'

const TASK = aTask({ primary_faction_slug: 'ephemerists', in_progress_count: 2 })
const CARD = aPraxisCard({
  task_faction_slug: 'ephemerists',
  created_by_faction_slug: 'ephemerists',
})

const adminProps = {
  praxis: CARD,
  showAdminControls: false,
  onHide: () => {},
  onDelete: () => {},
} as unknown as Parameters<typeof EphemeristsPraxisCard>[0]['adminProps']

function onGround(
  node: ReactElement,
  slug: string | null,
  cardsKeepOrnament = false,
): string {
  return renderToStaticMarkup(
    <BackdropContext.Provider value={{ slug, cardsKeepOrnament, setGround: () => {} }}>
      <MemoryRouter>{node}</MemoryRouter>
    </BackdropContext.Provider>,
  )
}

const taskCard = (slug: string | null, keep = false) =>
  onGround(
    <EphemeristsTaskCard
      task={TASK}
      basePoints={TASK.point_value}
      multiplier={1}
      inProgressCount={TASK.in_progress_count}
      onSignup={() => {}}
    />,
    slug,
    keep,
  )

const praxisCard = (slug: string | null, keep = false) =>
  onGround(<EphemeristsPraxisCard praxis={CARD} adminProps={adminProps} />, slug, keep)

const BOTH: Array<[string, (slug: string | null, keep?: boolean) => string]> = [
  ['task card', taskCard],
  ['praxis card', praxisCard],
]

describe('either burst, or plain — no substitute texture (#2195)', () => {
  it('takes the chart net off the task card, on every ground', () => {
    for (const slug of [null, 'ephemerists', 'everymen', 'coven']) {
      expect(taskCard(slug), `${slug} ground`).not.toContain(NET)
    }
  })

  it('leaves the plain card bare — the ornament is the only ground', () => {
    for (const [name, render] of BOTH) {
      const html = render('ephemerists')
      expect(html, `${name} keeps no net`).not.toContain(NET)
      expect(html, `${name} keeps no field`).not.toContain(FIELD_ROW)
    }
  })
})

describe('the alternation never reaches chrome (#2195)', () => {
  it('leaves the task card its band, its cornice, its rose and its runes', () => {
    const plain = taskCard(null)
    const busy = taskCard('everymen')
    // Rose (points mark), runes and CTA rule are chrome, not ornament.
    for (const mark of [
      'M50 8 L55.5 26 L44.5 26 Z',
      'data-eph-runes',
      'data-cta-rule="ephemerists"',
    ]) {
      expect(plain, `plain ground: ${mark}`).toContain(mark)
      expect(busy, `busy ground: ${mark}`).toContain(mark)
    }
  })

  it('leaves the praxis card its band, its cornice and its byline runes', () => {
    const plain = praxisCard(null)
    const busy = praxisCard('everymen')
    for (const mark of ['data-eph-runes', 'href="/factions/ephemerists"']) {
      expect(plain, `plain ground: ${mark}`).toContain(mark)
      expect(busy, `busy ground: ${mark}`).toContain(mark)
    }
  })
})

/**
 * The cat ALTERNATES (#2396, epic #2195).
 *
 * The law, owner 2026-08-17: each faction has one ornament; a card on an
 * ornamented ground goes plain, a card on a plain ground wears it. Coven's
 * ornament is the cat — `CovenCat` at 0.09 with `.cvn-wheel`'s slow turn — and
 * it is worn on BOTH cards, so both branch on the same predicate.
 *
 * THE SEAM: `the ground a page declared` → `the card's rendered markup`. Phase 1
 * (#2387) already tests the predicate itself in
 * `backdrop/__tests__/groundIsBusy.test.tsx`; what is untested until here is
 * that the two Coven cards consume it, and consume it the same way. So these
 * assertions are about markup under a provided `BackdropContext`, never about
 * `useGroundIsBusy` in isolation — a card that reads the boolean and forgets to
 * branch passes every other check in the tree.
 *
 * It lives beside `covenCat.test.tsx` on purpose: that file guards "one drawing,
 * five mounts", this one guards the two of those five that alternate. The other
 * three (the profile body, the praxis composer, both detail columns) are page
 * bodies and columns, not cards, and the law is explicitly about cards.
 *
 * WHY EACH GROUND BELOW. `coven` is the interesting one: the candlelight
 * backdrop is a WASH (flat ward-page plus four drifting blooms), so a Coven card
 * on a Coven profile KEEPS its cat. A per-route flag — "the character profile
 * tells its cards to go plain" — would have got that wrong, which is why the
 * pattern/wash table exists.
 *
 * SSR-only harness (`renderToStaticMarkup`, no DOM, effects never run), which is
 * why the ground is provided through `BackdropContext` directly rather than by
 * calling `useFactionBackdrop` — its effect would never fire here.
 */
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'

// The praxis card's score stamp reaches for `useTheme()`, which throws outside a
// `ThemeProvider` by design (#701). Mocked, the shape `covenSlipSheet.test.tsx`
// established: the theme is an input here and nothing below depends on it.
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
  it('wears the cat on every unthemed route — the site-wide default', () => {
    // `null` is /tasks, Home, the FieldDesk and both detail pages: the vast
    // majority of the mounts, and the case that must not change.
    expect(onGround(null, card)).toContain('class="cvn-wheel"')
  })

  it('drops the cat on a patterned ground, whatever faction painted it', () => {
    // Owner ruled (a): ANY ornamented ground. A Coven card lands on someone
    // else's profile whenever a player of another faction files praxis against
    // a Coven task — `PraxisCard` dispatches on `task_faction_slug`.
    expect(onGround('everymen', card)).not.toContain('cvn-wheel')
    expect(onGround('snide', card)).not.toContain('cvn-wheel')
  })

  it('keeps the cat on a Coven profile, because candlelight is a WASH', () => {
    expect(onGround('coven', card)).toContain('class="cvn-wheel"')
  })

  it('keeps the cat when the page claimed the faction-page exemption', () => {
    // Owner, 2026-08-18: a faction page may show busy cards on a busy ground.
    // `useFactionDetail` is the one caller that claims it.
    expect(onGround('everymen', card, true)).toContain('class="cvn-wheel"')
  })

  it('goes BARE where the cat is not worn — no substitute texture', () => {
    // "Either burst, or plain" (owner, 2026-08-17). The slip sheet is the
    // card's PAPER, not an ornament, so it stays on both grounds and is the
    // only thing that does: the plain card differs from the ornamented one by
    // the cat and nothing else.
    const plain = onGround('everymen', card)
    const worn = onGround(null, card)
    expect(plain).toContain('--faction-coven-slip-from')
    expect(worn.replace(/<svg class="cvn-wheel".*?<\/svg>/s, '')).toEqual(plain)
  })
})

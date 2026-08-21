/**
 * The aurora ALTERNATES, and the praxis card finally has one (#2397, epic #2195).
 *
 * The law, owner 2026-08-17: each faction has one ornament; a card on an
 * ornamented ground goes plain, a card on a plain ground wears it. Albescent's
 * is the AURORA — seven blooms blurred past recognition under the vellum — and
 * until #2397 it was worn on the task card only, while the praxis card showed
 * `.alb-rainbow`'s drift instead. Two surfaces, two textures, which is the exact
 * complaint the epic opened on. Both cards now wear the same drawing and both
 * drop it on the same predicate.
 *
 * THE SEAM: `the ground a page declared` → `the card's rendered markup`. Phase 1
 * (#2387) already tests the predicate itself in
 * `backdrop/__tests__/groundIsBusy.test.tsx`; what is untested until here is
 * that the two Albescent cards consume it, and consume it the same way. So every
 * assertion below is about markup under a provided `BackdropContext`, never
 * about `useGroundIsBusy` in isolation — a card that reads the boolean and
 * forgets to branch passes every other check in the tree.
 *
 * WHY THE `albescent` GROUND IS THE INTERESTING ROW. Albescent's own backdrop is
 * the watercolour, a WASH, so an Albescent card on an Albescent player's profile
 * KEEPS its aurora and this kit's alternation is visible on someone ELSE's
 * patterned profile only. A per-route flag — "the character profile tells its
 * cards to go plain" — would have got that wrong.
 *
 * WHAT MUST SURVIVE A BUSY GROUND. The alternation takes the card's background
 * TEXTURE and nothing else, and for this kit that line is load-bearing twice
 * over. `.alb-task-edge` is the shared `.spectrum-frame` ring since #2407, worn
 * by six mounts; branching it here would reach five surfaces this issue does not
 * own. And ADR-0048 reveals the society by MOTION, never by a colour — so a
 * plain Albescent card still has to be tellable from an unaffiliated one, which
 * the drifting edge and the three sparks are what do.
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
// `ThemeProvider` by design (#701). Mocked, the shape the sibling alternation
// suites established: the theme is an input here and nothing below depends on it.
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
  it('wears the aurora on every unthemed route — the site-wide default', () => {
    // `null` is /tasks, Home, the FieldDesk and both detail pages: the vast
    // majority of the mounts. For the praxis card this is also the new half of
    // #2397 — the aurora was not on this surface at all before.
    expect(onGround(null, card)).toContain('alb-task-aurora')
  })

  it('drops the aurora on a patterned ground, whatever faction painted it', () => {
    // Owner ruled (a): ANY ornamented ground. An Albescent card lands on someone
    // else's profile whenever a player of another faction files praxis against
    // an Albescent task — `PraxisCard` dispatches on `task_faction_slug`.
    expect(onGround('everymen', card)).not.toContain('alb-task-aurora')
    expect(onGround('snide', card)).not.toContain('alb-task-aurora')
  })

  it('keeps the aurora on an Albescent profile, because the watercolour is a WASH', () => {
    expect(onGround('albescent', card)).toContain('alb-task-aurora')
  })

  it('keeps the aurora when the page claimed the faction-page exemption', () => {
    // Owner, 2026-08-18: a faction page may show busy cards on a busy ground.
    // `useFactionDetail` is the one caller that claims it.
    expect(onGround('everymen', card, true)).toContain('alb-task-aurora')
  })

  it('keeps the drifting spectrum edge on a busy ground — the edge is CHROME', () => {
    // Both cards wear a masked spectrum ring, and neither may lose it: it is one
    // shared rule across six mounts (#2407), and it is the motion that keeps
    // ADR-0048's tell alive on a card that has gone plain.
    const plain = onGround('everymen', card)
    expect(plain).toMatch(/alb-task-edge|spectrum-frame/)
  })

  it('goes BARE where the aurora is not worn — no substitute texture', () => {
    // "Either burst, or plain" (owner, 2026-08-17). Strip the ornament spans
    // from the worn card and what is left is the plain card, byte for byte: the
    // two differ by the texture and by nothing else. On the praxis card that
    // means `.alb-rainbow` travels WITH the aurora — a drift left standing alone
    // is exactly the substitute texture the ruling forbids.
    const worn = onGround(null, card)
    const plain = onGround('everymen', card)
    const ornament = /<span aria-hidden="true" class="alb-(?:task-aurora|rainbow)"><\/span>/g
    expect(worn).toMatch(ornament)
    expect(worn.replace(ornament, '')).toEqual(plain)
  })
})

it('leaves the three sparks on a busy ground — a glyph is not a ground texture', () => {
  // #842's half of the tell. Three ✦ at 9–15px are the praxis card's, and they
  // are why a plain Albescent card still does not read as an unaffiliated one.
  expect(onGround('everymen', praxisCard)).toContain('alb-spark')
})

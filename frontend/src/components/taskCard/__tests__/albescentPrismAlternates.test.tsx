/**
 * The alternation law survives the change of MECHANISM (#2499, epic #2496).
 *
 * The law, owner 2026-08-17: each faction has one ornament; a card on an
 * ornamented ground goes plain, a card on a plain ground wears it. Albescent's
 * was the AURORA — a blended `<span>` over the sheet — and #2397 made both cards
 * wear it and both drop it on `useGroundIsBusy()`.
 *
 * #2499 MOVES THE GROUND INTO THE CARD'S OWN BACKGROUND. `.alb-prism` overrides
 * `--faction-default-card-sheet`, so there is no span any more — and **a
 * background layer has nothing to unmount**. Left unattended the law would have
 * died silently: the components would keep calling the hook, keep branching, and
 * keep rendering an identical card either way, with every existing test passing
 * because they all asked about a span that no longer exists.
 *
 * THE SEAM IS THE CARD'S RENDERED CLASS LIST under a provided ground. Phase 1
 * (#2387) tests the predicate itself in `backdrop/__tests__/groundIsBusy.test.tsx`;
 * what is untested until here is that the two Albescent cards consume it, consume
 * it the same way, and consume it through the mechanism that is actually load
 * bearing now. So every assertion below is about markup, never about
 * `useGroundIsBusy` in isolation — a card that reads the boolean and forgets to
 * branch passes every other check in the tree.
 *
 * WHY THE `albescent` GROUND IS THE INTERESTING ROW. Albescent's own backdrop is
 * the watercolour, a WASH, so an Albescent card on an Albescent player's profile
 * KEEPS its prism and this kit's alternation is visible on someone ELSE's
 * patterned profile only. A per-route flag — "the character profile tells its
 * cards to go plain" — would have got that wrong.
 *
 * WHAT MUST SURVIVE A BUSY GROUND. The alternation takes the card's GROUND and
 * nothing else, and for this kit that line is load-bearing twice over. The
 * spectrum edge is the shared masked ring (#2407), worn by eight mounts since
 * #2499; branching it here would reach seven surfaces this issue does not own.
 * And ADR-0048 reveals the society by MOTION, never by a colour — so a plain
 * Albescent card still has to be tellable from an unaffiliated one, which the
 * drifting edge and the three sparks are what do.
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

/** The class list of the wrapper — the first `class="…"` the card emits. */
const wrapperClasses = (html: string): string[] =>
  (html.match(/class="([^"]*)"/)?.[1] ?? '').split(/\s+/).filter(Boolean)

describe.each(CARDS)('the Albescent %s', (_name, card) => {
  it('wears the prism on every unthemed route — the site-wide default', () => {
    // `null` is /tasks, Home, the FieldDesk and both detail pages: the vast
    // majority of the mounts.
    expect(wrapperClasses(onGround(null, card))).toContain('alb-prism')
  })

  it('drops the prism on a patterned ground, whatever faction painted it', () => {
    // Owner ruled (a): ANY ornamented ground. An Albescent card lands on someone
    // else's profile whenever a player of another faction files praxis against
    // an Albescent task — `PraxisCard` dispatches on `task_faction_slug`.
    expect(wrapperClasses(onGround('everymen', card))).not.toContain('alb-prism')
    expect(wrapperClasses(onGround('snide', card))).not.toContain('alb-prism')
  })

  it('keeps the prism on an Albescent profile, because the watercolour is a WASH', () => {
    expect(wrapperClasses(onGround('albescent', card))).toContain('alb-prism')
  })

  it('keeps the prism when the page claimed the faction-page exemption', () => {
    // Owner, 2026-08-18: a faction page may show busy cards on a busy ground.
    // `useFactionDetail` is the one caller that claims it.
    expect(wrapperClasses(onGround('everymen', card, true))).toContain('alb-prism')
  })

  it('keeps the drifting spectrum edge on a busy ground — the edge is CHROME', () => {
    // Both cards wear a masked spectrum ring and neither may lose it: it is one
    // shared rule across eight mounts (#2407/#2499), and it is the motion that
    // keeps ADR-0048's tell alive on a card that has gone plain.
    const plain = onGround('everymen', card)
    expect(plain).toMatch(/alb-task-edge|alb-praxis-card-edge/)
  })

  it('goes BARE where the prism is not worn — no substitute texture', () => {
    // "Either burst, or plain" (owner, 2026-08-17). Strip the class from the worn
    // card and what is left is the plain card, byte for byte: the two differ by
    // the ground and by nothing else. This is the assertion that would have gone
    // vacuous if the branch had been left calling the hook and doing nothing —
    // `worn` and `plain` would simply be equal, and the previous shape of this
    // test (strip the ornament SPANS) would have reported that as a pass.
    const worn = onGround(null, card)
    const plain = onGround('everymen', card)
    expect(worn, 'the worn card must actually differ').not.toEqual(plain)
    expect(worn.replace(' alb-prism', '')).toEqual(plain)
  })
})

it('draws no spark on any ground — the twinkle is not in the kit (#2555)', () => {
  // #842 gave this card three twinkling ✦ as "the other half of the tell". The
  // owner ruled the twinkle out of the kit: a DELETION, not a quieter twinkle,
  // so what is asserted is that no ground grows one back — the busy one included,
  // since that is where the glyph used to be the last thing left.
  //
  // What a plain Albescent card carries instead is the travelling spectrum edge
  // asserted above. That is ADR-0083's claim exactly: Albescent's delta over na
  // is MOTION across one ornament vocabulary, not a mark of its own.
  for (const ground of [null, 'everymen', 'albescent'] as const) {
    expect(onGround(ground, praxisCard), 'the spark is back').not.toContain('alb-spark')
  }
})

it('draws no ornament SPAN for the ground on either card', () => {
  // The mechanism itself, asserted rather than described. If a future edit
  // reaches for an overlay again — for this faction or on one of these two
  // surfaces — the two cards can diverge again exactly the way the owner
  // reported, and the alternation gets a second mechanism to keep in step.
  for (const [, card] of CARDS) {
    const html = onGround(null, card)
    for (const gone of ['alb-rainbow', 'alb-task-aurora']) {
      expect(html, `${gone} is back as a span`).not.toContain(gone)
    }
  }
})

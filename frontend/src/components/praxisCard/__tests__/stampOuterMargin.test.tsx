/**
 * #2655 — LAW 09: A TRAVELLING PIECE OWNS NO OUTER MARGIN. It owns its own box;
 * the host owns every gap.
 *
 * `ScoreStamp` is the worked example: one dispatched surface (ADR-0049) mounted
 * by the desktop praxis card, the eight praxis-detail archetypes, the eight
 * task-detail worth cells and the composer's task slip. Four hosts, nine skins.
 *
 * ### The seam
 *
 * The markup a HOST emits around the stamp, and the ROOT element each skin
 * emits. Both halves are assertable in this suite's SSR-only harness
 * (`renderToStaticMarkup`, no layout engine): the law is about which box
 * DECLARES the spacing, and a declaration survives without a layout pass.
 *
 * ### What was actually wrong (measured on `origin/main`, 2026-08-25)
 *
 * Not what the plan said. No stamp root declared an outer margin — the defect
 * was the mirror image: two hosts declared no gap at all.
 *
 *  - `PraxisBody`'s heading row states `gap: var(--space-md)`, which on a flex
 *    ROW is HORIZONTAL only. `MetataskSeal` is the row's immediate next sibling
 *    with margin 0 on both boxes, so a sealed praxis put its seals hard against
 *    the bottom edge of the stamp on all nine cards.
 *  - `EphemeristsPraxisCard` was the one frame in nine opening its body at
 *    `padding-top: 0`, so the stamp's box sat ON the cornice. #2360 saw the
 *    symptom, ruled that the frame could not state a top rung (the crown's
 *    `-13` overhang is measured off the stamp's box) and put the air on the
 *    TITLE instead — the piece's own drawing dictating the host's padding,
 *    which is the law read backwards.
 *
 * The other three hosts measured CLEAN and are asserted here so they stay that
 * way: every praxis-detail panel pads `var(--space-lg)` under its centring div
 * and heads it with a `margin-bottom`; every task-detail worth cell is a padded
 * `innerBox`; the composer slip wraps with `gap: var(--space-lg)`, which on a
 * wrapped flex row is the row gap too.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import type { ReactElement } from 'react'
import '../../../i18n'
import type { PraxisCardOut } from '../../../api/praxis'
import { aPraxisCard, aTask } from '../../../test/fixtures'
import { PraxisBody } from '../desktop/shared'
import EphemeristsPraxisCard from '../desktop/EphemeristsPraxisCard'
import AlbescentScoreStamp from '../scoreStamp/AlbescentScoreStamp'
import CovenScoreStamp from '../scoreStamp/CovenScoreStamp'
import DefaultScoreStamp from '../scoreStamp/DefaultScoreStamp'
import EphemeristsScoreStamp from '../scoreStamp/EphemeristsScoreStamp'
import EverymenScoreStamp from '../scoreStamp/EverymenScoreStamp'
import SingularityScoreStamp from '../scoreStamp/SingularityScoreStamp'
import SnideScoreStamp from '../scoreStamp/SnideScoreStamp'
import UaScoreStamp from '../scoreStamp/UaScoreStamp'
import WowScoreStamp from '../scoreStamp/WowScoreStamp'

const render = (node: ReactElement) =>
  renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>)

/** The `style` attribute of the first element matching `pattern`. */
function styleOf(html: string, pattern: RegExp): string {
  const tag = html.match(pattern)
  expect(tag, `no element matched ${pattern}`).toBeTruthy()
  return tag![0].match(/style="([^"]*)"/)?.[1] ?? ''
}

/**
 * Any margin declaration at the START of a property — `margin`, `margin-top`,
 * `margin-block-start`, the lot. Anchored to a `;` or the string head so
 * `--wz-margin`-ish custom properties and inner-element markup cannot match.
 */
const OUTER_MARGIN = /(^|;)\s*margin/

/**
 * All nine registered skins. Albescent is a WRAPPER over `DefaultScoreStamp`
 * (six lines, `class="alb-stamp alb-moves"`) and is included precisely because
 * a wrapper is the cheapest place to hide an outer margin. `.alb-stamp`
 * declares nothing in `index.css` and `.alb-moves` is transform/filter only.
 */
const STAMPS = {
  albescent: AlbescentScoreStamp,
  coven: CovenScoreStamp,
  default: DefaultScoreStamp,
  ephemerists: EphemeristsScoreStamp,
  everymen: EverymenScoreStamp,
  singularity: SingularityScoreStamp,
  snide: SnideScoreStamp,
  ua: UaScoreStamp,
  wow: WowScoreStamp,
}

/** A praxis with every term in play, so no skin renders a reduced box. */
const scored = (over: Partial<PraxisCardOut> = {}): PraxisCardOut =>
  aPraxisCard({
    score: 13.6,
    task_point_value: 12,
    display_multiplier: 0.8,
    points_from_votes: 4,
    ...over,
  })

describe('the stamp owns no outer margin (#2655, law 09)', () => {
  // The ROOT element only. Every skin spaces its OWN parts — the Ephemerists
  // rose's `margin: var(--space-sm) auto 0`, Snide's rule, Coven's plate — and
  // that is a decision inside a box whose outside edge is the host's business.
  it.each(Object.entries(STAMPS))('%s declares none on its root', (_slug, Stamp) => {
    const root = styleOf(render(<Stamp praxis={scored()} />), /^<[a-z]+[^>]*>/)
    expect(root).not.toMatch(OUTER_MARGIN)
  })

  // A crowned praxis is the state that tempts one: the crown hangs at
  // `top: -13` outside the box, and "make room for it" is a margin waiting to
  // be written. The overhang is the DESIGN (#2122/#2240) and stays a negative
  // offset on an absolutely-positioned child.
  it.each(Object.entries(STAMPS))('%s declares none when crowned', (_slug, Stamp) => {
    const html = render(<Stamp praxis={scored({ is_top_for_task: true })} showCrown />)
    expect(styleOf(html, /^<[a-z]+[^>]*>/)).not.toMatch(OUTER_MARGIN)
  })
})

describe('the praxis card states the gap under the stamp (#2655)', () => {
  const head = (over: Partial<PraxisCardOut> = {}) =>
    styleOf(
      render(<PraxisBody praxis={scored(over)} tint="var(--color-text-primary)" muted="var(--color-text-secondary)" />),
      /^<div[^>]*>/,
    )

  it('the heading row declares a vertical gap of its own', () => {
    // `gap` on this row is horizontal — text column to stamp — and says nothing
    // about what follows the row. This is the declaration `MetataskSeal` lands
    // on. It COLLAPSES with `PraxisStats`'s existing `margin-top: var(--space-sm)`
    // when no seal is between them, so an unsealed card is unmoved.
    expect(head()).toContain('margin-bottom:var(--space-sm)')
  })

  it('the gap does not depend on there being a seal to catch it', () => {
    const sealed = head({ applied_metatasks: [aTask({ metatask_faction_slug: 'coven' })] })
    expect(sealed).toContain('margin-bottom:var(--space-sm)')
    expect(sealed).toBe(head())
  })
})

/** The steward bar's props, which every frame takes and none of these read. */
const adminProps = {
  praxis: aPraxisCard(),
  showAdminControls: false,
  onHide: () => {},
  onDelete: () => {},
} as unknown as Parameters<typeof EphemeristsPraxisCard>[0]['adminProps']

describe('the Ephemerists frame states the gap above the stamp (#2655)', () => {
  it('the leaf opens on a rung rather than at zero', () => {
    const html = render(
      <EphemeristsPraxisCard
        praxis={scored({ task_faction_slug: 'ephemerists' })}
        adminProps={adminProps}
      />,
    )
    // #2360 put this rung on the TITLE because the frame "could not" state it.
    // It can: `var(--space-sm)` is 8px against the crown's 13px overhang, so
    // the crown still breaks the cornice (#2240) and the title still opens at
    // the same 24px — `var(--space-sm)` here plus `var(--space-lg)` there.
    expect(html).toContain('padding:var(--space-sm) var(--space-xl) var(--space-lg)')
    expect(html).not.toContain('padding:0 var(--space-xl) var(--space-lg)')
  })
})

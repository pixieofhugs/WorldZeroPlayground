/**
 * #2655 — LAW 09: a travelling piece owns no outer margin; the host owns every
 * gap. `ScoreStamp` (ADR-0049) is the worked example. SSR checks which box
 * DECLARES spacing. The defect was hosts declaring none: the praxis body's
 * heading row `gap` is horizontal only (seals sat flush under the stamp), and
 * the Ephemerists leaf opened at zero padding (#2360 compensated on the title).
 * Other hosts (praxis/task detail, composer slip) measured clean and are left
 * unasserted; a host later dropping its own padding is a known gap.
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

/** A margin property at a declaration start; anchored so custom properties can't match. */
const OUTER_MARGIN = /(^|;)\s*margin/

/** All nine skins. Albescent wraps `DefaultScoreStamp`, the cheapest place to hide a margin. */
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
  // Root only; a skin spacing its own parts is its own business.
  it.each(Object.entries(STAMPS))('%s declares none on its root', (_slug, Stamp) => {
    const root = styleOf(render(<Stamp praxis={scored()} />), /^<[a-z]+[^>]*>/)
    expect(root).not.toMatch(OUTER_MARGIN)
  })

  // A crown (`top: -13`, #2122/#2240) tempts a margin; it stays a negative offset.
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
    // Collapses with `PraxisStats`'s `margin-top` when unsealed, so nothing moves.
    expect(head()).toContain('margin-bottom:var(--space-sm)')
  })

  it('the gap does not depend on there being a seal to catch it', () => {
    const sealed = head({ applied_metatasks: [aTask({ metatask_faction_slug: 'coven' })] })
    expect(sealed).toContain('margin-bottom:var(--space-sm)')
    expect(sealed).toBe(head())
  })
})

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
    // 8px against the crown's 13px overhang; 8 + 16 keeps the title at 24px.
    expect(html).toContain('padding:var(--space-sm) var(--space-xl) var(--space-lg)')
    expect(html).not.toContain('padding:0 var(--space-xl) var(--space-lg)')
  })
})

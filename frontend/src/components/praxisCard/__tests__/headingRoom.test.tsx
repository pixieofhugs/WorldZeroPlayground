/**
 * #2114 — the praxis card's heading row, and how little of it the preview got.
 *
 * The row is `[text column] [score stamp]`. The text column was `flex: 1` —
 * basis 0% — and every stamp declared `flex-shrink: 0` behind a 150px cap, so
 * the row never had negative free space to distribute and the stamp held its
 * full width at EVERY card width: 184px of text at the 394px `frameBase`
 * default, 110px in a 320px cell, 70px at the 280px phone floor. The excerpt
 * ran out of words before the card ran out of card.
 *
 * WHAT THESE PIN IS THE FLEX CONTRACT, not a rendered width: the suite is
 * `renderToStaticMarkup` with no layout engine behind it, so the seam that can
 * be asserted is the declaration each side makes. Both halves are load-bearing
 * and neither works alone — a basis on the text column with a frozen stamp
 * still cannot shrink anything, and an unfrozen stamp beside a basis-0 column
 * never sees a deficit to shrink into.
 *
 * The FLOOR is deliberately not asserted: every stamp's `min-width` stays
 * `auto`, which is its own drawn min-content size, so each skin gives up
 * exactly the slack it has (the na plate's padding around a 96px mark) and no
 * more (Coven's arched plate, which is 150px of ornament and yields nothing).
 * A number here would be a second, rottable copy of eight bespoke geometries.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import i18n from '../../../i18n'
import type { PraxisCardOut } from '../../../api/praxis'
import { PraxisBody, TEXT_MEASURE } from '../desktop/shared'
import { aPraxisCard } from '../../../test/fixtures'
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

const body = (over: Partial<PraxisCardOut> = {}) =>
  render(<PraxisBody praxis={aPraxisCard(over)} tint="#000" muted="#555" />)

const text = (html: string) => html.replace(/<[^>]*>/g, '')

/** The `style` attribute of the first element matching `pattern`. */
function styleOf(html: string, pattern: RegExp): string {
  const tag = html.match(pattern)
  expect(tag, `no element matched ${pattern}`).toBeTruthy()
  return tag![0].match(/style="([^"]*)"/)?.[1] ?? ''
}

/** Every registered stamp skin, so the freeze cannot come back in one file. */
const STAMPS = {
  coven: CovenScoreStamp,
  default: DefaultScoreStamp,
  ephemerists: EphemeristsScoreStamp,
  everymen: EverymenScoreStamp,
  singularity: SingularityScoreStamp,
  snide: SnideScoreStamp,
  ua: UaScoreStamp,
  wow: WowScoreStamp,
}

describe('the heading row can redistribute (#2114)', () => {
  it('the text column asks for a measure rather than a basis of zero', () => {
    // `flex: 1` is `1 1 0%`: the column starts at nothing and grows into
    // whatever the stamp leaves, which is why the stamp never had to yield.
    expect(body()).toContain(`flex:1 1 ${TEXT_MEASURE}px`)
  })

  // The ROOT element only: several skins freeze an inner piece against their own
  // ornament (the Singularity readout, the Ephemerists rose), which is a
  // decision inside a box whose outer size is already settled.
  it.each(Object.entries(STAMPS))('the %s stamp is not frozen', (_slug, Stamp) => {
    const root = styleOf(render(<Stamp praxis={aPraxisCard({ score: 16 })} />), /^<[a-z]+[^>]*>/)
    expect(root).not.toContain('flex-shrink:0')
  })
})

describe('the task line and the excerpt are told apart (#2114)', () => {
  const withExcerpt = () => body({ body_text: 'A short account of the sweeping.' })

  it('the task reference takes the sheet ink and the excerpt stays muted', () => {
    const html = withExcerpt()
    const task = styleOf(html, /<a[^>]*href="\/tasks\/\d+"[^>]*>/)
    const excerpt = styleOf(html, /<p[^>]*class="[^"]*card-description[^"]*"[^>]*>/)
    expect(task, 'the task line no longer wears the excerpt colour').not.toContain('#555')
    expect(task).toContain('color:inherit')
    expect(excerpt, 'the excerpt is the quiet one').toContain('#555')
  })
})

describe('the meta line does not restate the stamp (#2114 supersedes #1833)', () => {
  it('drops the points term whenever a stamp is mounted', () => {
    // base 12 + 4 from votes: the stamp prints BASE 12 and totals 16, so the
    // meta line's `12 pts` is the stamp's own base read out a second time.
    const html = text(body({ score: 16, points_from_votes: 4 }))
    expect(html, 'the stamp still carries both figures').toContain('12')
    expect(html, 'the meta line does not').not.toContain(i18n.t('praxis:card.points', { points: 12, count: 12 }))
    expect(html, 'level, mode and date stay').toContain('L2')
    expect(html).toContain('solo')
  })

  it('keeps the points term on a praxis with no stamp at all', () => {
    // #1444 gates the stamp off a `failed` praxis, so the meta line is the only
    // points readout left and suppressing it would leave the card silent.
    const html = text(body({ score: 12, points_from_votes: 0, moderation_status: 'failed' }))
    expect(html, 'no total was banked').not.toContain('12points')
    expect(html, 'so what the task is worth stays').toContain(i18n.t('praxis:card.points', { points: 12, count: 12 }))
  })
})

describe('an unbreakable title stays inside its column (#2556)', () => {
  /*
   * Same row, the other axis. #2114 gave the column a basis so it could SHRINK;
   * this is what happens once it has. `min-width: 0` lets the column go below
   * its content's min-content width, and a title with no space in it — the
   * keysmash the bug was reported on — has a min-content width of the whole
   * word, so it painted straight out of the box and under the stamp beside it.
   *
   * The declaration sits on the COLUMN, not on the title: `overflow-wrap` is
   * inherited, so one line reaches the title, the task line and the excerpt,
   * and all three carry a user-authored string. `anywhere` rather than
   * `break-word` for the reason `.markdown-preview` gives in index.css — it
   * also lets min-content shrink, so the token cannot push the stamp either.
   *
   * Asserted as a declaration, not a rendered width, for the reason at the top
   * of this file: there is no layout engine behind `renderToStaticMarkup`.
   */
  const column = (html: string) =>
    styleOf(html, new RegExp(`<div[^>]*style="[^"]*flex:1 1 ${TEXT_MEASURE}px[^"]*"[^>]*>`))

  it('the text column says where an unbroken run may break', () => {
    expect(column(body({ title: 'a'.repeat(40) }))).toContain('overflow-wrap:anywhere')
  })

  it('without giving back either half of #2114', () => {
    const style = column(body())
    expect(style, 'the column still asks for a measure').toContain(`flex:1 1 ${TEXT_MEASURE}px`)
    expect(style, 'and still yields rather than push the stamp off').toContain('min-width:0')
  })
})

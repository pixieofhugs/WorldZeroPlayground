/**
 * #2114 — the heading row `[text column] [score stamp]` starved the text: a
 * basis-0 column beside a frozen stamp never redistributed. Pins the flex
 * contract (both halves; neither works alone). The floor is not asserted: each
 * stamp's `min-width: auto` is its own drawn size.
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
    // `flex: 1` is `1 1 0%`: the stamp never had to yield.
    expect(body()).toContain(`flex:1 1 ${TEXT_MEASURE}px`)
  })

  // Root only; inner pieces may freeze against their own ornament.
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
    // The stamp prints BASE 12, so `12 pts` would repeat it.
    const html = text(body({ score: 16, points_from_votes: 4 }))
    expect(html, 'the stamp still carries both figures').toContain('12')
    expect(html, 'the meta line does not').not.toContain(i18n.t('praxis:card.points', { points: 12, count: 12 }))
    expect(html, 'level, mode and date stay').toContain('L2')
    expect(html).toContain('solo')
  })

  it('keeps the points term on a praxis with no stamp at all', () => {
    // #1444: no stamp on `failed`, so the meta line is the only points readout.
    const html = text(body({ score: 12, points_from_votes: 0, moderation_status: 'failed' }))
    expect(html, 'no total was banked').not.toContain('12points')
    expect(html, 'so what the task is worth stays').toContain(i18n.t('praxis:card.points', { points: 12, count: 12 }))
  })
})

describe('an unbreakable title stays inside its column (#2556)', () => {
  /*
   * #2556: `min-width: 0` lets a spaceless title overflow under the stamp. The
   * fix sits on the COLUMN (`overflow-wrap` inherits to title, task line and
   * excerpt); `anywhere` not `break-word`, so min-content shrinks too.
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

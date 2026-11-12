/**
 * The Ephemerists points plate is a COMPASS ROSE (#2037). Markup proves the swap;
 * a source scan proves the rose is DRAWN ONCE (#1654) — a transcription would
 * render perfectly and drift on the first redraw.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import { sourceFiles } from '../../../test/sourceScan'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

// Imported after the mock is registered.
import EphemeristsTaskCard from '../EphemeristsTaskCard'
import { aTask } from '../../../test/fixtures'

const TASK = aTask({ in_progress_count: 2 })

/** North needle: the one filled point, and the rose's signature. */
const NORTH = 'M50 8 L55.5 26 L44.5 26 Z'
/** The stepped octagon the rose replaces on THIS surface. */
const OCTAGON = 'M30 4 L70 4 L96 30'
const HEX = /#[0-9a-fA-F]{3,8}\b/

function render(formFactor: 'mobile' | 'desktop'): string {
  mocks.formFactor = formFactor
  return renderToStaticMarkup(
    <MemoryRouter>
      <EphemeristsTaskCard
        task={TASK}
        basePoints={TASK.point_value}
        multiplier={1}
        inProgressCount={TASK.in_progress_count}
        onSignup={() => {}}
      />
    </MemoryRouter>,
  )
}

describe('the Ephemerists points plate is a compass rose (#2037)', () => {
  it('strikes the rose and no longer cuts the octagon', () => {
    const html = render('desktop')
    expect(html, 'the rose').toContain(NORTH)
    expect(html, 'the octagon it replaces').not.toContain(OCTAGON)
  })

  it('grows the plate so the figure clears the needles, on both form factors', () => {
    // Clear field is 48% of the box (needles reach 26/74 of 100 units).
    expect(render('desktop')).toContain('width="128" height="128"')
    expect(render('mobile')).toContain('width="112" height="112"')
  })

  it('paints the rose from tokens only', () => {
    const html = render('desktop')
    const opened = html.indexOf('width="128" height="128"')
    expect(opened, 'the rose is mounted at all').toBeGreaterThan(-1)
    expect(html.slice(opened, html.indexOf('</svg>', opened))).not.toMatch(HEX)
  })

  it('leaves the unit a single replaceable node for the script rotation (#2038)', () => {
    const html = render('desktop')
    expect(html.match(/data-points-label="ephemerists"/g)).toHaveLength(1)
    expect(html).toContain(i18n.t('feed:taskCard.pointsUnit', { count: TASK.point_value }))
  })
})

/** One ink at one weight on the three open needles; only north filled (#2067). */
describe('the rose says which way is up exactly once (#2067)', () => {
  /** The `fill`/`stroke` on the `<path>` whose `d` is given. */
  function needle(html: string, d: string): string {
    const at = html.indexOf(`d="${d}"`)
    expect(at, `the ${d} needle is drawn`).toBeGreaterThan(-1)
    return html.slice(at, html.indexOf('/>', at))
  }

  const SOUTH = 'M50 92 L55.5 74 L44.5 74 Z'
  const EAST = 'M8 50 L26 44.5 L26 55.5 Z'
  const WEST = 'M92 50 L74 44.5 L74 55.5 Z'

  it('fills north in the faction MARK, not the plate gold and not the teal', () => {
    // 7.59:1 on the disc in both cascades (#2145).
    const north = needle(render('desktop'), NORTH)
    expect(north).toContain('fill="var(--faction-ephemerists-plate-band-ink)"')
    expect(north).not.toContain('nile')
    expect(north).not.toContain('plate-gold')
  })

  it('outlines the other three in one ink at one weight', () => {
    const html = render('desktop')
    for (const d of [SOUTH, EAST, WEST]) {
      const open = needle(html, d)
      expect(open, d).toContain('fill="none"')
      // Rule brass is one value on every ground: 3.73:1 here, clear of 3:1 (#2145).
      expect(open, d).toContain('stroke="var(--faction-ephemerists-plate-brass-rule)"')
      expect(open, d).toContain('stroke-width="0.9"')
    }
  })
})

/** #1654: the path string catches a renamed or inlined copy a name sweep misses. */
describe('the rose is drawn in exactly one file', () => {
  const KIT = fileURLToPath(
    new URL('../../factionMarks/ephemeristsPlate.tsx', import.meta.url),
  )

  it('declares the needle path only in the kit', () => {
    const found = sourceFiles().filter((path) => readFileSync(path, 'utf8').includes(NORTH))
    expect(found).toEqual([KIT])
  })
})

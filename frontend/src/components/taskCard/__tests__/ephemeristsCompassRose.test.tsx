/**
 * Task cards v3, Phase 2 — the Ephemerists points plate becomes a COMPASS ROSE
 * (#2037, epic #2027).
 *
 * THE SEAM is the card's rendered markup (`renderToStaticMarkup`; this repo has
 * no jsdom, so effects never run and geometry is out of reach) plus, for the one
 * property markup cannot see, the SOURCE tree. Both halves are needed and they
 * catch different failures:
 *
 *   • markup says the card mounts the rose and no longer cuts the octagon —
 *     a swap that renders is the whole issue;
 *   • the source scan says the rose is DRAWN ONCE. That is `ephemeristsPlate`'s
 *     standing rule (#1654) and it is about to matter again: #2042 propagates
 *     this mark to the praxis card's score stamp, which strikes the identical
 *     medallion today. A transcription there would render perfectly and drift
 *     the first time the rose is redrawn — invisible to the import graph, and
 *     invisible to every markup assertion in the repo.
 *
 * This file is deliberately its own, not an append to `taskCardsV3.test.tsx`:
 * six sibling faction passes are in flight against that shared table.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

// Imported after the mock is registered.
import EphemeristsTaskCard from '../EphemeristsTaskCard'
import { aTask } from '../../../test/fixtures'

const TASK = aTask({ in_progress_count: 2 })

/** The rose's north needle — the one filled point, and its signature. */
const NORTH = 'M50 8 L55.5 26 L44.5 26 Z'
/** The stepped octagon the rose replaces on THIS surface. */
const OCTAGON = 'M30 4 L70 4 L96 30'
/** No hex may reach the markup — every colour is a token. */
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
    // The needles reach in to 26 and 74 of a 100-unit viewBox, so the clear
    // field is 48% of the box: 61px of the design's 128, against the 50px the
    // 104px octagon left. The phone keeps the ratio the two sizes always had.
    expect(render('desktop')).toContain('width="128" height="128"')
    expect(render('mobile')).toContain('width="112" height="112"')
  })

  it('paints the rose from tokens only', () => {
    // Scoped to the rose's own <svg>, so a hex smuggled into it is not excused
    // by the rest of the card being clean.
    const html = render('desktop')
    const opened = html.indexOf('width="128" height="128"')
    expect(opened, 'the rose is mounted at all').toBeGreaterThan(-1)
    expect(html.slice(opened, html.indexOf('</svg>', opened))).not.toMatch(HEX)
  })

  it('leaves the unit a single replaceable node for the script rotation (#2038)', () => {
    // Phase 3 turns this one span through five scripts and has to pin its box
    // before it starts. It stays HTML on the type ramp rather than a <text>
    // node inside the rose's viewBox for exactly that reason, and it stays
    // ONE node so the rotation has somewhere to hook.
    const html = render('desktop')
    expect(html.match(/data-points-label="ephemerists"/g)).toHaveLength(1)
    expect(html).toContain(i18n.t('feed:taskCard.pointsUnit'))
  })
})

/**
 * THE THREE NEEDLE VALUES (#2067). The rose shipped saying "north" three ways —
 * north filled in the register's teal, south outlined in `-brass` at 0.9, east
 * and west outlined in `-brass-light` at 0.7 — where the design says it once:
 * one ink at one weight on the three open needles, and only north filled.
 *
 * Asserted on the RENDERED needle paths rather than on the file, because the
 * question is which ink reaches which of four otherwise identical triangles, and
 * the paths are what carry the answer to the screen.
 */
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

  it('fills north in the plate gold, not the register teal', () => {
    // 13.07:1 on the rose's own disc against the teal's 7.36:1 — the one point
    // that carries meaning is also the one that reads first. The design's OTHER
    // file draws this navy (`-plate-nile`'s 1.64:1 fallback), which would make
    // the needle invisible; the gold file is the one naming a variable.
    const north = needle(render('desktop'), NORTH)
    expect(north).toContain('fill="var(--faction-ephemerists-plate-gold)"')
    expect(north).not.toContain('plate-nile')
  })

  it('outlines the other three in one ink at one weight', () => {
    const html = render('desktop')
    for (const d of [SOUTH, EAST, WEST]) {
      const open = needle(html, d)
      expect(open, d).toContain('fill="none"')
      expect(open, d).toContain('stroke="var(--faction-ephemerists-plate-brass-light)"')
      expect(open, d).toContain('stroke-width="0.9"')
    }
  })
})

/**
 * #1654's rule, applied ahead of the surface that is about to want the mark.
 * The path string is the sharp half: a copy can be renamed, inlined or split up
 * and a component-name sweep misses it; the north needle is the same 24
 * characters however it is smuggled.
 */
describe('the rose is drawn in exactly one file', () => {
  const KIT = fileURLToPath(
    new URL('../../factionMarks/ephemeristsPlate.tsx', import.meta.url),
  )
  const SRC = fileURLToPath(new URL('../../..', import.meta.url))

  it('declares the needle path only in the kit', () => {
    const found: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '__tests__') continue
        const full = join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (/\.tsx?$/.test(entry.name) && readFileSync(full, 'utf8').includes(NORTH)) {
          found.push(full)
        }
      }
    }
    walk(SRC)
    expect(found).toEqual([KIT])
  })
})

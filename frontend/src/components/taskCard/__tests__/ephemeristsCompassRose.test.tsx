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
    expect(html).toContain(i18n.t('feed:taskCard.pointsUnit', { count: TASK.point_value }))
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

  it('fills north in the faction MARK, not the plate gold and not the teal', () => {
    // It moved gold -> `-plate-band-ink` in #2145, which is the move this file
    // predicted: the faction's ink is BRASS since #2140 and the rose carries the
    // total, so gold here would have been the last place the old identity
    // survived. 7.59:1 on the disc, in BOTH cascades, against gold's 13.07 —
    // this spends contrast on purpose and stays far clear of any floor.
    //
    // The design's OTHER file drew this needle navy (the register's aqua, 1.64:1
    // on the disc), which would make it invisible; #2141 deleted that token
    // outright, so the assertion below is the only reading the rose has.
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
      // `-brass-light` stood here and was the FORKED half of a theme-invariant
      // ground: it flips (#6f5620 / #e6c877) and `-plate-disc` does not, so the
      // three open needles read 2.63:1 in light and ~11:1 in dark. The rule
      // brass (#2141) is one value on all three of the faction's grounds —
      // 3.73:1 on this one, clear of the 3:1 a non-text mark owes (#2145).
      expect(open, d).toContain('stroke="var(--faction-ephemerists-plate-brass-rule)"')
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

  it('declares the needle path only in the kit', () => {
    const found = sourceFiles().filter((path) => readFileSync(path, 'utf8').includes(NORTH))
    expect(found).toEqual([KIT])
  })
})

/**
 * A CHAMFERED PLATE IS FRAMED BY ITS GROUND, NEVER BY A BORDER (#2150, #2314).
 *
 * `stepClip` cuts the top-left and bottom-right corners, and `clip-path` cuts an
 * element at its BORDER BOX — so a `border` is shaved away along both diagonals
 * and the plate ships with two open corners and a rule that stops short. #1638
 * found this on the vote plate and fixed it there, in a comment; #2314 is the
 * owner reporting the same defect on the score stamp ("gold border is missing on
 * the sides"); #2150 is the class.
 *
 * ## Three seams, because the visible defect is not decidable here
 *
 * The harness is `renderToStaticMarkup` with no DOM and no layout, so no test in
 * this repo can see an open corner. A SCREENSHOT is the acceptance. What is
 * decidable is the structure that produces the corner, and it is asserted at the
 * three levels a future edit can break it:
 *
 *  1. **The arithmetic**, as a pure function. `chamferSheetLeg` is the part an
 *     edit gets wrong, because an equal leg looks obviously right and reopens
 *     both corners.
 *  2. **The rendered markup** of a surface that had the bug — the mount/sheet
 *     pair, the rule brass, and the absence of any `border` on either.
 *  3. **The source tree**, which is the only place the CLASS is visible. A
 *     markup assertion pins the plates that exist today; the failure mode #2150
 *     describes is the NEXT plate hand-rolling a chamfer and a border again.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import type { PraxisCardOut } from '../../../api/praxis'
import EphemeristsScoreStamp from '../../praxisCard/scoreStamp/EphemeristsScoreStamp'
import { chamferMount, chamferSheet, chamferSheetLeg } from '../ephemeristsPlate'
import { sourceFiles, stripComments } from '../../../test/sourceScan'

/** The rule brass — a frame is a line, so never the mark brass (#2141/#2142). */
const RULE = 'var(--faction-ephemerists-plate-brass-rule)'

/** Every `clip-path: polygon(Npx 0, …)` leg in a rendered string, in order. */
function legs(html: string): number[] {
  return [...html.matchAll(/clip-path:polygon\(([\d.]+)px 0/g)].map(([, n]) => Number(n))
}

function praxis(overrides: Record<string, unknown> = {}): PraxisCardOut {
  return {
    task_point_value: 12,
    display_multiplier: 1.5,
    metatask_points: 3,
    points_from_votes: 4,
    habit_bonus_points: 0,
    is_top_for_task: false,
    score: 26.5,
    ...overrides,
  } as PraxisCardOut
}

describe('the leg arithmetic (#2150)', () => {
  /**
   * An inset chamfer with an EQUAL leg puts the sheet's cut corner ON the
   * mount's, and the frame opens at both corners exactly as the clipped border
   * did. The shortening is `inset × (2 − √2)`, which is what makes the brass
   * read the same width across the diagonal as it does down the straights.
   */
  it('shortens the sheet leg by inset × (2 − √2), never by inset', () => {
    expect(chamferSheetLeg(7)).toBeCloseTo(7 - (2 - Math.SQRT2), 10)
    expect(chamferSheetLeg(7)).toBeCloseTo(6.41421356, 6)
    // The trap, stated: not `step - inset`, and not `step` either.
    expect(chamferSheetLeg(7)).not.toBeCloseTo(6, 3)
    expect(chamferSheetLeg(7)).not.toBeCloseTo(7, 3)
  })

  it('scales with the inset, so the formula holds at any rule width', () => {
    expect(chamferSheetLeg(7, 2)).toBeCloseTo(7 - 2 * (2 - Math.SQRT2), 10)
    expect(chamferSheetLeg(7, 0)).toBe(7)
  })

  /**
   * The geometric claim, restated as a measurement rather than as the formula
   * again: `stepClip(s)` cuts along `x + y = s`, the sheet's clip cuts along
   * `x + y = t + 2i` in the mount's coordinates, and the perpendicular distance
   * between them must equal the inset — otherwise the diagonal draws a
   * different width from the straights, which is the taper #1638 tolerated.
   */
  it('puts the diagonal exactly one inset from the mount, like the straights', () => {
    for (const step of [5, 6, 7, 12]) {
      const inset = 1
      const gap = Math.abs(chamferSheetLeg(step, inset) + 2 * inset - step) / Math.SQRT2
      expect(gap, `step ${step}`).toBeCloseTo(inset, 10)
    }
  })
})

describe('the treatment emits a ground and an inset sheet, never a border (#2150)', () => {
  it('mounts the RULE brass and clips the sheet exactly one step tighter', () => {
    const mount = chamferMount(7)
    const sheet = chamferSheet(7, 'var(--faction-ephemerists-plate-inner)')
    expect(mount.background).toBe(RULE)
    expect(mount.padding).toBe(1)
    expect(mount.clipPath).toContain('polygon(7px 0')
    // The sheet takes the MOUNT's leg and derives its own, so they cannot drift.
    expect(sheet.clipPath).toContain(`polygon(${chamferSheetLeg(7)}px 0`)
    expect(mount).not.toHaveProperty('border')
    expect(sheet).not.toHaveProperty('border')
  })
})

describe('the Ephemerists score stamp carries its rule through the clip (#2314)', () => {
  const html = (overrides: Record<string, unknown> = {}) =>
    renderToStaticMarkup(<EphemeristsScoreStamp praxis={praxis(overrides)} />)

  /**
   * The owner's report is "gold border is missing on the sides of the score
   * stamps". The panel painted `border: 1px solid ${BRASS}` under `stepClip(7)`
   * and the multiplier chip did the same under `stepClip(5)`.
   */
  it('paints no border on either chamfered element', () => {
    expect(html()).not.toContain('border:1px solid')
  })

  it('pairs every chamfer with a sheet one step tighter', () => {
    // The panel (7) and the ratio chip (5), each a mount followed by its sheet.
    expect(legs(html())).toEqual([
      7,
      chamferSheetLeg(7),
      5,
      chamferSheetLeg(5),
    ])
  })

  it('frames both in the rule brass, not the mark brass', () => {
    const markup = html()
    expect((markup.match(new RegExp(`background:${RULE.replace(/[()]/g, '\\$&')}`, 'g')) ?? []).length)
      .toBe(2)
  })

  it('leaves the panel with no chip when there is no multiplier', () => {
    // One plate, still a pair — the sweep must not depend on the chip existing.
    expect(legs(html({ display_multiplier: 1 }))).toEqual([7, chamferSheetLeg(7)])
  })
})

const KIT = fileURLToPath(new URL('../ephemeristsPlate.tsx', import.meta.url))

/** Every shipped `.ts`/`.tsx` under `src/`, comments stripped, tests skipped. */
function sources(): { path: string; source: string }[] {
  return sourceFiles().map((path) => ({ path, source: stripComments(readFileSync(path, 'utf8')) }))
}

describe('the chamfer has exactly one door (#2150)', () => {
  /**
   * `stepClip` is what the four defective plates called directly, and calling it
   * directly is what let each of them paint a border beside it. It is module
   * private now: the only way to chamfer a plate is `chamferMount` +
   * `chamferSheet`, which cannot emit a border because neither returns one.
   */
  it('leaves no consumer of the raw clip outside the kit', () => {
    const offenders = sources()
      .filter(({ path }) => path !== KIT)
      .filter(({ source }) => /\bstepClip\s*\(/.test(source))
      .map(({ path }) => path)
    expect(offenders).toEqual([])
  })

  /**
   * The other half of the same door, and the one `EphemeristsTaskCard` walked
   * through: its multiplier chip typed the chamfer out by hand rather than
   * calling anything, so an import graph could not see it.
   */
  it('leaves no hand-typed chamfer polygon anywhere', () => {
    const offenders = sources()
      .filter(({ path }) => path !== KIT)
      .filter(({ source }) => /polygon\(\s*[\d.]+px 0/.test(source))
      .map(({ path }) => path)
    expect(offenders).toEqual([])
  })
})

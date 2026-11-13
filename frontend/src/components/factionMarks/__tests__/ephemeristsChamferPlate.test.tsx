/**
 * A chamfered plate is framed by its ground, never a border (#2150, #2314):
 * `clip-path` cuts at the border box, shaving a border off both diagonals.
 * No layout here, so a screenshot is the acceptance; this pins the structure
 * at three levels: the leg arithmetic, the rendered markup of a surface that
 * had the bug, and the source tree (so the next plate can't hand-roll one).
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

/** A frame is a line, so rule brass, never mark brass (#2141). */
const RULE = 'var(--faction-ephemerists-plate-brass-rule)'

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
  /** An equal leg reopens both corners. */
  it('shortens the sheet leg by inset × (2 − √2), never by inset', () => {
    expect(chamferSheetLeg(7)).toBeCloseTo(7 - (2 - Math.SQRT2), 10)
    expect(chamferSheetLeg(7)).toBeCloseTo(6.41421356, 6)
    expect(chamferSheetLeg(7)).not.toBeCloseTo(6, 3)
    expect(chamferSheetLeg(7)).not.toBeCloseTo(7, 3)
  })

  it('scales with the inset, so the formula holds at any rule width', () => {
    expect(chamferSheetLeg(7, 2)).toBeCloseTo(7 - 2 * (2 - Math.SQRT2), 10)
    expect(chamferSheetLeg(7, 0)).toBe(7)
  })

  /** Measured: distance between `x + y = s` and `x + y = t + 2i` must be `i`. */
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
    expect(sheet.clipPath).toContain(`polygon(${chamferSheetLeg(7)}px 0`)
    expect(mount).not.toHaveProperty('border')
    expect(sheet).not.toHaveProperty('border')
  })
})

describe('the Ephemerists score stamp carries its rule through the clip (#2314)', () => {
  const html = (overrides: Record<string, unknown> = {}) =>
    renderToStaticMarkup(<EphemeristsScoreStamp praxis={praxis(overrides)} />)

  it('paints no border on either chamfered element', () => {
    expect(html()).not.toContain('border:1px solid')
  })

  it('pairs every chamfer with a sheet one step tighter', () => {
    // Panel (7) and ratio chip (5).
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
    expect(legs(html({ display_multiplier: 1 }))).toEqual([7, chamferSheetLeg(7)])
  })
})

const KIT = fileURLToPath(new URL('../ephemeristsPlate.tsx', import.meta.url))

function sources(): { path: string; source: string }[] {
  return sourceFiles().map((path) => ({ path, source: stripComments(readFileSync(path, 'utf8')) }))
}

describe('the chamfer has exactly one door (#2150)', () => {
  /** Only `chamferMount` + `chamferSheet`, which return no border. */
  it('leaves no consumer of the raw clip outside the kit', () => {
    const offenders = sources()
      .filter(({ path }) => path !== KIT)
      .filter(({ source }) => /\bstepClip\s*\(/.test(source))
      .map(({ path }) => path)
    expect(offenders).toEqual([])
  })

  it('leaves no hand-typed chamfer polygon anywhere', () => {
    const offenders = sources()
      .filter(({ path }) => path !== KIT)
      .filter(({ source }) => /polygon\(\s*[\d.]+px 0/.test(source))
      .map(({ path }) => path)
    expect(offenders).toEqual([])
  })
})

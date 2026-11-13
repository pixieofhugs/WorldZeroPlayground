/**
 * `EditPraxisState` is BUILT (`anEditPraxisState`), never laundered via
 * `as unknown as` / `as any as` (#2883): the cast hides missing fields. Other
 * wire shapes are out of scope. Comments are stripped; tests are included.
 */
import { describe, expect, it } from 'vitest'
import { sourceFiles, readStripped, toRelative } from '../sourceScan'

/** Any spacing, across lines, `any` or `unknown`, intersections too. */
const LAUNDERED = /\bas\s+(?:unknown|any)\s+as\s+EditPraxisState\b/

/** Split so the samples below aren't this file's own finding (no allowlist needed). */
const STATE = 'EditPraxis' + 'State'

export function filesCastingEditPraxisState(): string[] {
  return sourceFiles({ includeTests: true })
    .filter((path) => LAUNDERED.test(readStripped(path)))
    .map(toRelative)
    .sort()
}

describe('the composer state is built, not cast (#2883)', () => {
  it('is laundered through unknown in no file', () => {
    expect(filesCastingEditPraxisState()).toEqual([])
  })

  /** Guard the guard: an "expect nothing" scan passes forever once broken. */
  it.each([
    `const s = {} as unknown as ${STATE};`,
    `const s = {} as unknown as ${STATE} & { praxis: PraxisOut };`,
    `const s = {} as any as ${STATE}`,
    `  } as unknown as\n    ${STATE}`,
  ])('still recognises %j as the forbidden cast', (sample) => {
    expect(LAUNDERED.test(sample)).toBe(true)
  })

  it('does not fire on the fixture that replaced it', () => {
    expect(LAUNDERED.test('const s = anEditPraxisState({ title: "x" })')).toBe(false)
    expect(LAUNDERED.test('function f(o: Partial<EditPraxisState>) {}')).toBe(false)
  })

  it('walks the test files, where the cast lived', () => {
    // Default `sourceFiles()` skips `__tests__`: that would be a vacuous zero.
    const walked = sourceFiles({ includeTests: true }).map(toRelative)
    expect(walked).toContain(
      'pages/editPraxis/archetypes/__tests__/composerDispatch.test.tsx',
    )
  })
})

/**
 * `EditPraxisState` is BUILT, never cast through `unknown` (#2883, part of #2862).
 *
 * Twenty-six suites used to reach for `as unknown as EditPraxisState` because
 * the type has ~80 members and nobody wanted to write them out. The cost was
 * not the typing — it was that the cast defeats the compiler for the whole
 * object, so a test could hand a control a state missing every field the
 * control reads and still be green. Three of them did: `bodyToolbarTabOrder`,
 * `sharedComposerLayout` and `composerFocusRing` each carried a comment saying
 * "BodyTextarea only reads body/setBody", which #2882 had made false — the
 * control reads five OTHER fields and no `body` at all. Two more assigned
 * `praxis.title` (`string | null` on the wire) to `title` (`string`).
 *
 * #2877's `anEditPraxisState` removed the reason: a suite states its premise and
 * the fixture carries the boring rest. #2882 removed the other one: a control
 * that takes six named fields can be given six named fields. So the cast has no
 * remaining use, and this guard is what keeps the count at zero rather than
 * letting it climb back one convenient suite at a time.
 *
 * SCOPE. Only `EditPraxisState`, and only the `as unknown as` / `as any as`
 * forms — the two ways to launder an arbitrary literal into it. `as TaskOut`,
 * `as unknown as PraxisOut` and the rest of the wire shapes are a separate,
 * larger census and are deliberately untouched here.
 *
 * The scan strips comments first, so this file's own prose above (and the
 * fixture's docstring, which quotes the cast for the same reason) is not a
 * finding. `includeTests: true` because tests are the ONLY place this ever
 * appeared — a guard that skipped `__tests__` would be vacuous.
 */
import { describe, expect, it } from 'vitest'
import { sourceFiles, readStripped, toRelative } from '../sourceScan'

/**
 * `as unknown as EditPraxisState` in any spacing, across a line break, and with
 * `any` in `unknown`'s place. The trailing boundary lets an intersection
 * (`… as unknown as EditPraxisState & { praxis: PraxisOut }`) match too.
 */
const LAUNDERED = /\bas\s+(?:unknown|any)\s+as\s+EditPraxisState\b/

/**
 * The type's name, kept out of the samples below as a literal ON PURPOSE.
 *
 * The samples are code, not comments, so a file that spelled them out would be
 * its own first finding — and the usual answer, allowlisting this path, is the
 * kind of exception that outlives its reason. Interpolating the name instead
 * means this file needs no exemption at all: a REAL cast written here would
 * still be caught.
 */
const STATE = 'EditPraxis' + 'State'

/** Every file under `src/`, tests included, that still launders the state. */
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

  /**
   * Guard the guard. The scan above is an "expect nothing" assertion, which is
   * exactly the shape that passes forever once the walk, the strip or the
   * pattern quietly stops working. This proves the pattern still recognises the
   * thing it forbids, in every spelling the codebase used, without needing a
   * real offender on disk.
   */
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
    // The default `sourceFiles()` skips `__tests__` — a guard about a
    // test-only smell that inherited that default would report a permanent,
    // meaningless zero.
    const walked = sourceFiles({ includeTests: true }).map(toRelative)
    expect(walked).toContain(
      'pages/editPraxis/archetypes/__tests__/composerDispatch.test.tsx',
    )
  })
})

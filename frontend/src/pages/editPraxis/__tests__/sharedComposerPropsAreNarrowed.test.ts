/**
 * The shared composer components name what they read (#2977, tail of #2882).
 *
 * #2882 narrowed all eleven `archetypes/controls.tsx` components to a
 * `Pick<EditPraxisState, …>` of exactly what each one reads, and rebound the 72
 * mounts. Its scope was that one file, so four components living OUTSIDE it kept
 * taking the whole ~80-member state: `PraxisWaitingSurface` and the
 * `metataskSeal` trio, forwarded `state={state}` from all eight archetypes and
 * from the dispatcher.
 *
 * A whole-state prop is not a typing preference. It is the compiler declining to
 * answer the only question that matters at a mount — *does this caller have what
 * this component reads?* — because the answer is trivially yes for every
 * component and every caller. `tsc` is the real guard on the narrowing itself;
 * what it cannot see is a WIDENING back, which compiles perfectly and silently
 * restores the blind spot. That is what this file holds.
 *
 * TWO CLAIMS, because the widening has two shapes:
 *
 *  1. the component re-declares a `state: EditPraxisState` prop, or
 *  2. a mount goes back to forwarding `state={…}` wholesale.
 *
 * SCOPE. These four components and the eight archetypes that mount two of them.
 * `PraxisDetailState` (33 forwards), `TaskDetailState` (27) and `TasksState`
 * (26) are the same idiom and are deliberately untouched — #2882's point was
 * that fixing the largest first SETS the pattern, not that one guard enforces it
 * repo-wide before anyone has done the work.
 *
 * NOT IN SCOPE: `AlbescentEditPraxis`, which renders `<DefaultEditPraxis
 * state={state} />`. That forward is to a component whose prop genuinely IS the
 * whole composer state — every archetype's own signature is `{ state }: { state:
 * EditPraxisState }` — so it is delegation, not a leak. The mount predicate
 * below names the two shared components rather than banning `state={state}`
 * outright, which is why no allowlist is needed for it.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SRC_DIR, sourceFiles, stripComments, toRelative } from '../../../test/sourceScan'

/**
 * The four components #2882 left behind, by path. A literal list rather than a
 * scan: the claim is about these four, and a scan for "components that take a
 * state prop" would have to allowlist every archetype and the dispatcher, which
 * legitimately do.
 */
const NARROWED = [
  'pages/editPraxis/waiting/PraxisWaitingSurface.tsx',
  'components/metataskSeal/MetataskSealStack.tsx',
  'components/metataskSeal/MetataskPicker.tsx',
  'components/metataskSeal/MetataskRemoveConfirm.tsx',
]

/**
 * A prop (or any binding) ANNOTATED as the whole state. `Pick<EditPraxisState,
 * …>` has no colon before the name and is the shape we want, so the colon is
 * what separates the two — and the `import type { EditPraxisState }` these files
 * still need for the `Pick` is not a finding either.
 */
const WHOLE_STATE_ANNOTATION = /:\s*EditPraxisState\b/

/** A mount of either shared component that hands it a `state` prop. */
const WHOLE_STATE_MOUNT =
  /<(?:PraxisWaitingSurface|MetataskSealStack)\b[^>]*\sstate=/

const read = (relativePath: string): string =>
  stripComments(readFileSync(join(SRC_DIR, relativePath), 'utf8'))

/** The eight archetypes that mount the waiting surface and the seal stack. */
function archetypeSources(): { path: string; source: string }[] {
  return sourceFiles({ dir: join(SRC_DIR, 'pages/editPraxis/archetypes') })
    .filter((path) => /EditPraxis\.tsx$/.test(path))
    .map((path) => ({ path: toRelative(path), source: stripComments(readFileSync(path, 'utf8')) }))
}

describe('the shared composer components name what they read (#2977)', () => {
  it('scans all four components, and each one is really on disk', () => {
    // An "expect nothing" assertion over a path list is the shape that passes
    // forever once a file is renamed out from under it. `readFileSync` throws
    // on a missing path, so simply reading them is the presence check.
    expect(NARROWED.map((path) => read(path).length > 0)).toEqual([
      true,
      true,
      true,
      true,
    ])
  })

  it.each(NARROWED)('%s takes no whole-state prop', (path) => {
    expect(WHOLE_STATE_ANNOTATION.test(read(path))).toBe(false)
  })

  it('finds every archetype, so the mount scan cannot be vacuous', () => {
    const paths = archetypeSources().map((file) => file.path)
    // Nine files: the eight that mount these two components, plus Albescent,
    // which delegates to Default and mounts neither.
    expect(paths.length).toBeGreaterThanOrEqual(9)
    expect(paths).toContain('pages/editPraxis/archetypes/CovenEditPraxis.tsx')
    expect(paths).toContain('pages/editPraxis/archetypes/AlbescentEditPraxis.tsx')
  })

  it('no archetype forwards the whole state to either of them', () => {
    const leaking = archetypeSources()
      .filter((file) => WHOLE_STATE_MOUNT.test(file.source))
      .map((file) => file.path)
    expect(leaking).toEqual([])
  })

  /**
   * Guard the guard. Both assertions above expect an empty result, which is
   * exactly the shape that keeps passing after the pattern, the walk or the
   * strip quietly stops working. These prove the patterns still recognise what
   * they forbid — and still ignore what they permit — without an offender on
   * disk.
   */
  it.each([
    'function C({ state }: { state: EditPraxisState }) {}',
    'export interface Props {\n  state: EditPraxisState\n}',
    'const s: EditPraxisState = build()',
  ])('still recognises %j as a whole-state prop', (sample) => {
    expect(WHOLE_STATE_ANNOTATION.test(sample)).toBe(true)
  })

  it('permits the narrowed shapes and the import they need', () => {
    expect(
      WHOLE_STATE_ANNOTATION.test(
        '}: Pick<EditPraxisState, "phase" | "praxis"> & { dress: ComposerDress }) {',
      ),
    ).toBe(false)
    expect(
      WHOLE_STATE_ANNOTATION.test(
        'import type { EditPraxisState } from "../useEditPraxis";',
      ),
    ).toBe(false)
  })

  it.each([
    '<PraxisWaitingSurface state={state} dress={dress} />',
    '<MetataskSealStack state={state} />',
    '<PraxisWaitingSurface\n  state={state}\n  dress={dress}\n/>',
  ])('still recognises %j as a whole-state mount', (sample) => {
    expect(WHOLE_STATE_MOUNT.test(sample)).toBe(true)
  })

  it('leaves the narrowed mount and Albescent’s delegation alone', () => {
    expect(
      WHOLE_STATE_MOUNT.test('<MetataskSealStack appliedMetataskList={state.appliedMetataskList} />'),
    ).toBe(false)
    expect(WHOLE_STATE_MOUNT.test('return <DefaultEditPraxis state={state} />')).toBe(false)
  })
})

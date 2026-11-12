/**
 * #2977 — four shared composer components take a `Pick<EditPraxisState, …>`,
 * not the whole state. `tsc` guards the narrowing; this guards a widening back:
 * (1) a `state: EditPraxisState` prop, (2) a mount forwarding `state={…}`.
 * Albescent's `<DefaultEditPraxis state={state} />` is delegation, not a leak.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SRC_DIR, sourceFiles, stripComments, toRelative } from '../../../test/sourceScan'

const NARROWED = [
  'pages/editPraxis/waiting/PraxisWaitingSurface.tsx',
  'components/metataskSeal/MetataskSealStack.tsx',
  'components/metataskSeal/MetataskPicker.tsx',
  'components/metataskSeal/MetataskRemoveConfirm.tsx',
]

/** The colon separates an annotation from `Pick<EditPraxisState, …>`/imports. */
const WHOLE_STATE_ANNOTATION = /:\s*EditPraxisState\b/

const WHOLE_STATE_MOUNT =
  /<(?:PraxisWaitingSurface|MetataskSealStack)\b[^>]*\sstate=/

const read = (relativePath: string): string =>
  stripComments(readFileSync(join(SRC_DIR, relativePath), 'utf8'))

function archetypeSources(): { path: string; source: string }[] {
  return sourceFiles({ dir: join(SRC_DIR, 'pages/editPraxis/archetypes') })
    .filter((path) => /EditPraxis\.tsx$/.test(path))
    .map((path) => ({ path: toRelative(path), source: stripComments(readFileSync(path, 'utf8')) }))
}

describe('the shared composer components name what they read (#2977)', () => {
  it('scans all four components, and each one is really on disk', () => {
    // `readFileSync` throws on a missing path: the presence check.
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
    // Eight mounters plus Albescent (delegates to Default).
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

  /** Guard the guard: the empty-result assertions above need live patterns. */
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

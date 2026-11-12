/**
 * One directory walk in `src`: `test/sourceScan.ts` (#2887). A private walk that
 * stops reaching files reports a perfect board. Reading a KNOWN path is fine.
 * Not its own finding: the names below sit in an alternation, never before `(`.
 * Comments are stripped before matching.
 */
import { describe, expect, it } from 'vitest'

import { readStripped, sourceFiles, toRelative } from '../sourceScan'

const ENUMERATES_A_DIRECTORY = /\b(?:readdirSync|readdir|opendirSync|opendir|globSync)\s*\(/

/** Shrink-only; an entry needs a written reason. */
const EXEMPT: readonly string[] = [
  // The seam itself.
  'test/sourceScan.ts',
]

const walkers = (): string[] =>
  sourceFiles({ includeTests: true })
    .filter((path) => ENUMERATES_A_DIRECTORY.test(readStripped(path)))
    .map(toRelative)
    .sort()

describe('the directory walk lives in one file (#2887)', () => {
  // Tripwire on a named entry: a scan matching nothing would be a clean board.
  it('still sees the seam, so it cannot pass by matching nothing', () => {
    expect(
      walkers(),
      'the scan no longer finds the shared walk — the pattern or the scan has drifted',
    ).toContain('test/sourceScan.ts')
  })

  it('adds no private walk anywhere under src', () => {
    expect(
      walkers().filter((path) => !EXEMPT.includes(path)),
      'Route this through `sourceFiles()` from `src/test/sourceScan.ts` — it already handles ' +
        'recursion, the `__tests__` skip and path relativising, and a private copy drifts. ' +
        'If it genuinely cannot, add it to EXEMPT with the reason in your PR.',
    ).toEqual([])
  })
})

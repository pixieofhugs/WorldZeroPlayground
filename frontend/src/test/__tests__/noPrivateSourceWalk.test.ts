/**
 * The walk is shut: one directory walk in `frontend/src`, and it is the seam.
 *
 * `src/test/sourceScan.ts` exists because nine guards each carried their own
 * copy of the same recursive walk, and the copies drifted in three directions —
 * some skipped `__tests__`, some did not, one wanted `.css` too. A guard whose
 * private walk silently stopped reaching files reports a perfect board, which
 * is the only failure mode that never gets noticed. Consolidating them fixed
 * that twice (#2885, #2886); nothing stopped a tenth copy appearing, so this is
 * that stop (#2887).
 *
 * The rule is a bright line rather than a judgement: no file under `src` may
 * enumerate a directory. Reading a KNOWN path with `readFileSync` is untouched
 * and stays common — the fragile part was never the read, it was deciding which
 * files to read.
 *
 * WHY THIS FILE IS NOT ITS OWN FINDING. It has to name the calls to look for
 * them, and it does so as an alternation: every name below is followed by `|`
 * or `)`, never by the `(` the pattern requires. Keep it that way — if a future
 * edit writes one of them as a call, this guard fails pointing at itself, which
 * is a loud and accurate way to say the pattern went wrong.
 *
 * Comments are stripped before matching for the same reason: prose above (and
 * in `designSyncSrcMap.test.ts`) names the call while calling nothing.
 */
import { describe, expect, it } from 'vitest'

import { readStripped, sourceFiles, toRelative } from '../sourceScan'

/** A call that enumerates a directory — the first line of any hand-rolled walk. */
const ENUMERATES_A_DIRECTORY = /\b(?:readdirSync|readdir|opendirSync|opendir|globSync)\s*\(/

/**
 * Exempt by construction, with the reason. This list only ever shrinks: a new
 * walk is routed through `sourceFiles()` instead, and an entry is added here
 * only with a written reason in the PR that adds it.
 */
const EXEMPT: readonly string[] = [
  // The seam itself. This IS the walk every other guard borrows.
  'test/sourceScan.ts',
]

/** Every file under `src` that enumerates a directory, as the guards report paths. */
const walkers = (): string[] =>
  sourceFiles({ includeTests: true })
    .filter((path) => ENUMERATES_A_DIRECTORY.test(readStripped(path)))
    .map(toRelative)
    .sort()

describe('the directory walk lives in one file (#2887)', () => {
  // The tripwire, anchored on a named entry rather than a count: this guard's
  // whole output is a list of things that are WRONG, so a scan that stopped
  // matching — a renamed seam, a regex that drifted, a walk that no longer
  // reaches `src/test/` — would report a clean board forever.
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

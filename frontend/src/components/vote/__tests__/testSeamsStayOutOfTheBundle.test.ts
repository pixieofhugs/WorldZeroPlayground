/**
 * #2697: `__reset*` test seams cost zero bytes because Rollup tree-shakes them
 * (removing them leaves `dist/` byte-identical). That holds only while no app
 * module imports one, so any mention of a `__`-prefixed export from non-test
 * code is refused. A text scan, not an AST walk, to stay cheap.
 *
 * Re-verify: delete both seams, `npm run build`, diff `dist/` against `main`.
 */
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { sourceFiles, toRelative } from '../../../test/sourceScan'

/** `setupFiles` helpers, outside the app graph. `toRelative` uses forward slashes. */
const TEST_HELPER_DIR = `test/`

/** Comments name the seams in prose, so they are stripped first. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

const FILES = sourceFiles({ includeTests: true })
  .filter((path) => !/\.test\.tsx?$/.test(path))
  .map((path) => ({
    path: toRelative(path),
    code: withoutComments(readFileSync(path, 'utf8')),
  }))
  .filter(({ path }) => !path.startsWith(TEST_HELPER_DIR))

const SEAMS = FILES.flatMap(({ path, code }) =>
  [...code.matchAll(/^export (?:function|const) (__\w+)/gm)].map((match) => ({
    name: match[1],
    owner: path,
  })),
)

describe('test seams are reachable only from tests (#2697)', () => {
  it('scans the source tree, so a bad path cannot pass this by vacuum', () => {
    expect(FILES.length).toBeGreaterThan(400)
  })

  it('finds the two seams #2697 weighed, so the matcher still matches', () => {
    // Not a whitelist: proof the regex still matches real declarations.
    expect(SEAMS.map((seam) => seam.name)).toEqual(
      expect.arrayContaining(['__resetCastTallies', '__resetPendingCasts']),
    )
  })

  for (const { name, owner } of SEAMS) {
    it(`${name} is imported by no application module`, () => {
      const importers = FILES.filter(
        ({ path, code }) => path !== owner && code.includes(name),
      ).map(({ path }) => path)
      expect(
        importers,
        `${name} is a test seam declared in ${owner}. Importing it from ` +
          `application code puts it in the production bundle — which is what ` +
          `#2697 was filed about, and what the tree-shaking verdict there ` +
          `depends on NOT being true. Use the module's real API instead.`,
      ).toEqual([])
    })
  }
})

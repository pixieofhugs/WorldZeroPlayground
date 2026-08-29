/**
 * The ratchet for #2697: a test seam stays free only while nothing ships it.
 *
 * `castTallies.ts` and `pendingCasts.ts` each export a `__reset*` function that
 * exists purely so one spec cannot see another spec's writes to a module-global
 * Map. #2697 filed them as dead weight in the production bundle. They are not:
 * deleting both and rebuilding produces a byte-identical `dist/` — same
 * content-hashed filenames, same sizes — because Rollup tree-shakes an export
 * that no module in the application graph imports. The seams cost zero shipped
 * bytes, so the six specs that depend on them were left alone.
 *
 * That verdict rests on a fact about the IMPORT GRAPH rather than about the
 * functions, which is why it can stop being true without either module
 * changing a character. A call from reachable application code is the one
 * precondition for shipping a seam — necessary, if not on its own sufficient,
 * since Rollup shakes transitively and an import into a dead branch still
 * goes. Neither module can notice that happening to it: the import lands in
 * some other file, `tsc` is happy, every spec still passes, and a reset hatch
 * that blanks a live store is now something a runtime caller can reach.
 *
 * The import is therefore the thing worth guarding. It is cheap to detect,
 * there is no legitimate reason for one, and refusing it outright keeps the
 * question from having to be re-litigated per call site.
 *
 * So this guards the fact rather than the functions. It finds every `__`-
 * prefixed export declared anywhere under `src/` and refuses any mention of one
 * from a non-test file. Deliberately a text scan and not an AST walk, for the
 * same reason `api/__tests__/noSchemaMirrors.test.ts` is: the whole value is in
 * it being cheap enough to keep.
 *
 * TO RE-VERIFY THE BUILD CLAIM, rather than trusting this docblock: delete both
 * functions, `npm run build`, and diff `dist/` against a build from `main`.
 * Identical output means they are still free.
 */
import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { sourceFiles, toRelative } from '../../../test/sourceScan'

/**
 * Vitest helpers loaded through `setupFiles`, which are not in the application
 * graph and may legitimately hold a shared reset. Exempted by path so the
 * exemption is visible; everything else under `src/` is application code until
 * proven otherwise. `toRelative` always reports forward slashes.
 */
const TEST_HELPER_DIR = `test/`

/**
 * Source with its comments removed, because this file's own reasoning — and the
 * `__reset*` docblocks the two modules carry — name the seams in prose. A scan
 * that forbade the NAME would forbid the explanation of why the name is there.
 * What is left is imports, exports and calls: where a revival would actually
 * live.
 */
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

/** `export function __x` / `export const __x` — a seam and the file that owns it. */
const SEAMS = FILES.flatMap(({ path, code }) =>
  [...code.matchAll(/^export (?:function|const) (__\w+)/gm)].map((match) => ({
    name: match[1],
    owner: path,
  })),
)

describe('test seams are reachable only from tests (#2697)', () => {
  it('scans the source tree, so a bad path cannot pass this by vacuum', () => {
    // Without this, a walk that resolved somewhere empty would give no files,
    // no seams, and a green run that proved nothing at all.
    expect(FILES.length).toBeGreaterThan(400)
  })

  it('finds the two seams #2697 weighed, so the matcher still matches', () => {
    // These are not a whitelist — every seam found is guarded below, and a new
    // one needs no edit here. They are the proof that the regex still works
    // against the real declarations.
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

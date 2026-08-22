/**
 * #2182 — `frontend/.ds-kit/index.tsx` matches what `.design-sync/gen-barrel.mjs`
 * produces from `.design-sync/config.json`.
 *
 * The barrel is a GENERATED artifact that is nonetheless committed, and nothing
 * in CI regenerated it: `typecheck:design-sync` only checks the barrel that is
 * already on disk, so a hand-edit or a missed regeneration stayed green forever
 * and surfaced later as a mystery line in an unrelated diff. That is exactly how
 * #2182 was found — a stray `WowCard` export appeared and disappeared across
 * three PRs and CI never had an opinion either way.
 *
 * This is the frontend twin of `api-schema` (#1584), which runs the OpenAPI
 * generator and diffs `openapi.json` / `schema.d.ts`. It needs no workflow edit:
 * the `frontend` job already runs vitest, the same route `tsconfig.e2e.json`
 * (#1780) took to chain a check onto an existing script.
 *
 * WHY IT GENERATES INTO A TEMP TREE
 * ---------------------------------
 * `gen-barrel.mjs` has no output flag — it writes `frontend/.ds-kit/index.tsx`
 * relative to its cwd. Running it in place would rewrite a TRACKED file as a
 * side effect of a test run, which is a bad neighbour to every other test in
 * the suite (and would make the check pass by overwriting the very thing it is
 * meant to compare). So it runs against a scratch cwd holding the two inputs it
 * reads — `.design-sync/config.json` and `frontend/src/` — and the comparison is
 * made against the committed file, which is never touched.
 *
 * `frontend/src` is linked rather than copied: the generator reads ~270 sources
 * to decide default-vs-named export, and a junction (Windows) / symlink (POSIX)
 * is one syscall instead of 270 copies.
 *
 * WHY STDERR IS NOT A FAILURE SIGNAL
 * ----------------------------------
 * The generator prints `frontend/ds-types missing — run the tsc declaration
 * emit` whenever the gitignored `frontend/ds-types/` tree is absent, which it is
 * on any clean checkout including CI. It exits 0. Treating that output as a
 * failure would red `main` on day one, so only the exit status is checked
 * (`execFileSync` throws on non-zero). The missing tree also means the generator
 * skips its second output, `frontend/index.d.ts`, so nothing else is written.
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, it, expect } from 'vitest'

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url))
const FRONTEND_DIR = join(REPO_ROOT, 'frontend')
const BARREL_PATH = join(FRONTEND_DIR, '.ds-kit', 'index.tsx')
const GENERATOR = join(REPO_ROOT, '.design-sync', 'gen-barrel.mjs')

const scratch = mkdtempSync(join(tmpdir(), 'ds-kit-barrel-'))
afterAll(() => rmSync(scratch, { recursive: true, force: true }))

mkdirSync(join(scratch, '.design-sync'), { recursive: true })
mkdirSync(join(scratch, 'frontend', '.ds-kit'), { recursive: true })
copyFileSync(
  join(REPO_ROOT, '.design-sync', 'config.json'),
  join(scratch, '.design-sync', 'config.json'),
)
// `'junction'` is ignored off Windows, where this is a plain symlink.
symlinkSync(join(FRONTEND_DIR, 'src'), join(scratch, 'frontend', 'src'), 'junction')

/** Runs the real generator against the scratch cwd and returns what it wrote. */
function generateBarrel(): string {
  execFileSync(process.execPath, [GENERATOR], { cwd: scratch, stdio: 'pipe' })
  return readFileSync(join(scratch, 'frontend', '.ds-kit', 'index.tsx'), 'utf8')
}

/** First divergence, as `line N` plus both sides — enough to see what moved. */
function firstDifference(expected: string, actual: string): string {
  const want = expected.split('\n')
  const have = actual.split('\n')
  const at = want.findIndex((line, i) => line !== have[i])
  if (at === -1) return `committed barrel has ${have.length - want.length} extra line(s)`
  return [
    `line ${at + 1}:`,
    `  generator: ${want[at] ?? '(end of file)'}`,
    `  committed: ${have[at] ?? '(end of file)'}`,
  ].join('\n')
}

describe('the committed .ds-kit barrel matches its generator (#2182)', () => {
  it('is byte-identical to what gen-barrel.mjs produces', () => {
    const generated = generateBarrel()
    const committed = readFileSync(BARREL_PATH, 'utf8')
    if (generated !== committed) {
      throw new Error(
        'frontend/.ds-kit/index.tsx does not match what gen-barrel.mjs produces.\n' +
          "Fix: run 'node .design-sync/gen-barrel.mjs' from the repo root and commit the result.\n" +
          firstDifference(generated, committed),
      )
    }
    expect(generated).toEqual(committed)
  })

  it('compares against real generator output, so it cannot pass on an empty file', () => {
    // A generator that silently wrote nothing — or a scratch tree the test built
    // wrong — would otherwise make the assertion above vacuous.
    expect(generateBarrel().split('\n').length).toBeGreaterThan(100)
  })
})

/**
 * #2182 — `frontend/.ds-kit/index.tsx` matches what `.design-sync/gen-barrel.mjs`
 * produces from `.design-sync/config.json`. The barrel is generated but
 * committed; frontend twin of `api-schema` (#1584).
 *
 * The generator writes relative to its cwd (no output flag), so it runs in a
 * scratch tree (`src` symlinked) rather than rewriting the tracked file.
 * Stderr is not a failure: it warns `ds-types missing` on every clean checkout
 * and exits 0; only the exit status counts.
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

function generateBarrel(): string {
  execFileSync(process.execPath, [GENERATOR], { cwd: scratch, stdio: 'pipe' })
  return readFileSync(join(scratch, 'frontend', '.ds-kit', 'index.tsx'), 'utf8')
}

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
    expect(generateBarrel().split('\n').length).toBeGreaterThan(100)
  })
})

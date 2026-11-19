import { readFileSync } from 'node:fs'
import { relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { sourceFiles, SRC_DIR } from '../sourceScan'

const ROOT = fileURLToPath(new URL('../../..', import.meta.url))
const LIST = new URL('../../../.test-source-reads.txt', import.meta.url)
const IMPORTS_FS = /from\s+['"](?:node:)?fs(?:\/promises)?['"]|require\(\s*['"](?:node:)?fs/

/** Test files that import node:fs and are not on the allowlist. */
export function newFsReaders(files: Record<string, string>, allowlist: string[]): string[] {
  return Object.keys(files).filter((f) => IMPORTS_FS.test(files[f]) && !allowlist.includes(f))
}

const allowlist = readFileSync(LIST, 'utf8')
  .split('\n')
  .map((l) => l.split('#')[0].trim())
  .filter(Boolean)

const testFiles = Object.fromEntries(
  sourceFiles({ dir: SRC_DIR, includeTests: true, match: /\.test\.tsx?$/ })
    .filter((f) => !f.endsWith('noNewSourceReadTests.test.ts'))
    .map((f) => [relative(ROOT, f), readFileSync(f, 'utf8')]),
)

describe('no new tests that read source text', () => {
  it('only allowlisted tests import node:fs', () => {
    expect(
      newFsReaders(testFiles, allowlist),
      'A test that reads source text is banned (docs/spec/SPEC-testing.md, "Source-text assertion"). ' +
        'Extract the decision as a value and assert it (see pages/editPraxis/initialLoadPlan.ts). ' +
        'A repo-wide walk belongs in src/test/sourceScan.ts. Never add to .test-source-reads.txt.',
    ).toEqual([])
  })

  it('the allowlist only shrinks: every entry still exists and still reads', () => {
    expect(allowlist.filter((f) => !IMPORTS_FS.test(testFiles[f] ?? ''))).toEqual([])
  })

  it('the rule fires on a fixture that reads source', () => {
    const fixture = { 'src/x.test.ts': "import { readFileSync } from 'node:fs'" }
    expect(newFsReaders(fixture, [])).toEqual(['src/x.test.ts'])
    expect(newFsReaders(fixture, ['src/x.test.ts'])).toEqual([])
  })
})

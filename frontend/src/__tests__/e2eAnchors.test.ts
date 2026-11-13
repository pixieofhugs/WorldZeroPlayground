/**
 * #2453 — every slot the nightly browser suite reaches for still exists in the
 * app, checked by the PR-blocking suite rather than by a nightly nobody reads.
 *
 * Copy anchors in e2e silently matched nothing after rewordings, so specs use
 * `data-testid` slots; this fails when one disappears. Ids and asserted `data-*`
 * attributes are derived from `frontend/e2e/` itself. A source-text check: it
 * can't see a slot on an element the flow no longer reaches. The few string
 * anchors left are pinned in MODE_CHIP_LABELS.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import forms from '../locales/en/forms.json'
import { sourceFiles } from '../test/sourceScan'

const FRONTEND_DIR = fileURLToPath(new URL('../..', import.meta.url))
const E2E_DIR = join(FRONTEND_DIR, 'e2e')
const SRC_DIR = join(FRONTEND_DIR, 'src')

const readAll = (paths: string[]) =>
  paths.map((path) => readFileSync(path, 'utf8')).join('\n')

const e2eSource = readAll(sourceFiles({ dir: E2E_DIR, match: /\.ts$/ }))
// App minus tests: a testid surviving only in a fixture is the rot this catches.
const appSource = readAll(
  sourceFiles({ dir: SRC_DIR, match: /^(?!.*\.test\.).*\.tsx?$/ }),
)

const matchAll = (source: string, pattern: RegExp) =>
  [...new Set([...source.matchAll(pattern)].map((match) => match[1]))].sort()

const testIds = matchAll(e2eSource, /getByTestId\(['"]([^'"]+)['"]\)/g)
const dataAttributes = matchAll(
  e2eSource,
  /toHaveAttribute\(\s*['"](data-[a-z-]+)['"]/g,
)

/** Labels the lifecycle specs still press by name; shared keys across all archetypes. */
const MODE_CHIP_LABELS = {
  modeCollab: 'Collab',
  modeDuel: 'Duel',
} as const

describe('the nightly e2e suite anchors on things that exist', () => {
  it('finds test ids to check (the derivation itself still works)', () => {
    expect(testIds.length).toBeGreaterThan(5)
    expect(dataAttributes.length).toBeGreaterThan(0)
  })

  // Not `toContain`: a failure would print all of `frontend/src`.
  it.each(testIds)('data-testid="%s" is still in the app', (id) => {
    expect(
      appSource.includes(`data-testid="${id}"`) ||
        appSource.includes(`testId="${id}"`),
      `frontend/e2e reaches for getByTestId('${id}') and nothing in frontend/src carries it`,
    ).toBe(true)
  })

  it.each(dataAttributes)('%s is still written by the app', (attribute) => {
    expect(
      appSource.includes(attribute),
      `frontend/e2e asserts on ${attribute} and nothing in frontend/src writes it`,
    ).toBe(true)
  })

  it.each(Object.entries(MODE_CHIP_LABELS))(
    'the %s chip still reads "%s"',
    (key, label) => {
      expect(
        (forms.editPraxis.composer as Record<string, string>)[key],
      ).toBe(label)
    },
  )
})

/**
 * #2453 — every slot the nightly browser suite reaches for still exists in the
 * app, checked by the PR-blocking suite rather than by a nightly nobody reads.
 *
 * WHY THIS EXISTS
 * ---------------
 * The e2e suite has now been "fixed" three times, and every one of those
 * regressions was the same shape: a spec anchored on a user-facing string, some
 * later PR rewrote the string, and nothing anywhere failed. The anchor did not
 * error — it simply matched nothing, which for a `toBeVisible()` is a thirty
 * second wait and for a `toHaveCount(0)` is a silent pass. Five separate
 * examples were live on `main` when this file was written:
 *
 *   - `getByText('challenged')`      — #1417 rewrote it to "Challenge sent"
 *   - `'Seal the duel?'` / `/seal it/i` — #1928 renamed both to "Lock …"
 *   - `/PULL THIS JOB/i`             — in no catalog in this repo
 *   - `/THE GANG/i`                  — in no catalog in this repo
 *   - `/out there/i`                 — #1812 rewrote the collab register
 *
 * The specs now hold `data-testid` slots instead. A slot is only worth more than
 * a string if REMOVING it fails something, and a nightly that has been red for
 * a hundred consecutive runs is not that something. This test is.
 *
 * WHAT IT CHECKS, AND WHY IT IS DERIVED RATHER THAN LISTED
 * -------------------------------------------------------
 * The ids are read out of `frontend/e2e/` itself, so a spec that starts using a
 * new slot is covered the moment it is written and a hand-kept list cannot rot
 * out of step with the suite it guards. Same for the `data-*` attributes the
 * specs assert on (`data-collab-signal`, `data-confirm-kind`), which are the
 * copy-free way to tell one state of a shared slot from another.
 *
 * It is a source-text check, not a render check. That is deliberate: the claim
 * is "this attribute is still written somewhere in the app", which is exactly
 * the claim a rename breaks. Whether the element is on screen in a given state
 * is what the browser run is for, and no unit test can stand in for it.
 *
 * WHAT IT CANNOT CATCH
 * --------------------
 * A slot that survives on an element the flow no longer reaches, and any anchor
 * that is still a string. The three the specs still spell out are named in
 * MODE_CHIP_LABELS below and pinned against the catalog here for the same
 * reason; everything else went to a slot.
 *
 * It lives under `src/__tests__` because `frontend/e2e/` is outside
 * `tsconfig`'s `include: ["src"]` and vitest is the one CI step that runs from
 * `frontend/` with the whole tree on disk — the same reason
 * `designSyncSrcMap.test.ts` sits here.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import forms from '../locales/en/forms.json'

const FRONTEND_DIR = fileURLToPath(new URL('../..', import.meta.url))
const E2E_DIR = join(FRONTEND_DIR, 'e2e')
const SRC_DIR = join(FRONTEND_DIR, 'src')

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry: string) => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? filesUnder(path) : [path]
  })
}

const readAll = (paths: string[]) =>
  paths.map((path) => readFileSync(path, 'utf8')).join('\n')

const e2eSource = readAll(filesUnder(E2E_DIR).filter((p) => p.endsWith('.ts')))
// The app itself, minus its own tests — a testid that survives only in a
// `__tests__` fixture is exactly the rot this guard is for.
const appSource = readAll(
  filesUnder(SRC_DIR).filter(
    (path) =>
      (path.endsWith('.tsx') || path.endsWith('.ts')) &&
      !path.includes('__tests__') &&
      !path.endsWith('.test.ts') &&
      !path.endsWith('.test.tsx'),
  ),
)

const matchAll = (source: string, pattern: RegExp) =>
  [...new Set([...source.matchAll(pattern)].map((match) => match[1]))].sort()

const testIds = matchAll(e2eSource, /getByTestId\(['"]([^'"]+)['"]\)/g)
const dataAttributes = matchAll(
  e2eSource,
  /toHaveAttribute\(\s*['"](data-[a-z-]+)['"]/g,
)

/**
 * The last labels the two lifecycle specs still press by name. Every archetype
 * builds its mode chips from these SHARED keys, so one pin covers all eight —
 * and a rename now fails here instead of six weeks later in a nightly.
 */
const MODE_CHIP_LABELS = {
  modeCollab: 'Collab',
  modeDuel: 'Duel',
} as const

describe('the nightly e2e suite anchors on things that exist', () => {
  it('finds test ids to check (the derivation itself still works)', () => {
    // A regex that silently stops matching would make every case below vacuous
    // — which is the exact failure mode this whole file was written about.
    expect(testIds.length).toBeGreaterThan(5)
    expect(dataAttributes.length).toBeGreaterThan(0)
  })

  // `.includes()` behind a boolean rather than `toContain`, because the haystack
  // is the whole of `frontend/src` and a failing `toContain` prints it.
  it.each(testIds)('data-testid="%s" is still in the app', (id) => {
    expect(
      appSource.includes(`data-testid="${id}"`),
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

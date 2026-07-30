/**
 * #660 — adoption guard.
 *
 * `useSearchQueryParam.test.ts` proves the hook's three decisions hold, but it
 * tests the hook in isolation: every one of those assertions would still pass if
 * a feed hook quietly went back to `useState('')` for its query. The whole point
 * of #660 is that BOTH feeds put the search in the URL, so the regression worth
 * catching is a lapsed adoption, not a broken hook.
 *
 * There is no jsdom/renderHook in this repo (vitest runs in the `node`
 * environment), so the feed hooks cannot be rendered to observe the binding.
 * Asserting against the source is the available check — same posture as
 * `locales/__tests__/catalog.test.ts` and `utils/__tests__/factionContrast.test.ts`,
 * which also read files off disk.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const SOURCE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url))

/** The feed hooks #660 requires to bind their search box to `?q=`. */
const FEED_HOOKS = [
  { name: 'useTasks', relativePath: '../../pages/tasks/useTasks.ts' },
  { name: 'usePraxes', relativePath: '../../pages/praxes/usePraxes.ts' },
] as const

function readFeedHookSource(relativePath: string): string {
  return readFileSync(path.join(SOURCE_DIRECTORY, relativePath), 'utf8')
}

describe.each(FEED_HOOKS)('$name puts its search in the URL', ({ relativePath }) => {
  const source = readFeedHookSource(relativePath)

  it('imports useSearchQueryParam', () => {
    expect(source).toContain("from '../useSearchQueryParam'")
    expect(source).toContain('useSearchQueryParam')
  })

  it('binds its query through the hook, not local useState', () => {
    expect(source).toMatch(/const \[query, setQueryState\] = useSearchQueryParam\(\)/)
  })

  it('does NOT hold the query in component-local useState', () => {
    // The exact shape #660 replaced. Its return would strand the search out of
    // the URL while every isolated hook test kept passing.
    expect(source).not.toMatch(/const \[query, setQueryState\] = useState/)
  })

  it('still resets the paging window when the search changes (#645)', () => {
    // Moving the value into the URL must not drop the window reset, or a search
    // typed while scrolled deep would keep the previous page count.
    expect(source).toMatch(/setQuery = \(next: string\) => \{ setQueryState\(next\); resetWindow\(\) \}/)
  })
})

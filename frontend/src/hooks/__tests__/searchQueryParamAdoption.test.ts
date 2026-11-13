/** #660 — source guard that BOTH feed hooks still adopt `useSearchQueryParam`. */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const SOURCE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url))

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
    expect(source).toContain("from '../../hooks/useSearchQueryParam'")
    expect(source).toContain('useSearchQueryParam')
  })

  it('binds its query through the hook, not local useState', () => {
    expect(source).toMatch(/const \[query, setQueryState\] = useSearchQueryParam\(\)/)
  })

  it('does NOT hold the query in component-local useState', () => {
    expect(source).not.toMatch(/const \[query, setQueryState\] = useState/)
  })

  it('still resets the paging window when the search changes (#645)', () => {
    expect(source).toMatch(/setQuery = \(next: string\) => \{ setQueryState\(next\); resetWindow\(\) \}/)
  })
})

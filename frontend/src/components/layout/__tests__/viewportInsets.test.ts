import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

// viewport-fit=cover makes the top inset real, so the phone header must pad by it.
describe('viewport-fit=cover ships with the header top inset', () => {
  it('both edges together', () => {
    const html = readFileSync('index.html', 'utf8')
    const header = readFileSync('src/components/layout/MobileHeader.tsx', 'utf8')
    expect(html).toContain('viewport-fit=cover')
    expect(header).toContain("paddingTop: 'env(safe-area-inset-top)'")
  })
})

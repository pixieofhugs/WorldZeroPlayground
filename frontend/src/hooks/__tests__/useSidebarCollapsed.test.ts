/** #1191 — the rail's collapsed state, a per-browser preference (pure resolver only). */
import { describe, it, expect } from 'vitest'
import { resolveInitialCollapsed } from '../useSidebarCollapsed'

describe('resolveInitialCollapsed', () => {
  it('defaults to expanded for a player who has never toggled', () => {
    expect(resolveInitialCollapsed(null)).toBe(false)
  })

  it('honours a stored collapse', () => {
    expect(resolveInitialCollapsed('1')).toBe(true)
  })

  it('honours a stored expand', () => {
    expect(resolveInitialCollapsed('0')).toBe(false)
  })

  it('falls back to expanded on a junk stored value', () => {
    expect(resolveInitialCollapsed('chartreuse')).toBe(false)
    expect(resolveInitialCollapsed('')).toBe(false)
    expect(resolveInitialCollapsed('true')).toBe(false)
  })
})

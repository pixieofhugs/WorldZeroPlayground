/**
 * #1191 — the rail's collapsed state is a per-browser viewport preference.
 *
 * The repo's frontend harness is `renderToStaticMarkup` in a node env: no jsdom,
 * no DOM events, no `localStorage`, and effects never run. So the click and the
 * round-trip through storage cannot be tested here. What CAN be pinned is the
 * decision the hook makes about a stored value — extracted pure, exactly as
 * `resolveInitialTheme` is in `useTheme.tsx`.
 */
import { describe, it, expect } from 'vitest'
import { resolveInitialCollapsed, SIDEBAR_COLLAPSED_STORAGE_KEY } from '../useSidebarCollapsed'

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

describe('storage key', () => {
  it('is a viewport preference key, not keyed by character', () => {
    expect(SIDEBAR_COLLAPSED_STORAGE_KEY).toBe('wz-sidebar-collapsed')
  })
})

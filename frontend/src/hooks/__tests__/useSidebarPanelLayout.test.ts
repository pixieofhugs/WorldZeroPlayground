/**
 * #1555 — the rail's shape below the character card: what collapses, what
 * moves, and where the answer is remembered.
 *
 * The repo's frontend harness is `renderToStaticMarkup` in a node env: no jsdom,
 * no DOM events, no `localStorage`, and effects never run. So neither the drag
 * nor the round trip through storage can be exercised here. What CAN be pinned
 * is every decision the hook makes, extracted pure — exactly as
 * `resolveInitialCollapsed` is in `useSidebarCollapsed`.
 */
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_PANEL_LAYOUT,
  DEFAULT_PANEL_ORDER,
  SIDEBAR_PANEL_COLLAPSIBLE,
  SIDEBAR_PANEL_LAYOUT_STORAGE_KEY,
  movePanelBy,
  movePanelTo,
  resolveInitialPanelLayout,
  serializePanelLayout,
  sidebarPanelLayoutStorageKey,
  type SidebarPanelId,
} from '../useSidebarPanelLayout'

describe('the storage key', () => {
  // Owner ruling, 2026-08-02: the rail is chrome, not part of the character. A
  // player with several lives gets ONE rail shape, so the id in the key is the
  // account's — a character id here would be the bug the ruling names.
  it('carries the account id, never a character id', () => {
    expect(sidebarPanelLayoutStorageKey(7)).toBe(`${SIDEBAR_PANEL_LAYOUT_STORAGE_KEY}:7`)
    expect(sidebarPanelLayoutStorageKey(8)).not.toBe(sidebarPanelLayoutStorageKey(7))
  })

  it('falls back to the bare key when no account is known', () => {
    expect(sidebarPanelLayoutStorageKey(null)).toBe(SIDEBAR_PANEL_LAYOUT_STORAGE_KEY)
    expect(sidebarPanelLayoutStorageKey(undefined)).toBe(SIDEBAR_PANEL_LAYOUT_STORAGE_KEY)
  })
})

describe('which panels may be folded away', () => {
  // The asymmetry the owner ruled: reordering is pure gain and goes everywhere
  // below the card; collapsing can swallow an obligation, so it is granted per
  // panel. This is a flag rather than a blanket `true` precisely so a panel that
  // must never be hideable can exist.
  it('is a per-panel decision, not a property of being below the card', () => {
    expect(Object.keys(SIDEBAR_PANEL_COLLAPSIBLE).sort()).toEqual([...DEFAULT_PANEL_ORDER].sort())
  })

  it('grants it to the two long panels', () => {
    expect(SIDEBAR_PANEL_COLLAPSIBLE['active-tasks']).toBe(true)
    expect(SIDEBAR_PANEL_COLLAPSIBLE['recent-activity']).toBe(true)
  })
})

describe('resolveInitialPanelLayout', () => {
  it('gives a player who has never touched the rail the default shape', () => {
    expect(resolveInitialPanelLayout(null)).toEqual(DEFAULT_PANEL_LAYOUT)
    expect(resolveInitialPanelLayout('')).toEqual(DEFAULT_PANEL_LAYOUT)
  })

  it('honours a stored order and a stored collapse', () => {
    const stored = serializePanelLayout({
      order: ['recent-activity', 'active-tasks'],
      collapsed: ['active-tasks'],
    })
    expect(resolveInitialPanelLayout(stored)).toEqual({
      order: ['recent-activity', 'active-tasks'],
      collapsed: ['active-tasks'],
    })
  })

  it('falls back to the default rail on junk rather than rendering nothing', () => {
    expect(resolveInitialPanelLayout('chartreuse')).toEqual(DEFAULT_PANEL_LAYOUT)
    expect(resolveInitialPanelLayout('[]')).toEqual(DEFAULT_PANEL_LAYOUT)
    expect(resolveInitialPanelLayout('null')).toEqual(DEFAULT_PANEL_LAYOUT)
    expect(resolveInitialPanelLayout('{"order":"recent-activity"}')).toEqual(DEFAULT_PANEL_LAYOUT)
  })

  it('drops an id this build no longer has', () => {
    const stored = '{"order":["pending-requests","recent-activity","active-tasks"]}'
    expect(resolveInitialPanelLayout(stored).order).toEqual(['recent-activity', 'active-tasks'])
  })

  it('drops a duplicate rather than drawing a panel twice', () => {
    const stored = '{"order":["active-tasks","active-tasks","recent-activity"]}'
    expect(resolveInitialPanelLayout(stored).order).toEqual(['active-tasks', 'recent-activity'])
  })

  // The one that matters when a panel SHIPS: a stored order written before it
  // existed must not hide it from every player who ever dragged anything.
  it('appends a panel the stored order predates', () => {
    const stored = '{"order":["recent-activity"]}'
    expect(resolveInitialPanelLayout(stored).order).toEqual(['recent-activity', 'active-tasks'])
  })

  // And the mirror of it: a ruling can take collapsing AWAY from a panel, and
  // when it does, nobody may be left with that panel folded shut and no control
  // to open it.
  it('expands a panel that is no longer collapsible', () => {
    const notCollapsible = (Object.keys(SIDEBAR_PANEL_COLLAPSIBLE) as SidebarPanelId[]).filter(
      (id) => !SIDEBAR_PANEL_COLLAPSIBLE[id],
    )
    // Today every registered panel collapses, so the guard is exercised through
    // an id that is not collapsible because it is not a panel at all.
    expect(notCollapsible).toEqual([])
    expect(resolveInitialPanelLayout('{"collapsed":["pending-requests"]}').collapsed).toEqual([])
  })

  it('round-trips through serialize', () => {
    const layout = { order: ['recent-activity', 'active-tasks'] as SidebarPanelId[], collapsed: ['recent-activity'] as SidebarPanelId[] }
    expect(resolveInitialPanelLayout(serializePanelLayout(layout))).toEqual(layout)
  })
})

describe('movePanelTo', () => {
  const order: SidebarPanelId[] = ['active-tasks', 'recent-activity']

  it('moves a panel into the target seat', () => {
    expect(movePanelTo(order, 'recent-activity', 'active-tasks')).toEqual([
      'recent-activity',
      'active-tasks',
    ])
  })

  it('returns the very same array for a drop on itself — nothing to persist', () => {
    expect(movePanelTo(order, 'active-tasks', 'active-tasks')).toBe(order)
  })

  it('returns the very same array when an id is not in the order', () => {
    expect(movePanelTo(order, 'active-tasks', 'pending-requests' as SidebarPanelId)).toBe(order)
  })
})

describe('movePanelBy — the keyboard path', () => {
  const order: SidebarPanelId[] = ['active-tasks', 'recent-activity']

  it('moves a panel one seat down', () => {
    expect(movePanelBy(order, 'active-tasks', 1)).toEqual(['recent-activity', 'active-tasks'])
  })

  it('moves a panel one seat up', () => {
    expect(movePanelBy(order, 'recent-activity', -1)).toEqual(['recent-activity', 'active-tasks'])
  })

  // Clamped, not wrapped: arrowing up at the top must do nothing, or a player
  // holding the key would find the panel teleporting to the far end.
  it('does nothing at the ends', () => {
    expect(movePanelBy(order, 'active-tasks', -1)).toBe(order)
    expect(movePanelBy(order, 'recent-activity', 1)).toBe(order)
  })
})

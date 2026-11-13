import { useCallback, useMemo, useState } from 'react'

/**
 * Desktop rail shape below the character card (#1555): collapsed panels + order.
 *
 * Not in `useSidebarPanels`: that provider owns the one fetch above the whole
 * shell (#1344); a display preference there would re-render every consumer.
 *
 * Keyed by ACCOUNT, not character (owner ruling 2026-08-02): one rail shape per
 * player; switching lives must not rearrange it.
 *
 * Test-only exports are deliberate (#2693): node tests have no DOM, so these
 * pure seams are the only way to assert the reorder/storage rules.
 */

/** Panel ids in default order. */
export const SIDEBAR_PANEL_IDS = ['active-tasks', 'recent-activity'] as const

export type SidebarPanelId = (typeof SIDEBAR_PANEL_IDS)[number]

export const DEFAULT_PANEL_ORDER: readonly SidebarPanelId[] = SIDEBAR_PANEL_IDS

/**
 * Which panels may collapse (owner ruling 2026-08-02). Per-panel because a panel
 * telling you someone is waiting on you must register `false` (#1457).
 */
export const SIDEBAR_PANEL_COLLAPSIBLE: Readonly<Record<SidebarPanelId, boolean>> = {
  'active-tasks': true,
  'recent-activity': true,
}

interface SidebarPanelLayout {
  readonly order: readonly SidebarPanelId[]
  readonly collapsed: readonly SidebarPanelId[]
}

export const DEFAULT_PANEL_LAYOUT: SidebarPanelLayout = {
  order: DEFAULT_PANEL_ORDER,
  collapsed: [],
}

/** Base key; the account id is appended per account. */
export const SIDEBAR_PANEL_LAYOUT_STORAGE_KEY = 'wz-sidebar-panels'

/** No account → bare key (only reachable in DOM-less renders). */
export function sidebarPanelLayoutStorageKey(accountId: number | null | undefined): string {
  return accountId === null || accountId === undefined
    ? SIDEBAR_PANEL_LAYOUT_STORAGE_KEY
    : `${SIDEBAR_PANEL_LAYOUT_STORAGE_KEY}:${accountId}`
}

function isPanelId(value: unknown): value is SidebarPanelId {
  return typeof value === 'string' && (SIDEBAR_PANEL_IDS as readonly string[]).includes(value)
}

/** Known ids only, first occurrence wins. */
function knownIds(value: unknown): SidebarPanelId[] {
  if (!Array.isArray(value)) return []
  const seen: SidebarPanelId[] = []
  for (const entry of value) {
    if (isPanelId(entry) && !seen.includes(entry)) seen.push(entry)
  }
  return seen
}

/**
 * Keeps as much of the stored choice as still makes sense: junk → default;
 * removed ids dropped; new ids appended (so new panels are seen); stored-collapsed
 * but non-collapsible → expanded.
 */
export function resolveInitialPanelLayout(stored: string | null): SidebarPanelLayout {
  if (!stored) return DEFAULT_PANEL_LAYOUT
  let parsed: unknown
  try {
    parsed = JSON.parse(stored)
  } catch {
    return DEFAULT_PANEL_LAYOUT
  }
  if (typeof parsed !== 'object' || parsed === null) return DEFAULT_PANEL_LAYOUT

  const record = parsed as { order?: unknown; collapsed?: unknown }
  const storedOrder = knownIds(record.order)
  const order = [
    ...storedOrder,
    ...DEFAULT_PANEL_ORDER.filter((id) => !storedOrder.includes(id)),
  ]
  const storedCollapsed = knownIds(record.collapsed).filter((id) => SIDEBAR_PANEL_COLLAPSIBLE[id])
  // Default order keeps the serialized value stable.
  const collapsed = DEFAULT_PANEL_ORDER.filter((id) => storedCollapsed.includes(id))

  return { order, collapsed }
}

export function serializePanelLayout(layout: SidebarPanelLayout): string {
  return JSON.stringify({ order: layout.order, collapsed: layout.collapsed })
}

/**
 * Move `movedId` to `targetId`'s seat. Unknown ids / no-op return the input
 * array itself, so callers can skip the write by identity.
 */
export function movePanelTo(
  order: readonly SidebarPanelId[],
  movedId: SidebarPanelId,
  targetId: SidebarPanelId,
): readonly SidebarPanelId[] {
  const from = order.indexOf(movedId)
  const to = order.indexOf(targetId)
  if (from === -1 || to === -1 || from === to) return order
  const next = [...order]
  next.splice(from, 1)
  next.splice(to, 0, movedId)
  return next
}

/** Keyboard reorder by ±1; clamped at the ends (no wrap). */
export function movePanelBy(
  order: readonly SidebarPanelId[],
  movedId: SidebarPanelId,
  delta: number,
): readonly SidebarPanelId[] {
  const from = order.indexOf(movedId)
  if (from === -1) return order
  const to = from + delta
  if (to < 0 || to >= order.length) return order
  return movePanelTo(order, movedId, order[to])
}

interface SidebarPanelLayoutState {
  readonly order: readonly SidebarPanelId[]
  readonly isCollapsed: (id: SidebarPanelId) => boolean
  readonly toggleCollapsed: (id: SidebarPanelId) => void
  /** Drop `movedId` onto `targetId`'s seat. */
  readonly movePanelOnto: (movedId: SidebarPanelId, targetId: SidebarPanelId) => void
  /** Keyboard reorder: `delta` of -1 or +1. */
  readonly movePanelByStep: (movedId: SidebarPanelId, delta: number) => void
}

export function useSidebarPanelLayout(accountId: number | null | undefined): SidebarPanelLayoutState {
  // Read once: the rail mounts signed-in only and unmounts on sign-out.
  const storageKey = sidebarPanelLayoutStorageKey(accountId)

  const [layout, setLayout] = useState<SidebarPanelLayout>(() => {
    try {
      return resolveInitialPanelLayout(localStorage.getItem(storageKey))
    } catch {
      return DEFAULT_PANEL_LAYOUT
    }
  })

  const persist = useCallback(
    (next: SidebarPanelLayout) => {
      try {
        localStorage.setItem(storageKey, serializePanelLayout(next))
      } catch {
        // Storage refused: the rail still moves for this session.
      }
      return next
    },
    [storageKey],
  )

  const toggleCollapsed = useCallback(
    (id: SidebarPanelId) => {
      if (!SIDEBAR_PANEL_COLLAPSIBLE[id]) return
      setLayout((previous) =>
        persist({
          ...previous,
          collapsed: previous.collapsed.includes(id)
            ? previous.collapsed.filter((entry) => entry !== id)
            : DEFAULT_PANEL_ORDER.filter((entry) => entry === id || previous.collapsed.includes(entry)),
        }),
      )
    },
    [persist],
  )

  const movePanelOnto = useCallback(
    (movedId: SidebarPanelId, targetId: SidebarPanelId) => {
      setLayout((previous) => {
        const order = movePanelTo(previous.order, movedId, targetId)
        return order === previous.order ? previous : persist({ ...previous, order })
      })
    },
    [persist],
  )

  const movePanelByStep = useCallback(
    (movedId: SidebarPanelId, delta: number) => {
      setLayout((previous) => {
        const order = movePanelBy(previous.order, movedId, delta)
        return order === previous.order ? previous : persist({ ...previous, order })
      })
    },
    [persist],
  )

  const isCollapsed = useCallback(
    (id: SidebarPanelId) => layout.collapsed.includes(id),
    [layout.collapsed],
  )

  return useMemo(
    () => ({ order: layout.order, isCollapsed, toggleCollapsed, movePanelOnto, movePanelByStep }),
    [layout.order, isCollapsed, toggleCollapsed, movePanelOnto, movePanelByStep],
  )
}

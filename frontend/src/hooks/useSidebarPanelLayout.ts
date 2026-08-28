import { useCallback, useMemo, useState } from 'react'

/**
 * The shape of the desktop rail below the character card (#1555): which panels
 * are collapsed, and in what order they sit.
 *
 * WHY THIS IS NOT IN `useSidebarPanels`
 * -------------------------------------
 * That provider exists to keep the rail's ONE fetch alive independently of what
 * is displayed (#1344), and it is mounted above the whole shell. Display
 * preference put in there would make the data owner re-render every consumer —
 * the mobile bell included — because somebody folded a panel on the desktop.
 * This is a viewport preference and it lives with the other viewport
 * preferences: `useSidebarCollapsed`, which follows `useTheme`.
 *
 * WHY IT IS KEYED BY ACCOUNT AND NOT BY CHARACTER
 * -----------------------------------------------
 * Owner ruling, 2026-08-02: "a player with several lives gets one rail shape,
 * not one per life. The rail is chrome, not part of the character." Keying by
 * character would rearrange the rail as you switch lives, which reads as a bug
 * rather than as a preference. The account id is safe to read here — it is the
 * viewer's own, from `/auth/me`, and it never leaves localStorage.
 *
 * The storage idiom is `useSidebarCollapsed`'s, unchanged: a pure resolver, a
 * lazy `useState` initializer that wraps the browser read in try/catch (the
 * repo's tests render with no DOM), and a write on every change.
 */

/** Panel ids, in the order a player who has never reordered anything sees. */
export const SIDEBAR_PANEL_IDS = ['active-tasks', 'recent-activity'] as const

export type SidebarPanelId = (typeof SIDEBAR_PANEL_IDS)[number]

export const DEFAULT_PANEL_ORDER: readonly SidebarPanelId[] = SIDEBAR_PANEL_IDS

/**
 * Which panels may be folded away — the asymmetry the owner ruled on 2026-08-02.
 *
 * Reordering is pure gain: it moves a panel, it never hides one, so every panel
 * below the character card has a grip. Collapsing is the one gesture that can
 * silently swallow an obligation, so it is granted only to the two LONG panels.
 * A panel that exists to tell you somebody is waiting on you is not hideable:
 * letting a player collapse it re-creates by preference the exact hole #1457 was
 * filed to close. That is why this is a per-panel flag and not `true` for
 * everything below the card — the rail's pending-requests panel was deleted by
 * #1423 (ADR-0070), and if anything of that kind ever returns it registers here
 * with `false` rather than needing the mechanism rewritten.
 *
 * The character card is neither collapsible nor reorderable, so it is not a
 * panel id at all — it is pinned above this list by `Sidebar`.
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

/** Base key; the account id is appended so two accounts on one browser do not
 *  inherit each other's rail. */
export const SIDEBAR_PANEL_LAYOUT_STORAGE_KEY = 'wz-sidebar-panels'

/**
 * The account's storage key. A signed-out or not-yet-known account falls back to
 * the bare key — the rail only mounts signed in (`ShellContent`), so this is the
 * DOM-less-render case, not a state a player reaches.
 */
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
 * Layout resolution, extracted pure so it is testable in the repo's DOM-less
 * node env — exactly as `resolveInitialCollapsed` and `resolveInitialTheme` are.
 *
 * Every failure mode resolves to "as much of the player's choice as still makes
 * sense", never to a broken rail:
 *   - junk, non-JSON, or a non-object → the default rail;
 *   - an id this build no longer has → dropped;
 *   - an id this build ADDED since the order was stored → appended in default
 *     order, so shipping a new panel shows it to everyone rather than hiding it
 *     from every player who has ever dragged anything;
 *   - a panel stored as collapsed that is not collapsible → expanded, so a
 *     ruling change can never leave an un-openable panel behind.
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
  // Normalized to default order so the serialized value is stable regardless of
  // the order the player collapsed things in.
  const collapsed = DEFAULT_PANEL_ORDER.filter((id) => storedCollapsed.includes(id))

  return { order, collapsed }
}

export function serializePanelLayout(layout: SidebarPanelLayout): string {
  return JSON.stringify({ order: layout.order, collapsed: layout.collapsed })
}

/**
 * Move `movedId` to `targetId`'s seat, sliding everything between them along.
 * The single reorder primitive: the drop handler calls it with the panel under
 * the pointer, and the keyboard path calls it with the neighbour.
 *
 * Unknown ids and a no-op move return the input order unchanged, so a drop on
 * the panel being dragged costs nothing and writes nothing.
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

/**
 * The keyboard path: one seat up (-1) or down (+1). Reordering that only works
 * with a mouse is not reordering, so this is the same primitive the drag uses,
 * addressed by neighbour instead of by pointer. Clamped at both ends — pressing
 * up on the top panel is a no-op, not a wrap.
 */
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
  // The rail is mounted only inside `ShellContent`'s `Boolean(user)` gate, so
  // the account id is already known at mount and cannot change without a
  // sign-out — which unmounts the rail. That is why the key is read once, in the
  // lazy initializer, with no effect re-reading it later.
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
        // A browser refusing storage (private mode, quota) must not cost the
        // player the gesture itself — the rail still moves for this session.
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

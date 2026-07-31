import { useSidebarPanels } from '../../hooks/useSidebarPanels'
import Sidebar from './Sidebar'
import SidebarHandle from './SidebarHandle'

/**
 * The desktop rail's column: the fold handle, and under it the rail itself.
 *
 * WHY COLLAPSING HIDES RATHER THAN UNMOUNTS (#1343)
 * -------------------------------------------------
 * `{!collapsed && <Sidebar />}` used to live in `ShellContent`. Unmounting the
 * rail tore down every hook inside it, so reopening re-ran all three fetches —
 * a fold/unfold round trip cost three requests and a visible repopulate. The
 * rail now stays mounted and is hidden with the `hidden` attribute.
 *
 * Since #1344 the panels are read by `SidebarProvider`, above this component and
 * above `ShellContent`'s `showSidebar` gate, so folding could not cost a request
 * even if this did unmount. Staying mounted is still what stops the panels
 * blinking on reopen.
 *
 * "Collapsed means GONE, not an icon rail" still holds exactly: `hidden` draws
 * nothing, contributes no box, and takes the subtree out of the accessibility
 * tree, so there is no sliver, no icon strip and no residual spacing. The
 * collapsed grid column resolves to the handle's width either way.
 *
 * The panels' data still AGES while collapsed rather than being refetched on
 * reopen; how long stale rail data may be trusted is deliberately left open
 * (#1346).
 *
 * WHY THIS READS `pending_requests_count` AT ALL
 * ----------------------------------------------
 * For one number, for one child. The rail used to LIST the requests and the
 * handle badged their count, so #1343 hoisted a single `usePendingRequests()`
 * here and passed it down — that hook held per-instance state with no shared
 * cache, so one call per consumer was one REQUEST per consumer. The provider is
 * that shared cache now, and since #1423 the rail lists nothing: the queue on
 * `/updates` is the only surface a request can be answered on (ADR-0070). What
 * is left is the collapsed handle's badge, which is the only thing that tells a
 * folded-away desktop something is waiting, and it takes the count as a prop.
 *
 * Every consumer wanted only that number — here, the mobile bell and the mobile
 * FieldDesk — so since #1456 the response carries the count itself rather than
 * up to 100 serialized feed items for three callers to run `.length` over.
 */
export interface SidebarColumnProps {
  readonly collapsed: boolean
  readonly onToggle: () => void
}

/**
 * The rail scrolls WITH the page — a sticky, self-scrolling column put a second
 * scrollbar next to the page's own, which read as chrome, not content. The one
 * thing that must survive deep scroll is the handle while COLLAPSED: it is the
 * only way back, so it alone goes sticky in that state — `self-stretch`
 * (overriding the grid's `items-start`) keeps the column full row height so the
 * sticky handle has room to travel. While
 * expanded it stays in flow — pinning it would float it over the rail's own
 * panels as they scrolled underneath. `top-14` matches `NavBar`'s
 * `sticky top-0 h-14`.
 */
const SIDEBAR_COLUMN = 'hidden lg:block lg:col-start-1 lg:row-start-1 lg:self-stretch'

export default function SidebarColumn({ collapsed, onToggle }: SidebarColumnProps) {
  const { pending_requests_count: pendingCount } = useSidebarPanels()

  return (
    <div className={SIDEBAR_COLUMN}>
      <div className={collapsed ? 'lg:sticky lg:top-14' : undefined}>
        <SidebarHandle
          collapsed={collapsed}
          onToggle={onToggle}
          pendingCount={pendingCount}
        />
      </div>
      <div hidden={collapsed}>
        <Sidebar />
      </div>
    </div>
  )
}

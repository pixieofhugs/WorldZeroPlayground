import { usePendingRequests } from '../../hooks/usePendingRequests'
import Sidebar from './Sidebar'
import SidebarHandle from './SidebarHandle'

/**
 * The desktop rail's column: the fold handle, and under it the rail itself.
 *
 * WHY COLLAPSING HIDES RATHER THAN UNMOUNTS (#1343)
 * -------------------------------------------------
 * `{!collapsed && <Sidebar />}` used to live in `ShellContent`. Unmounting the
 * rail tears down every hook inside it, so reopening re-ran all three fetches —
 * a fold/unfold round trip cost three requests and a visible repopulate. The
 * rail now stays mounted and is hidden with the `hidden` attribute, so reopening
 * costs nothing.
 *
 * "Collapsed means GONE, not an icon rail" still holds exactly: `hidden` draws
 * nothing, contributes no box, and takes the subtree out of the accessibility
 * tree, so there is no sliver, no icon strip and no residual spacing. The
 * collapsed grid column resolves to the handle's width either way.
 *
 * The panels' data now AGES while collapsed instead of being refetched on
 * reopen. That is the trade, and it is strictly better than refetching on every
 * single reopen; how long stale rail data may be trusted is deliberately left
 * open (#1346).
 *
 * WHY THE PENDING-REQUESTS READ LIVES HERE
 * ----------------------------------------
 * Both children need it — the rail lists the requests, and the collapsed handle
 * badges their count, since the rail is the only desktop surface for collab
 * invites and duel challenges. `usePendingRequests` holds per-instance state
 * with no shared cache, so one call per consumer would be one REQUEST per
 * consumer. Reading it once here, above both, keeps that at one request and
 * keeps it alive across the toggle: this component is mounted for as long as the
 * rail is shown at all, so its `requestsBus` subscription survives folding and
 * the badge stays live while collapsed.
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
  const { pendingRequests, refetch } = usePendingRequests()

  return (
    <div className={SIDEBAR_COLUMN}>
      <div className={collapsed ? 'lg:sticky lg:top-14' : undefined}>
        <SidebarHandle
          collapsed={collapsed}
          onToggle={onToggle}
          pendingCount={pendingRequests.length}
        />
      </div>
      <div hidden={collapsed}>
        <Sidebar pendingRequests={pendingRequests} refetchPendingRequests={refetch} />
      </div>
    </div>
  )
}

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
 * The handle is the only way back from a collapsed rail, so the column is
 * sticky — otherwise a player deep in a long `/tasks` list would have to scroll
 * back to the top to recover it. `top-14` matches `NavBar`'s `sticky top-0 h-14`.
 */
const SIDEBAR_COLUMN =
  'hidden lg:block lg:col-start-1 lg:row-start-1 lg:sticky lg:top-14 lg:max-h-[calc(100vh-3.5rem)] lg:overflow-y-auto'

export default function SidebarColumn({ collapsed, onToggle }: SidebarColumnProps) {
  const { pendingRequests, refetch } = usePendingRequests()

  return (
    <div className={SIDEBAR_COLUMN}>
      <SidebarHandle
        collapsed={collapsed}
        onToggle={onToggle}
        pendingCount={pendingRequests.length}
      />
      <div hidden={collapsed}>
        <Sidebar pendingRequests={pendingRequests} refetchPendingRequests={refetch} />
      </div>
    </div>
  )
}

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
interface SidebarColumnProps {
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
 *
 * IT IS ALSO TOO TALL TO PIN — MEASURED AT #1562
 * ----------------------------------------------
 * #1562 adopted the Home design's shell and asked whether the expanded rail
 * could take the design's `position: sticky; top: 100px` as well, on one
 * condition: that it FITS inside `100vh - 100px` at 1366×768, the shortest
 * realistic desktop. Plain sticky pins the top, so anything past that 668px is
 * permanently unreachable — worse than a rail that scrolls.
 *
 * It does not fit, and not narrowly. Summing only the heights, paddings,
 * margins and borders these files DECLARE — every text line box counted as
 * zero, so this is a floor the rail cannot go under:
 *
 *   handle          44   28 box (2 border + 8 padding + 18px glyph at
 *                        line-height 1) + mb-4
 *   character card 226   34 chrome + 44 action pill + 16 + 58 avatar + 16
 *                        + 32 score at line-height 1 + 12 + 6 track + 8
 *   in-progress     96   34 chrome + 18 header + 14 + 16 + 6 slot bar + 8,
 *                        with the panel EMPTY — zero task rows
 *   recent activity 319  34 chrome + 18 header + 14 + 5 x (24 padding +
 *                        23.4 headline at line-height 1.3) + 4 hairlines + 12
 *   aside gap-4      32  two gaps
 *                  ----
 *                   717 px, against a 668px budget.
 *
 * That floor already overruns, for the emptiest rail a player with any activity
 * can have. Adding the line boxes back puts it near 960px; a full set of task
 * links (the era caps signups at 20, and every one of them is a row here —
 * ~23px plus a 12px gap) puts it past 1600. The verdict needs the floor to be
 * wrong by more than 45% to flip, and the floor counts nothing that can shrink.
 *
 * So: the rail stays in flow, and the design's sticky rail is not adopted.
 * Self-scroll is NOT the fallback — that is the shape the first paragraph
 * rejects, and #1562 declined to reopen it. Derived from source rather than
 * rendered, because no agent on this repo has a browser; re-measure before
 * reopening.
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

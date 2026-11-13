import { useSidebarPanels } from '../../hooks/useSidebarPanels'
import Sidebar from './Sidebar'
import SidebarHandle from './SidebarHandle'

/**
 * The desktop rail's column: the fold handle, then the rail.
 *
 * Collapsing HIDES (`hidden`), never unmounts (#1343), so panels don't blink on
 * reopen; `hidden` leaves no box or a11y node, so collapsed still means gone.
 * Panel data ages while collapsed (staleness policy open, #1346).
 *
 * `pending_requests_count` feeds only the collapsed handle's badge.
 */
interface SidebarColumnProps {
  readonly collapsed: boolean
  readonly onToggle: () => void
}

/**
 * The rail scrolls WITH the page (a self-scrolling column added a second
 * scrollbar). Only the collapsed handle goes sticky, as the only way back;
 * `self-stretch` gives it room to travel. `top-14` matches `NavBar`'s `h-14`.
 *
 * Too tall to pin (#1562): the declared-box floor is ~717px against the 668px
 * a 1366×768 screen leaves, before any text line boxes. Re-measure before
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

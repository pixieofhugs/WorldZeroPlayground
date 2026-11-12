import type { CSSProperties, ReactNode } from 'react'
import { useAuth } from '../../auth/AuthContext'
import SidebarColumn from './SidebarColumn'

/**
 * The page region: the ONE place the routed page mounts, in both form factors
 * (#1116). The chain `ShellContent` → `div` → `div` → `main` is identical in
 * both, only classNames differ, so a form-factor flip never unmounts the page.
 * A wrapper on one branch only reintroduces the bug. Chrome around it may
 * remount freely (ADR-0035).
 *
 * The rail sits LEFT (#1191) but `<main>` is source-first (`lg:col-start-2`) so
 * keyboard/SR users reach content before the rail. `lg:row-start-1` on both
 * cells is load-bearing: without it the rail auto-places onto row 2.
 */
interface ShellContentProps {
  readonly isMobile: boolean
  /** Held by `Layout`: tests call `ShellContent` as a plain function (no hooks). */
  readonly sidebarCollapsed: boolean
  readonly onToggleSidebar: () => void
  readonly children: ReactNode
}

/** Full-bleed on the phone; `SiteFooter` (after this region) carries the tab-bar clearance (#3304). */
const MOBILE_REGION = 'flex-1 relative px-4 py-4'
/**
 * Centred content column (Style Guide §4.1, #1562). `--shell-max-width` is
 * shared with `NavBar`. `pb-[72px]` is arbitrary: the --space-* ramp skips 72.
 */
const DESKTOP_REGION = 'flex-1 relative max-w-[var(--shell-max-width)] mx-auto w-full pt-8 px-10 pb-[72px]'

const MOBILE_REGION_STYLE: CSSProperties = { zIndex: 5 }
const DESKTOP_REGION_STYLE: CSSProperties = { zIndex: 5 }

/**
 * Desktop rail + content grid (#1562): fixed 320px rail. `minmax(0, 1fr)` and
 * `<main>`'s `min-w-0` both guard overflow; keep both.
 */
const SIDEBAR_GRID_EXPANDED = 'gap-9 items-start lg:grid lg:grid-cols-[320px_minmax(0,1fr)]'
const SIDEBAR_GRID_COLLAPSED = 'gap-9 items-start lg:grid lg:grid-cols-[auto_minmax(0,1fr)]'

export default function ShellContent({
  isMobile,
  sidebarCollapsed,
  onToggleSidebar,
  children,
}: ShellContentProps) {
  const { user } = useAuth()
  // Desktop + signed in only; the handle inherits this and the `lg:` gate.
  const showSidebar = !isMobile && Boolean(user)

  return (
    <div
      className={isMobile ? MOBILE_REGION : DESKTOP_REGION}
      style={isMobile ? MOBILE_REGION_STYLE : DESKTOP_REGION_STYLE}
    >
      <div
        className={
          showSidebar
            ? sidebarCollapsed
              ? SIDEBAR_GRID_COLLAPSED
              : SIDEBAR_GRID_EXPANDED
            : ''
        }
      >
        <main className="min-w-0 lg:col-start-2 lg:row-start-1">{children}</main>
        {showSidebar && (
          <SidebarColumn collapsed={sidebarCollapsed} onToggle={onToggleSidebar} />
        )}
      </div>
    </div>
  )
}

import type { CSSProperties, ReactNode } from 'react'
import { useAuth } from '../../auth/AuthContext'
import SidebarColumn from './SidebarColumn'

/**
 * The page region — the ONE place the routed page is mounted, in both form
 * factors (#1116).
 *
 * WHY THIS COMPONENT EXISTS
 * -------------------------
 * `Layout` used to pick a whole shell (`<MobileLayout>` vs `<DesktopLayout>`)
 * and render `{children}` inside it. React reconciles by *position and type*, so
 * the moment the 767px media query flipped, the element type at that position
 * changed and React tore down the entire subtree beneath it — every routed page,
 * every `use*` hook, every piece of in-progress form state. Each page then
 * re-mounted and re-ran its fetching effect, which is the "resizing reloads the
 * site" the issue reports.
 *
 * So the page must sit at a form-factor-INDEPENDENT position. Everything from
 * `Layout` down to `{children}` is now the same chain of element types in both
 * form factors — `ShellContent` → `div` → `div` → `main` — and only the
 * classNames differ. React therefore reconciles the wrappers in place and the
 * page below never unmounts. Adding a wrapper on one branch only, or hoisting
 * the region back into a per-form-factor shell, silently reintroduces the bug.
 *
 * The chrome AROUND this region is still two genuinely different trees
 * (ADR-0035): the desktop NavBar + Sidebar + footer, or the mobile header +
 * bottom tab bar. Those may remount freely — they hold no page state.
 *
 * WHY THE RAIL IS PLACED BY GRID COLUMN, NOT BY SOURCE ORDER
 * ----------------------------------------------------------
 * The rail sits on the LEFT (#1191), but `<main>` is still written FIRST and is
 * moved into column 2 by `lg:col-start-2`. Reordering the source instead would
 * make every keyboard and screen-reader user traverse the character card, six
 * task links, five activity links and "Propose a Task" before reaching page
 * content — on EVERY route, since this is app-shell chrome. Two utility classes
 * buy the visual order without paying that.
 *
 * `lg:row-start-1` on both cells is load-bearing. `<main>` is source-first with
 * an explicit `col-start-2`, so grid auto-placement leaves the cursor past
 * column 1; without an explicit row the source-second rail lands on row 2 and
 * the whole rail appears BELOW the page. `col-start-*` is inert with no grid
 * active, so the signed-out and mobile branches are untouched.
 */
interface ShellContentProps {
  /** Straight from `useFormFactor()`; the region only re-dresses itself. */
  readonly isMobile: boolean
  /** Held by `Layout`, not here — `ShellContent` is called as a plain function
   *  by its tests, so it must stay a pure function of its props (no hooks). */
  readonly sidebarCollapsed: boolean
  readonly onToggleSidebar: () => void
  readonly children: ReactNode
}

/** Full-bleed on the phone; bottom padding clears the fixed tab bar + safe area. */
const MOBILE_REGION = 'flex-1 relative px-4 py-4'
/**
 * Centred content column (Style Guide §4.1), on the Home design's shell (#1562).
 *
 * `--shell-max-width` rather than a literal, because `NavBar` caps itself at the
 * same number and the two must not drift — see the token's note in `index.css`.
 * The padding is the design's `32px 40px 72px`: `pt-8 px-10 pb-[72px]`, and 72
 * is arbitrary because it is the one rung the --space-* ramp skips (64 → 96).
 *
 * NOT uniformly a narrowing. At 1920px the old cap resolved to 1600 and this is
 * 1392, so pages lose ~208px; at 1440px the old cap resolved to 92vw = 1325 and
 * this is 1392, so pages GAIN ~67px. Both directions are real regressions to
 * look for.
 */
const DESKTOP_REGION = 'flex-1 relative max-w-[var(--shell-max-width)] mx-auto w-full pt-8 px-10 pb-[72px]'

const MOBILE_REGION_STYLE: CSSProperties = {
  zIndex: 5,
  paddingBottom: 'var(--tab-bar-clearance)',
}
const DESKTOP_REGION_STYLE: CSSProperties = { zIndex: 5 }

/**
 * Desktop rail + content grid; single column while signed out or on a phone.
 *
 * The design's `320px minmax(0, 1fr)` with a `36px` gutter (#1562). The rail is
 * a FIXED 320 now rather than the old `minmax(280px,340px)` elastic band, so the
 * page column absorbs every width change on its own and the rail's line lengths
 * are the same on a 1440 and a 4K monitor. `minmax(0, 1fr)` is the safe form of
 * `1fr` — `<main>`'s `min-w-0` says the same thing, and both are kept because
 * either one alone is one edit away from an overflowing content column.
 */
const SIDEBAR_GRID_EXPANDED = 'gap-9 items-start lg:grid lg:grid-cols-[320px_minmax(0,1fr)]'
/** Folded away: the column shrinks to just the handle and the page takes the rest. */
const SIDEBAR_GRID_COLLAPSED = 'gap-9 items-start lg:grid lg:grid-cols-[auto_minmax(0,1fr)]'

export default function ShellContent({
  isMobile,
  sidebarCollapsed,
  onToggleSidebar,
  children,
}: ShellContentProps) {
  const { user } = useAuth()
  // The sidebar is desktop-only chrome and only meaningful signed in; the phone
  // reaches the same material through the tab bar and the header bell. The
  // handle inherits this gate and the `lg:` one below — a lone chevron toggling
  // an invisible rail in the 768–1023px band would be nonsense.
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
        {/* Collapsed means GONE, not an icon rail: the rail's whole value is
            glanceable TEXT, and an icon strip throws that away. `SidebarColumn`
            delivers that by HIDING the rail rather than unmounting it (#1343),
            so reopening costs no requests. */}
        {showSidebar && (
          <SidebarColumn collapsed={sidebarCollapsed} onToggle={onToggleSidebar} />
        )}
      </div>
    </div>
  )
}

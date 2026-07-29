import type { CSSProperties, ReactNode } from 'react'
import { useAuth } from '../../auth/AuthContext'
import Sidebar from './Sidebar'

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
 */
export interface ShellContentProps {
  /** Straight from `useFormFactor()`; the region only re-dresses itself. */
  readonly isMobile: boolean
  readonly children: ReactNode
}

/** Full-bleed on the phone; bottom padding clears the fixed tab bar + safe area. */
const MOBILE_REGION = 'flex-1 relative px-4 py-4'
/** Centred content column (Style Guide §4.1). */
const DESKTOP_REGION = 'flex-1 relative max-w-[min(92vw,1600px)] mx-auto w-full px-4 sm:px-6 py-5'

const MOBILE_REGION_STYLE: CSSProperties = {
  zIndex: 5,
  paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))',
}
const DESKTOP_REGION_STYLE: CSSProperties = { zIndex: 5 }

/** Desktop content + sidebar grid; single column while signed out or on a phone. */
const SIDEBAR_GRID = 'gap-4 items-start lg:grid lg:grid-cols-[1fr_minmax(280px,340px)]'

export default function ShellContent({ isMobile, children }: ShellContentProps) {
  const { user } = useAuth()
  // The sidebar is desktop-only chrome and only meaningful signed in; the phone
  // reaches the same material through the tab bar and the header bell.
  const showSidebar = !isMobile && Boolean(user)

  return (
    <div
      className={isMobile ? MOBILE_REGION : DESKTOP_REGION}
      style={isMobile ? MOBILE_REGION_STYLE : DESKTOP_REGION_STYLE}
    >
      <div className={showSidebar ? SIDEBAR_GRID : ''}>
        <main className="min-w-0">{children}</main>
        {showSidebar && (
          <div className="hidden lg:block">
            <Sidebar />
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useFormFactor } from '../hooks/useFormFactor'
import { useSidebarCollapsed } from '../hooks/useSidebarCollapsed'
import { BackdropProvider } from './backdrop/BackdropContext'
import FactionBackdrop from './backdrop/FactionBackdrop'
import LevelUpWatcher from './LevelUpWatcher'
import InvitationWatcher from './InvitationWatcher'
import TheArray from './TheArray'
import NavBar from './NavBar'
import { flushPendingCasts } from './vote/pendingCasts'
import { needsCharacterRedirect } from './layout/characterOnboardingGate'
import MobileHeader from './layout/MobileHeader'
import MobileTabBar from './layout/MobileTabBar'
import ShellContent from './layout/ShellContent'
import SiteFooter from './layout/SiteFooter'

/**
 * The app shell. Desktop gets the top NavBar + left sidebar + footer; the phone
 * gets a wordmark header + bottom tab bar (ADR-0035). Those two chromes stay
 * genuinely distinct — but they are rendered as SIBLINGS of the page region,
 * never as its parent.
 *
 * That sibling arrangement is the whole point (#1116): crossing the 767px
 * breakpoint swaps chrome at a stable position while `ShellContent` — and
 * therefore every routed page under it — is reconciled in place instead of being
 * torn down and re-mounted. Before this, a resize or a browser zoom unmounted
 * the entire page tree, re-running every page's fetching effect and discarding
 * any half-filled form. See `ShellContent` for the reconciliation rule that
 * keeps this true.
 */
export default function Layout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isMobile = useFormFactor() === 'mobile'
  // Held here, threaded down as a prop exactly like `isMobile`: `ShellContent`
  // is called as a plain function by its tests, so it cannot own a hook (#1191).
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebarCollapsed()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  // A vote queued but not yet sent must not sit out its debounce across a
  // navigation (#1895). A vote control usually unmounts with its page and
  // flushes itself; this catches one that survives the route change — the
  // reconciled-in-place arrangement above is exactly what lets a subtree do so.
  useEffect(() => {
    flushPendingCasts()
  }, [pathname])

  useEffect(() => {
    if (needsCharacterRedirect(loading, Boolean(user), Boolean(user?.character), pathname)) {
      navigate('/characters/create')
    }
  }, [user, loading, pathname, navigate])

  return (
    <BackdropProvider>
    <div className="min-h-screen flex flex-col relative">
      <FactionBackdrop />
      <LevelUpWatcher />
      <InvitationWatcher />
      {/* Singularity's perk (#1869): renders nothing, speaks in the console. */}
      <TheArray />

      {isMobile ? <MobileHeader /> : <NavBar />}
      <ShellContent
        isMobile={isMobile}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      >
        {children}
      </ShellContent>
      {isMobile ? <MobileTabBar /> : <SiteFooter />}
    </div>
    </BackdropProvider>
  )
}

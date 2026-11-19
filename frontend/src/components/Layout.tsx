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
import { characterRedirectTarget } from './layout/characterOnboardingGate'
import { markOnboardingHandoff, onboardingHandoffPending } from '../utils/onboardingResume'
import MobileHeader from './layout/MobileHeader'
import MobileTabBar from './layout/MobileTabBar'
import ShellContent from './layout/ShellContent'
import SiteFooter from './layout/SiteFooter'

/**
 * The app shell (ADR-0035). Desktop and phone chromes are SIBLINGS of the page
 * region, never its parent (#1116), so crossing the breakpoint doesn't remount
 * the page tree. See `ShellContent`.
 */
export default function Layout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isMobile = useFormFactor() === 'mobile'
  // Held here: `ShellContent` is called as a plain function by tests, so owns no hook (#1191).
  const { collapsed: sidebarCollapsed, toggle: toggleSidebar } = useSidebarCollapsed()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  // A held vote change must not outlive a navigation (#1895); catches a vote control that survives the route change.
  useEffect(() => {
    flushPendingCasts()
  }, [pathname])

  useEffect(() => {
    const target = characterRedirectTarget(
      loading,
      Boolean(user),
      Boolean(user?.character),
      Boolean(user?.has_accepted_terms),
      pathname,
      onboardingHandoffPending(),
      Boolean(user?.character_creation_banned),
    )
    if (!target) return
    // Landing at the contract is the flow's resume mark.
    if (target === '/start') markOnboardingHandoff()
    navigate(target)
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
      <SiteFooter isMobile={isMobile} />
      {isMobile && <MobileTabBar />}
    </div>
    </BackdropProvider>
  )
}

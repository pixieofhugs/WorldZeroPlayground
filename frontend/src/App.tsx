import { lazy, Suspense, useState, type ComponentType } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from './components/Layout'
import ProtectedRoute from './auth/ProtectedRoute'
import { useAuth, hadSessionLastVisit } from './auth/AuthContext'
import { useAdminMode } from './auth/AdminModeContext'
import { loadAppCopy, loadOnboardingCopy } from './i18n'
import { onboardingHandoffPending } from './utils/onboardingResume'
import LoginNotice from './components/LoginNotice'
import { importAccountDeleted } from './pages/accountDeletedLoader'

/**
 * Every page is code-split (#1045); chrome stays eager.
 *
 * Named loaders let a chunk start before `/auth/me` answers: `RootLanding`
 * warms one (#1380), and each `ProtectedRoute warm` must name its child's
 * loader (#1483; `auth/__tests__/appProtectedRoutesWarm.test.tsx` renders
 * App over a path table). `import()` is memoised, so warming is idempotent.
 */
/** Admin, forms and feed copy ride with the routes that read them, not the entry chunk (#3557). */
const withAppCopy = <T,>(page: Promise<T>) => Promise.all([page, loadAppCopy()]).then(([m]) => m)
const importFieldDesk = () => withAppCopy(import('./pages/FieldDesk'))
const importEditPraxis = () => withAppCopy(import('./pages/EditPraxis'))
const importEditCharacter = () => withAppCopy(import('./pages/EditCharacter'))
const importUpdates = () => withAppCopy(import('./pages/Updates'))
const importSettings = () => withAppCopy(import('./pages/Settings'))
const importAdmin = () => withAppCopy(import('./pages/Admin'))
const importFactionCopySheet = () => withAppCopy(import('./pages/admin/FactionCopySheet'))
const importLevelUpCopySheet = () => withAppCopy(import('./pages/admin/LevelUpCopySheet'))
const importCreateCharacter = () => withAppCopy(import('./pages/CreateCharacter'))
const importProposeTask = () => withAppCopy(import('./pages/ProposeTask'))

/** The flow's character step renders the create form, so it reads `forms:` too. */
const withOnboardingCopy = <T,>(page: Promise<T>) => Promise.all([page, loadOnboardingCopy(), loadAppCopy()]).then(([m]) => m)
const importOnboarding = () => withOnboardingCopy(import('./pages/Onboarding'))

const FieldDesk = lazy(importFieldDesk)
const Tasks = lazy(() => withAppCopy(import('./pages/Tasks')))
const TaskDetail = lazy(() => withAppCopy(import('./pages/TaskDetail')))
const PraxisDetail = lazy(() => withAppCopy(import('./pages/PraxisDetail')))
const DuelReader = lazy(() => withAppCopy(import('./pages/DuelReader')))
const EditPraxis = lazy(importEditPraxis)
const CharacterProfile = lazy(() => withAppCopy(import('./pages/CharacterProfile')))
const Leaderboard = lazy(() => withAppCopy(import('./pages/Leaderboard')))
const Factions = lazy(() => withAppCopy(import('./pages/Factions')))
const FactionDetail = lazy(() => withAppCopy(import('./pages/FactionDetail')))
const AlbescentSecretPlaceholder = lazy(() => withAppCopy(import('./pages/AlbescentSecretPlaceholder')))
const Updates = lazy(importUpdates)
const Praxes = lazy(() => withAppCopy(import('./pages/Praxes')))
const Settings = lazy(importSettings)
const Admin = lazy(importAdmin)
const consolePage = (pick: (m: typeof import('./pages/admin/consolePages')) => ComponentType) =>
  lazy(() => withAppCopy(import('./pages/admin/consolePages')).then((m) => ({ default: pick(m) })))
const ReportsPage = consolePage((m) => m.ReportsPage)
const MessagesPage = consolePage((m) => m.MessagesPage)
const PraxisPage = consolePage((m) => m.PraxisPage)
const TasksPage = consolePage((m) => m.TasksPage)
const ModLogPage = consolePage((m) => m.ModLogPage)
const SmallWorldPage = consolePage((m) => m.SmallWorldPage)
const PeoplePage = consolePage((m) => m.PeoplePage)
const EraPage = consolePage((m) => m.EraPage)
const CopySheetIndexPage = consolePage((m) => m.CopySheetIndexPage)
const FactionCopySheet = lazy(importFactionCopySheet)
const LevelUpCopySheet = lazy(importLevelUpCopySheet)
const CreateCharacter = lazy(importCreateCharacter)
const EditCharacter = lazy(importEditCharacter)
const About = lazy(() => withAppCopy(import('./pages/About')))
const Contact = lazy(() => withAppCopy(import('./pages/Contact')))
const ProposeTask = lazy(importProposeTask)
const Disclaimer = lazy(() => withAppCopy(import('./pages/Disclaimer')))
const Attributions = lazy(() => withAppCopy(import('./pages/Attributions')))
const Donate = lazy(() => withAppCopy(import('./pages/Donate')))
const AccountDeleted = lazy(importAccountDeleted)
const Onboarding = lazy(importOnboarding)
const ReturningCard = lazy(() => withOnboardingCopy(import('./pages/onboarding/ReturningCard')))
const ModStrip = lazy(() => withAppCopy(import('./components/admin/ModStrip')))

/** Gate lives outside the lazy component so ordinary visitors never fetch its chunk (load-time.md). */
export function ModStripMount({ always = false }: { always?: boolean }) {
  const { user } = useAuth()
  const { adminMode } = useAdminMode()
  if (!user?.is_admin || !(adminMode || always)) return null
  return (
    <Suspense fallback={null}>
      <ModStrip />
    </Suspense>
  )
}

function PageLoading() {
  const { t } = useTranslation('common')
  return <div className="page font-body text-muted">{t('loading')}</div>
}

/** Decided once per mount: creating the character mid-flow must not swap the arrival page for the desk. A pending OAuth resume stays in the flow so the contract is recorded. */
function Landing() {
  const { user } = useAuth()
  const [inFlow] = useState(() => !user?.character || onboardingHandoffPending())
  if (!inFlow) return <FieldDesk />
  return (
    <>
      {!user && <LoginNotice />}
      <Onboarding />
    </>
  )
}

/** `/`: the welcome flow, except for a player with a character, who gets the desk. Exported for tests. */
export function RootLanding() {
  const { loading } = useAuth()
  const { key } = useLocation()
  if (loading) {
    // Overlap the chunk with `/auth/me` (#1380). Warm ONE, picked by the stored
    // hint: warming both cost the signed-in viewer ~270ms on Slow 4G.
    void (hadSessionLastVisit() ? importFieldDesk() : importOnboarding())
    return <PageLoading />
  }
  return <Landing key={key} />
}

/** Albescent secrecy gate (ADR-0027): real page only for accounts with sticky `albescent_revealed`. */
function AlbescentGate() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoading />
  return user?.albescent_revealed ? <FactionDetail slug="albescent" /> : <AlbescentSecretPlaceholder />
}

/** `/admin/*` brings its own layout (#3665), so it sits beside `Layout`, not in it. */
function AdminRoutes() {
  // The console has no mod-mode toggle, so its copy sheets carry the editor themselves.
  const onCopySheet = /^\/admin\/(copy\/|level-ups)/.test(useLocation().pathname)
  return (
    <ProtectedRoute adminOnly warm={importAdmin}>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route element={<Admin />}>
            <Route index element={<Navigate to="reports" replace />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="proposals" element={<TasksPage />} />
            <Route path="praxis" element={<PraxisPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="people" element={<PeoplePage />} />
            <Route path="small-world" element={<SmallWorldPage />} />
            <Route path="mod-log" element={<ModLogPage />} />
            <Route path="era" element={<EraPage />} />
            <Route path="copy" element={<CopySheetIndexPage />} />
            {/* One faction's surfaces on one page, for the copy editor. */}
            <Route path="copy/:slug" element={<FactionCopySheet />} />
            {/* Every level's Field Stamp on one page, for the same editor. */}
            <Route path="level-ups" element={<LevelUpCopySheet />} />
          </Route>
        </Routes>
      </Suspense>
      <ModStripMount always={onCopySheet} />
    </ProtectedRoute>
  )
}

function PlayerRoutes() {
  return (
    <Layout>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<RootLanding />} />
          {/* QR destination; unguarded: explains the game before asking for an account (#1861). */}
          <Route path="/start" element={<Onboarding />} />
          {/* Returning deleted player (#2162); unguarded, no session exists yet. */}
          <Route path="/start/again" element={<ReturningCard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/tasks/:id" element={<TaskDetail />} />
          <Route path="/praxis" element={<Praxes />} />
          <Route path="/praxis/:id" element={<PraxisDetail />} />
          <Route
            path="/praxis/:id/edit"
            element={
              <ProtectedRoute warm={importEditPraxis}>
                <EditPraxis />
              </ProtectedRoute>
            }
          />
          {/* Settled-duel reader (#1084), public. `?from=<praxis id>` picks the
              panel opened on a phone. */}
          <Route path="/duel/:id" element={<DuelReader />} />
          <Route path="/characters/:id" element={<CharacterProfile />} />
          <Route
            path="/characters/:id/edit"
            element={
              <ProtectedRoute warm={importEditCharacter}>
                <EditCharacter />
              </ProtectedRoute>
            }
          />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/factions" element={<Factions />} />
          {/* Static segment outranks `:slug`, so this intercepts. */}
          <Route path="/factions/albescent" element={<AlbescentGate />} />
          <Route path="/factions/:slug" element={<FactionDetail />} />
          <Route
            path="/updates"
            element={
              <ProtectedRoute warm={importUpdates}>
                <Updates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute warm={importSettings}>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/characters/create"
            element={
              <ProtectedRoute warm={importCreateCharacter}>
                <CreateCharacter />
              </ProtectedRoute>
            }
          />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route
            path="/propose-task"
            element={
              <ProtectedRoute warm={importProposeTask}>
                <ProposeTask />
              </ProtectedRoute>
            }
          />
          {/* Post-deletion landing (#2161): unguarded, the session is already
              gone. The delete flow awaits its loader before signing out (#3134). */}
          <Route path="/goodbye" element={<AccountDeleted />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/attributions" element={<Attributions />} />
          <Route path="/donate" element={<Donate />} />
        </Routes>
      </Suspense>
      <ModStripMount />
    </Layout>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminRoutes />} />
      <Route path="*" element={<PlayerRoutes />} />
    </Routes>
  )
}

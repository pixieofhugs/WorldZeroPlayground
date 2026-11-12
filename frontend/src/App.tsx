import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from './components/Layout'
import ProtectedRoute from './auth/ProtectedRoute'
import { useAuth, hadSessionLastVisit } from './auth/AuthContext'
import { useAdminMode } from './auth/AdminModeContext'
import { onboardingHandoffPending } from './utils/onboardingResume'
import { importAccountDeleted } from './pages/accountDeletedLoader'

/**
 * Every page is code-split (#1045); chrome stays eager.
 *
 * Named loaders let a chunk start before `/auth/me` answers: `RootLanding`
 * warms one (#1380), and each `ProtectedRoute warm` must name its child's
 * loader (#1483; `protectedRoute.test.tsx` scans this file). `import()` is
 * memoised, so warming is idempotent.
 */
const importHome = () => import('./pages/Home')
const importFieldDesk = () => import('./pages/FieldDesk')
const importEditPraxis = () => import('./pages/EditPraxis')
const importEditCharacter = () => import('./pages/EditCharacter')
const importUpdates = () => import('./pages/Updates')
const importSettings = () => import('./pages/Settings')
const importAdmin = () => import('./pages/Admin')
const importFactionCopySheet = () => import('./pages/admin/FactionCopySheet')
const importLevelUpCopySheet = () => import('./pages/admin/LevelUpCopySheet')
const importCreateCharacter = () => import('./pages/CreateCharacter')
const importProposeTask = () => import('./pages/ProposeTask')

const Home = lazy(importHome)
const FieldDesk = lazy(importFieldDesk)
const Tasks = lazy(() => import('./pages/Tasks'))
const TaskDetail = lazy(() => import('./pages/TaskDetail'))
const PraxisDetail = lazy(() => import('./pages/PraxisDetail'))
const DuelReader = lazy(() => import('./pages/DuelReader'))
const EditPraxis = lazy(importEditPraxis)
const CharacterProfile = lazy(() => import('./pages/CharacterProfile'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const Factions = lazy(() => import('./pages/Factions'))
const FactionDetail = lazy(() => import('./pages/FactionDetail'))
const AlbescentSecretPlaceholder = lazy(() => import('./pages/AlbescentSecretPlaceholder'))
const Updates = lazy(importUpdates)
const Praxes = lazy(() => import('./pages/Praxes'))
const Settings = lazy(importSettings)
const Admin = lazy(importAdmin)
const FactionCopySheet = lazy(importFactionCopySheet)
const LevelUpCopySheet = lazy(importLevelUpCopySheet)
const CreateCharacter = lazy(importCreateCharacter)
const EditCharacter = lazy(importEditCharacter)
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const ProposeTask = lazy(importProposeTask)
const Disclaimer = lazy(() => import('./pages/Disclaimer'))
const Attributions = lazy(() => import('./pages/Attributions'))
const Donate = lazy(() => import('./pages/Donate'))
const AccountDeleted = lazy(importAccountDeleted)
const Onboarding = lazy(() => import('./pages/Onboarding'))
const ReturningCard = lazy(() => import('./pages/onboarding/ReturningCard'))
const CopyEditor = lazy(() => import('./components/admin/CopyEditor'))

/** Gate lives outside the lazy component so ordinary visitors never fetch its chunk (load-time.md). */
function CopyEditorMount() {
  const { user } = useAuth()
  const { adminMode } = useAdminMode()
  if (!user?.is_admin || !adminMode) return null
  return (
    <Suspense fallback={null}>
      <CopyEditor />
    </Suspense>
  )
}

function PageLoading() {
  const { t } = useTranslation('common')
  return <div className="page font-body text-muted">{t('loading')}</div>
}

/** `/`: FieldDesk when signed in, marketing Home otherwise. Exported for tests. */
export function RootLanding() {
  const { user, loading } = useAuth()
  if (loading) {
    // Overlap the chunk with `/auth/me` (#1380). Warm ONE, picked by the stored
    // hint: warming both cost the signed-in viewer ~270ms on Slow 4G.
    void (hadSessionLastVisit() ? importFieldDesk() : importHome())
    return <PageLoading />
  }
  // OAuth always returns to `/`; resume onboarding if it was left for a
  // provider (one-shot sessionStorage flag, `utils/onboardingResume`).
  if (user && onboardingHandoffPending()) return <Navigate to="/start" replace />
  return user ? <FieldDesk /> : <Home />
}

/** Albescent secrecy gate (ADR-0027): real page only for accounts with sticky `albescent_revealed`. */
function AlbescentGate() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoading />
  return user?.albescent_revealed ? <FactionDetail slug="albescent" /> : <AlbescentSecretPlaceholder />
}

export default function App() {
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
            path="/admin"
            element={
              <ProtectedRoute adminOnly warm={importAdmin}>
                <Admin />
              </ProtectedRoute>
            }
          />
          {/* One faction's surfaces on one page, for the copy editor. */}
          <Route
            path="/admin/copy/:slug"
            element={
              <ProtectedRoute adminOnly warm={importFactionCopySheet}>
                <FactionCopySheet />
              </ProtectedRoute>
            }
          />
          {/* Every level's Field Stamp on one page, for the same editor. */}
          <Route
            path="/admin/level-ups"
            element={
              <ProtectedRoute adminOnly warm={importLevelUpCopySheet}>
                <LevelUpCopySheet />
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
      <CopyEditorMount />
    </Layout>
  )
}

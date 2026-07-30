import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from './components/Layout'
import ProtectedRoute from './auth/ProtectedRoute'
import { useAuth } from './auth/AuthContext'

/**
 * Every page is code-split (#1045). The chrome above stays eager — Layout and
 * the auth guards render on every route, so deferring them would only add a
 * round trip before the first pixel.
 */
const Home = lazy(() => import('./pages/Home'))
const FieldDesk = lazy(() => import('./pages/FieldDesk'))
const Tasks = lazy(() => import('./pages/Tasks'))
const TaskDetail = lazy(() => import('./pages/TaskDetail'))
const PraxisDetail = lazy(() => import('./pages/PraxisDetail'))
const EditPraxis = lazy(() => import('./pages/EditPraxis'))
const CharacterProfile = lazy(() => import('./pages/CharacterProfile'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const Factions = lazy(() => import('./pages/Factions'))
const FactionDetail = lazy(() => import('./pages/FactionDetail'))
const AlbescentSecretPlaceholder = lazy(() => import('./pages/AlbescentSecretPlaceholder'))
const Updates = lazy(() => import('./pages/Updates'))
const Praxes = lazy(() => import('./pages/Praxes'))
const Settings = lazy(() => import('./pages/Settings'))
const Admin = lazy(() => import('./pages/Admin'))
const CreateCharacter = lazy(() => import('./pages/CreateCharacter'))
const EditCharacter = lazy(() => import('./pages/EditCharacter'))
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const ProposeTask = lazy(() => import('./pages/ProposeTask'))
const Disclaimer = lazy(() => import('./pages/Disclaimer'))
const Attributions = lazy(() => import('./pages/Attributions'))
const Donate = lazy(() => import('./pages/Donate'))

/** The one loading surface: route chunk in flight, or the session still resolving. */
function PageLoading() {
  const { t } = useTranslation('common')
  return <div className="page font-body text-muted">{t('loading')}</div>
}

/** `/` is the FieldDesk for an authenticated account, the marketing Home otherwise. */
function RootLanding() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoading />
  return user ? <FieldDesk /> : <Home />
}

/**
 * Albescent secrecy gate (#390, ADR-0027). Albescent is a secret society: an
 * account only sees the real faction page once it has ever had a character join
 * Albescent (sticky `albescent_revealed`). Everyone else — including anonymous
 * visitors — gets the in-world sealed placeholder. Albescent stays ua-aliased
 * visually until #232; here we only route to the existing FactionDetail.
 */
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
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/tasks/:id" element={<TaskDetail />} />
          <Route path="/praxis" element={<Praxes />} />
          <Route path="/praxis/:id" element={<PraxisDetail />} />
          <Route
            path="/praxis/:id/edit"
            element={
              <ProtectedRoute>
                <EditPraxis />
              </ProtectedRoute>
            }
          />
          <Route path="/characters/:id" element={<CharacterProfile />} />
          <Route
            path="/characters/:id/edit"
            element={
              <ProtectedRoute>
                <EditCharacter />
              </ProtectedRoute>
            }
          />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/factions" element={<Factions />} />
          {/* Albescent is sealed until revealed (#390, ADR-0027). Static segment
              outranks `:slug`, so this intercepts. AlbescentGate shows the real
              faction page to revealed accounts, the in-world dead end to everyone
              else. */}
          <Route path="/factions/albescent" element={<AlbescentGate />} />
          <Route path="/factions/:slug" element={<FactionDetail />} />
          <Route
            path="/updates"
            element={
              <ProtectedRoute>
                <Updates />
              </ProtectedRoute>
            }
          />
          {/* Mobile-only Settings surface (#520). The page redirects to `/` on
              desktop, which keeps the desktop NavBar controls the sole path. */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/characters/create"
            element={
              <ProtectedRoute>
                <CreateCharacter />
              </ProtectedRoute>
            }
          />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route
            path="/propose-task"
            element={
              <ProtectedRoute>
                <ProposeTask />
              </ProtectedRoute>
            }
          />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/attributions" element={<Attributions />} />
          <Route path="/donate" element={<Donate />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

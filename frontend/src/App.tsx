import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from './components/Layout'
import ProtectedRoute from './auth/ProtectedRoute'
import { useAuth, hadSessionLastVisit } from './auth/AuthContext'
import { onboardingHandoffPending } from './utils/onboardingResume'

/**
 * Every page is code-split (#1045). The chrome above stays eager — Layout and
 * the auth guards render on every route, so deferring them would only add a
 * round trip before the first pixel.
 *
 * `/`'s two landings get named loaders rather than inline arrows so that
 * `RootLanding` can start one before it knows which it needs (#1380). Dynamic
 * `import()` is memoised by the module registry, so calling one of these is
 * idempotent: the warm call and the render that follows share a request.
 *
 * Every page behind `ProtectedRoute` gets a named loader for the same reason
 * (#1483): the guard renders a loading surface *instead of* its children while
 * `/auth/me` is in flight, so without the loader in hand the chunk could not
 * start until the session answered. Each `warm` must name the loader for the
 * page in that route's children — `auth/__tests__/protectedRoute.test.tsx`
 * scans this file to keep the pairs honest.
 */
const importHome = () => import('./pages/Home')
const importFieldDesk = () => import('./pages/FieldDesk')
const importEditPraxis = () => import('./pages/EditPraxis')
const importEditCharacter = () => import('./pages/EditCharacter')
const importUpdates = () => import('./pages/Updates')
const importSettings = () => import('./pages/Settings')
const importAdmin = () => import('./pages/Admin')
const importCreateCharacter = () => import('./pages/CreateCharacter')
const importProposeTask = () => import('./pages/ProposeTask')

const Home = lazy(importHome)
const FieldDesk = lazy(importFieldDesk)
const Tasks = lazy(() => import('./pages/Tasks'))
const TaskDetail = lazy(() => import('./pages/TaskDetail'))
const PraxisDetail = lazy(() => import('./pages/PraxisDetail'))
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
const CreateCharacter = lazy(importCreateCharacter)
const EditCharacter = lazy(importEditCharacter)
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const ProposeTask = lazy(importProposeTask)
const Disclaimer = lazy(() => import('./pages/Disclaimer'))
const Attributions = lazy(() => import('./pages/Attributions'))
const Donate = lazy(() => import('./pages/Donate'))
const AccountDeleted = lazy(() => import('./pages/AccountDeleted'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const ReturningCard = lazy(() => import('./pages/onboarding/ReturningCard'))

/** The one loading surface: route chunk in flight, or the session still resolving. */
function PageLoading() {
  const { t } = useTranslation('common')
  return <div className="page font-body text-muted">{t('loading')}</div>
}

/** `/` is the FieldDesk for an authenticated account, the marketing Home otherwise.
 *  Exported for `__tests__/rootLandingChunks.test.tsx` — App's other routes are
 *  plain elements, but this one holds a gate worth pinning. */
export function RootLanding() {
  const { user, loading } = useAuth()
  if (loading) {
    // WHICH component renders needs the auth answer; the chunk download does
    // not. Every other route fetches its chunk in parallel with `/auth/me`;
    // `/` — the most-visited URL — used to wait for it, so a visitor paid the
    // two costs end to end instead of overlapped (#1380).
    //
    // One chunk, not both. Warming both is the obvious version and it was
    // measured on Slow 4G: the guest gained ~280ms and the signed-in viewer
    // LOST ~270ms, because FieldDesk then arrives behind Home's twenty-odd
    // chunks over a shared link — "preloading can make things much worse"
    // (docs/agents/load-time.md) in miniature. The stored hint picks the likely
    // landing instead, so both viewers gain and neither downloads a chunk it
    // will not use.
    //
    // A wrong hint — the load right after signing in, or a session that expired
    // since — lands back on the warm-both numbers for that one load, and
    // corrects itself as soon as `/auth/me` answers.
    void (hadSessionLastVisit() ? importFieldDesk() : importHome())
    return <PageLoading />
  }
  // The OAuth round trip lands here and nowhere else: the backend callback
  // redirects to a constant (`settings.FRONTEND_URL`), so a player who left the
  // onboarding flow for a provider comes back to `/` rather than to the card
  // they were on. This is the whole of putting them back — a boolean in
  // `sessionStorage`, read only once a session actually exists, and cleared by
  // the flow on mount so it can fire at most once. Nothing rides on the wire
  // and `routers/auth.py` is untouched. See `utils/onboardingResume`.
  if (user && onboardingHandoffPending()) return <Navigate to="/start" replace />
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
          {/* The QR code's one destination, and Home's logged-out CTA's. No
              `ProtectedRoute`: the arc explains the game BEFORE it asks for an
              account, which is the whole point of it (#1861). */}
          <Route path="/start" element={<Onboarding />} />
          {/* Where `backend/routers/auth.py` sends a returning deleted player
              (#2162). No `ProtectedRoute` and no session yet — being asked
              BEFORE an account exists is the entire point of the gate. Under
              `/start` because confirming continues into that arc. */}
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
          {/* Albescent is sealed until revealed (#390, ADR-0027). Static segment
              outranks `:slug`, so this intercepts. AlbescentGate shows the real
              faction page to revealed accounts, the in-world dead end to everyone
              else. */}
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
          {/* Settings — one responsive surface in both form factors (#2154).
              #520's desktop redirect is gone by owner ruling; the NavBar's old
              theme toggle is now the desktop way in, the phone still arrives
              through `MobileHeader`. */}
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
          {/* Where the danger zone lands a deleted account (#2161). No
              `ProtectedRoute`: it is reached with the session already dropped,
              and a guard would bounce the one reader it exists for. */}
          <Route path="/goodbye" element={<AccountDeleted />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/attributions" element={<Attributions />} />
          <Route path="/donate" element={<Donate />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

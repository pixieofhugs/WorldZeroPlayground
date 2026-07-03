import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './auth/ProtectedRoute'
import { useAuth } from './auth/AuthContext'
import Home from './pages/Home'
import FieldDesk from './pages/FieldDesk'
import Tasks from './pages/Tasks'
import TaskDetail from './pages/TaskDetail'
import PraxisDetail from './pages/PraxisDetail'
import EditPraxis from './pages/EditPraxis'
import CharacterProfile from './pages/CharacterProfile'
import Leaderboard from './pages/Leaderboard'
import Factions from './pages/Factions'
import FactionDetail from './pages/FactionDetail'
import AlbescentSecretPlaceholder from './pages/AlbescentSecretPlaceholder'
import Updates from './pages/Updates'
import Praxes from './pages/Praxes'
import Admin from './pages/Admin'
import CreateCharacter from './pages/CreateCharacter'
import EditCharacter from './pages/EditCharacter'
import About from './pages/About'
import Contact from './pages/Contact'
import ProposeTask from './pages/ProposeTask'
import Disclaimer from './pages/Disclaimer'
import Attributions from './pages/Attributions'
import Donate from './pages/Donate'

/** `/` is the FieldDesk for an authenticated account, the marketing Home otherwise. */
function RootLanding() {
  const { user, loading } = useAuth()
  if (loading) return <div className="page font-body text-muted">Loading...</div>
  return user ? <FieldDesk /> : <Home />
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<RootLanding />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route path="/praxes" element={<Praxes />} />
        <Route path="/praxes/:id" element={<PraxisDetail />} />
        <Route
          path="/praxes/:id/edit"
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
        {/* Albescent is sealed: outsiders get an in-world dead end, not the
            faction page. Static segment outranks `:slug`, so this intercepts.
            TODO(#390): gate on account.albescent_revealed — show real faction
            page once revealed. */}
        <Route path="/factions/albescent" element={<AlbescentSecretPlaceholder />} />
        <Route path="/factions/:slug" element={<FactionDetail />} />
        <Route
          path="/updates"
          element={
            <ProtectedRoute>
              <Updates />
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
    </Layout>
  )
}

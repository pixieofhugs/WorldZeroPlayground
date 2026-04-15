import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './auth/ProtectedRoute'
import Home from './pages/Home'
import Tasks from './pages/Tasks'
import TaskDetail from './pages/TaskDetail'
import SubmitProof from './pages/SubmitProof'
import PraxisDetail from './pages/PraxisDetail'
import EditPraxis from './pages/EditPraxis'
import CharacterProfile from './pages/CharacterProfile'
import Leaderboard from './pages/Leaderboard'
import Factions from './pages/Factions'
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
import CollaborationDetail from './pages/CollaborationDetail'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/tasks/:id" element={<TaskDetail />} />
        <Route
          path="/tasks/:id/submit"
          element={
            <ProtectedRoute>
              <SubmitProof />
            </ProtectedRoute>
          }
        />
        <Route path="/collaborations/:id" element={<CollaborationDetail />} />
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

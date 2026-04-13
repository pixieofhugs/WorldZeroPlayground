import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './auth/ProtectedRoute'
import Home from './pages/Home'
import Tasks from './pages/Tasks'
import TaskDetail from './pages/TaskDetail'
import SubmitProof from './pages/SubmitProof'
import SubmissionDetail from './pages/SubmissionDetail'
import EditSubmission from './pages/EditSubmission'
import CharacterProfile from './pages/CharacterProfile'
import Leaderboard from './pages/Leaderboard'
import Factions from './pages/Factions'
import Updates from './pages/Updates'
import Submissions from './pages/Submissions'
import Admin from './pages/Admin'
import CreateCharacter from './pages/CreateCharacter'
import EditCharacter from './pages/EditCharacter'
import About from './pages/About'
import Contact from './pages/Contact'
import Disclaimer from './pages/Disclaimer'
import Attributions from './pages/Attributions'
import Donate from './pages/Donate'

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
        <Route path="/submissions" element={<Submissions />} />
        <Route path="/submissions/:id" element={<SubmissionDetail />} />
        <Route
          path="/submissions/:id/edit"
          element={
            <ProtectedRoute>
              <EditSubmission />
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
        <Route path="/disclaimer" element={<Disclaimer />} />
        <Route path="/attributions" element={<Attributions />} />
        <Route path="/donate" element={<Donate />} />
      </Routes>
    </Layout>
  )
}

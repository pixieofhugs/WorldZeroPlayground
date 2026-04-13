import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { getTask, getMyTasks, signupTask, dropTask, type TaskOut } from '../api/tasks'
import { listSubmissions, type SubmissionOut } from '../api/submissions'
import SubmissionCard from '../components/SubmissionCard'
import { useAuth } from '../auth/AuthContext'
import { extractError } from '../utils/errors'

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [task, setTask] = useState<TaskOut | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionOut[]>([])
  const [isInProgress, setIsInProgress] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [signupError, setSignupError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setIsInProgress(false)
    const taskId = parseInt(id, 10)
    const fetches: Promise<unknown>[] = [getTask(taskId), listSubmissions({ task_id: taskId })]
    if (user) fetches.push(getMyTasks('in_progress'))
    Promise.all(fetches)
      .then(([t, s, myTasks]) => {
        setTask(t as TaskOut)
        setSubmissions(s as SubmissionOut[])
        if (myTasks) {
          setIsInProgress((myTasks as { task: { id: number } }[]).some((ct) => ct.task.id === taskId))
        }
      })
      .catch((err) => setFetchError(extractError(err, "Couldn't load this task.")))
      .finally(() => setLoading(false))
  }, [id, location.key])

  const mySubmission = user?.character
    ? submissions.find((s) => s.character_id === user.character!.id)
    : undefined

  const handleSignup = async () => {
    if (!task) return
    setSignupError(null)
    try {
      await signupTask(task.id)
      navigate(`/tasks/${task.id}/submit`)
    } catch (err) {
      setSignupError(extractError(err, 'Could not sign up for this task.'))
    }
  }

  const handleDrop = async () => {
    if (!task || !window.confirm('Drop this task? You can sign up again later.')) return
    setSignupError(null)
    try {
      await dropTask(task.id)
      setIsInProgress(false)
    } catch (err) {
      setSignupError(extractError(err, 'Could not drop this task.'))
    }
  }

  if (loading) return <div className="py-8 font-body text-muted">Loading...</div>
  if (fetchError) return (
    <div className="py-8">
      <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
        {fetchError}{' '}
        <button onClick={() => window.location.reload()} className="underline">Try refreshing.</button>
      </p>
    </div>
  )
  if (!task) return <div className="py-8 font-body text-muted">Task not found.</div>

  return (
    <div className="py-8">
      <Link to="/tasks" className="font-body text-xs text-muted hover:underline">← back to tasks</Link>

      <div className="card p-5 my-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-body text-xs text-muted uppercase tracking-widest mb-1">
              {task.primary_faction_slug ?? 'Unaffiliated'} · {task.point_value} pts · lvl {task.level_required}+
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight">{task.title}</h1>
          </div>
          {user && mySubmission && (
            <Link to={`/submissions/${mySubmission.id}/edit`} className="btn-primary shrink-0">
              submitted ✓ — edit
            </Link>
          )}
          {user && !mySubmission && isInProgress && (
            <div className="flex gap-2 shrink-0">
              <Link to={`/tasks/${task.id}/submit`} className="btn-primary">
                in progress → submit
              </Link>
              <button onClick={handleDrop} className="font-body text-xs text-muted hover:underline">
                drop
              </button>
            </div>
          )}
          {user && !mySubmission && !isInProgress && (user.character?.level ?? 0) >= task.level_required && (
            <button onClick={handleSignup} className="btn-primary shrink-0">sign up</button>
          )}
        </div>

        {signupError && (
          <p className="font-body text-xs text-red-600 mt-2">{signupError}</p>
        )}

        {task.description && (
          <p className="font-body text-base text-muted mt-4 leading-relaxed whitespace-pre-wrap">
            {task.description}
          </p>
        )}
      </div>

      <div className="flex items-baseline gap-3 mt-8 mb-4 border-b-2 border-border pb-2">
        <h2 className="font-display text-2xl font-bold">Praxis</h2>
        <span className="font-body text-sm text-muted">{submissions.length} submissions</span>
      </div>

      {submissions.length === 0 ? (
        <p className="font-body text-muted">No submissions yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {submissions.map((s) => <SubmissionCard key={s.id} submission={s} />)}
        </div>
      )}
    </div>
  )
}

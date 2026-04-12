import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listSubmissions, type SubmissionOut } from '../api/submissions'
import { getMessages, type MessageOut } from '../api/messages'
import { getMyTasks, type CharacterTaskOut } from '../api/tasks'
import SubmissionCard from '../components/SubmissionCard'
import { useAuth } from '../auth/AuthContext'
import { formatTimestamp } from '../utils/dates'
import { extractError } from '../utils/errors'

export default function Updates() {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState<SubmissionOut[]>([])
  const [messages, setMessages] = useState<MessageOut[]>([])
  const [inProgressTasks, setInProgressTasks] = useState<CharacterTaskOut[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      listSubmissions(user?.character ? { character_id: user.character.id } : {}),
      getMessages(),
      getMyTasks('in_progress'),
    ])
      .then(([s, m, t]) => { setSubmissions(s); setMessages(m); setInProgressTasks(t) })
      .catch((err) => setFetchError(extractError(err, "Couldn't load your updates.")))
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="page font-body text-muted">Loading...</div>

  if (fetchError) return (
    <div className="page">
      <h1 className="page-heading">Updates</h1>
      <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
        {fetchError}{' '}
        <button onClick={() => window.location.reload()} className="underline">Try refreshing.</button>
      </p>
    </div>
  )

  return (
    <div className="page">
      <h1 className="page-heading">Updates</h1>

      {messages.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display text-2xl font-bold mb-3">Messages</h2>
          <div className="flex flex-col gap-2">
            {messages.map((m) => (
              <div key={m.id} className="card px-4 py-3 flex items-start gap-3">
                <div className="flex-1">
                  <p className="font-body text-sm">{m.body}</p>
                  <p className="font-body text-xs text-muted mt-1">
                    from #{m.from_character_id} · {formatTimestamp(m.created_at)}
                    {!m.read_at && <span className="ml-2 text-ua font-bold">new</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="font-display text-2xl font-bold mb-3">Tasks in Progress</h2>
        {inProgressTasks.length === 0 ? (
          <p className="font-body text-muted">No tasks in progress. <Link to="/tasks" className="underline">Browse tasks</Link> to sign up.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {inProgressTasks.map((ct) => (
              <div key={ct.id} className="card px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-body font-semibold">{ct.task.title}</p>
                  <p className="font-body text-xs text-muted">{ct.task.point_value} pts · signed up {formatTimestamp(ct.signed_up_at)}</p>
                </div>
                <Link
                  to={`/tasks/${ct.task.id}/submit`}
                  className="font-body text-sm border-2 border-current px-3 py-1 hover:bg-ua hover:text-white hover:border-ua transition-colors whitespace-nowrap"
                >
                  Submit Proof
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold mb-3">Your Praxis</h2>
        {submissions.length === 0 ? (
          <p className="font-body text-muted">You haven't submitted any praxis yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {submissions.map((s) => <SubmissionCard key={s.id} submission={s} />)}
          </div>
        )}
      </section>
    </div>
  )
}

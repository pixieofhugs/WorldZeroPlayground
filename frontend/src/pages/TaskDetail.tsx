import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { getTask, getMyTasks, signupTask, dropTask, type TaskOut } from '../api/tasks'
import { listSubmissions, type SubmissionOut } from '../api/submissions'
import SubmissionCard from '../components/SubmissionCard'
import LevelPill from '../components/ui/LevelPill'
import PageTitle from '../components/ui/PageTitle'
import { useAuth } from '../auth/AuthContext'
import { useTheme } from '../hooks/useTheme'
import { factionColor, factionName } from '../utils/factions'
import { extractError } from '../utils/errors'

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { theme } = useTheme()
  const dark = theme === 'dark'
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

  const color = factionColor(task.primary_faction_slug)
  const fname = factionName(task.primary_faction_slug)
  const canSignUp = user && !mySubmission && !isInProgress && (user.character?.level ?? 0) >= task.level_required
  const meetsLevel = (user?.character?.level ?? 0) >= task.level_required

  return (
    <div className="py-8">
      {/* ── Breadcrumb (§15.2) ── */}
      <nav className="font-body mb-4" style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--color-text-tertiary)' }}>
        <Link to="/tasks" style={{ color: 'inherit', textDecoration: 'none' }}>Tasks</Link>
        {' › '}
        <span style={{ color: 'var(--color-text-primary)' }}>{task.title}</span>
      </nav>

      {/* ── Task Hero Block — Faction Expanded (§15.3) ── */}
      <div
        className="sidebar-card mb-5"
        style={{ borderLeft: `4px solid ${color}`, padding: '18px 22px' }}
      >
        {/* Faction pennant + status + level */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span
            style={{
              display: 'inline-block',
              clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)',
              background: color, color: 'white',
              fontFamily: "'Courier Prime', monospace",
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.07em', padding: '3px 14px',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            {fname}
          </span>
          <span
            className="font-body"
            style={{
              fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em',
              padding: '2px 8px', borderRadius: 4,
              background: task.status === 'active' ? (dark ? 'rgba(74,222,128,0.15)' : 'rgba(21,128,61,0.1)') : 'var(--color-bg-surface-alt)',
              color: task.status === 'active' ? '#15803d' : 'var(--color-text-tertiary)',
            }}
          >
            {task.status}
          </span>
          <LevelPill level={task.level_required} />
        </div>

        {/* Title */}
        <h1
          className="font-display italic font-medium"
          style={{ fontSize: 28, color: 'var(--color-text-primary)', lineHeight: 1.2, marginBottom: 8 }}
        >
          {task.title}
        </h1>

        {/* Stats */}
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          {task.point_value} base pts · {submissions.length} submissions
        </div>

        {/* Description */}
        {task.description && (
          <p
            className="font-body"
            style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}
          >
            {task.description}
          </p>
        )}
      </div>

      {/* ── Sign-Up Block (§15.4) ── */}
      {user && (
        <div className="sidebar-card mb-5" style={{ padding: '16px 20px' }}>
          {/* Already submitted */}
          {mySubmission ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  background: `${color}18`,
                  border: `1.5px solid ${color}40`,
                  borderRadius: 8,
                  padding: '8px 16px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  flex: 1,
                }}
              >
                <span style={{ color, fontSize: 16 }}>✓</span>
                <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-primary)' }}>
                  You've submitted praxis for this task
                </span>
              </div>
              <Link to={`/submissions/${mySubmission.id}/edit`} className="btn-outline" style={{ fontSize: 8, padding: '4px 12px' }}>
                edit
              </Link>
            </div>
          ) : isInProgress ? (
            /* In progress — submit or drop */
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  background: `${color}18`,
                  border: `1.5px solid ${color}40`,
                  borderRadius: 8,
                  padding: '8px 16px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  flex: 1,
                }}
              >
                <span style={{ color, fontSize: 12 }}>◎</span>
                <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-primary)' }}>
                  You're on this task
                </span>
              </div>
              <Link
                to={`/tasks/${task.id}/submit`}
                style={{
                  background: color, color: 'white',
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.12em', padding: '8px 18px',
                  textDecoration: 'none', position: 'relative',
                }}
              >
                <span style={{ position: 'absolute', inset: 3, border: '1px dashed rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                Submit proof
              </Link>
              <button onClick={handleDrop} className="eyebrow" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}>
                drop
              </button>
            </div>
          ) : (
            /* Sign up */
            <>
              <p className="eyebrow mb-3">Sign up for this task</p>

              {/* Mode selector — Solo only for now, Collab/Duel disabled */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {[
                  { label: 'Solo', icon: '◎', desc: 'Just you. All points are yours.', enabled: true },
                  { label: 'Collab', icon: '⬡', desc: 'Invite others. Everyone earns full points.', enabled: false },
                  { label: 'Duel', icon: '⚔', desc: 'Challenge one player. Winner takes the points.', enabled: false },
                ].map((mode) => (
                  <button
                    key={mode.label}
                    disabled={!mode.enabled}
                    style={{
                      position: 'relative',
                      border: `2.5px solid ${mode.enabled ? (dark ? '#f0e6d0' : '#1a1209') : 'var(--color-border)'}`,
                      borderRadius: 0,
                      background: mode.enabled ? (dark ? '#f0e6d0' : '#1a1209') : 'var(--color-bg-surface-alt)',
                      color: mode.enabled ? (dark ? '#13121a' : '#F7F4EE') : 'var(--color-text-tertiary)',
                      fontFamily: "'Courier Prime', monospace",
                      fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.08em', padding: '8px 14px',
                      cursor: mode.enabled ? 'pointer' : 'not-allowed',
                      opacity: mode.enabled ? 1 : 0.5,
                      textAlign: 'center',
                    }}
                    title={mode.enabled ? mode.desc : 'Coming soon'}
                  >
                    {mode.enabled && (
                      <span style={{ position: 'absolute', inset: 2, border: '1px dashed rgba(255,255,255,0.2)', pointerEvents: 'none' }} />
                    )}
                    <span style={{ display: 'block', fontSize: 14, marginBottom: 2 }}>{mode.icon}</span>
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Sign up button */}
              {canSignUp ? (
                <button
                  onClick={handleSignup}
                  style={{
                    width: '100%',
                    background: color, color: 'white',
                    fontFamily: "'Courier Prime', monospace",
                    fontSize: 13, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.15em', padding: '10px 20px',
                    border: 'none', cursor: 'pointer', position: 'relative',
                  }}
                >
                  <span style={{ position: 'absolute', inset: 3, border: '1px dashed rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                  Sign up · earn up to {task.point_value} pts
                </button>
              ) : (
                <button
                  disabled
                  style={{
                    width: '100%',
                    background: 'var(--color-bg-surface-alt)',
                    color: 'var(--color-text-tertiary)',
                    fontFamily: "'Courier Prime', monospace",
                    fontSize: 11, textTransform: 'uppercase',
                    letterSpacing: '0.1em', padding: '10px 20px',
                    border: 'none', cursor: 'not-allowed',
                  }}
                >
                  {!meetsLevel ? `Level ${task.level_required} required` : 'Sign up'}
                </button>
              )}

              {/* Context info */}
              <div className="eyebrow" style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span>Level {task.level_required} required {meetsLevel ? '✓' : `— you are level ${user.character?.level ?? 0}`}</span>
              </div>
            </>
          )}

          {signupError && (
            <p className="font-body" style={{ fontSize: 9, color: '#dc2626', marginTop: 6 }}>{signupError}</p>
          )}
        </div>
      )}

      {/* ── Praxis Gallery (§15.6) — two columns ── */}
      <div className="mt-6">
        <PageTitle title="Praxis" eyebrow={`${submissions.length} submissions`} />

        {submissions.length === 0 ? (
          <p className="font-body text-muted">No submissions yet. Be the first.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {submissions.map((s) => <SubmissionCard key={s.id} submission={s} />)}
          </div>
        )}
      </div>
    </div>
  )
}

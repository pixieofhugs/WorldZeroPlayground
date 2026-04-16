import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { getTask, getMyTasks, signupTask, dropTask, getTaskSignups, type TaskOut, type TaskSignupOut } from '../api/tasks'
import { listPraxes, type PraxisOut } from '../api/praxis'
import { listRelationships } from '../api/relationships'
import { getMetaTasks, type MetaTaskOut } from '../api/metaTasks'
import PraxisCard from '../components/PraxisCard'
import LevelPill from '../components/ui/LevelPill'
import PageTitle from '../components/ui/PageTitle'
import FeedBadge from '../components/feed/FeedBadge'
import { useAuth } from '../auth/AuthContext'
import { factionColor, factionName } from '../utils/factions'
import { extractError } from '../utils/errors'
import { mediaUrl } from '../utils/media'
import { useGameConfig } from '../hooks/useGameConfig'

const DEFAULT_MAX_TASK_SLOTS = 20
const VISIBLE_SIGNUPS = 4

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [task, setTask] = useState<TaskOut | null>(null)
  const [submissions, setSubmissions] = useState<PraxisOut[]>([])
  const [signups, setSignups] = useState<TaskSignupOut[]>([])
  const [metaTasks, setMetaTasks] = useState<MetaTaskOut[]>([])
  const [isInProgress, setIsInProgress] = useState(false)
  const [taskSlotCount, setTaskSlotCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [signupError, setSignupError] = useState<string | null>(null)

  // Friend/foe lookup sets
  const [friends, setFriends] = useState<Set<number>>(new Set())
  const [foes, setFoes] = useState<Set<number>>(new Set())

  // Game config
  const gameConfig = useGameConfig()
  const maxTaskSlots = gameConfig?.max_task_signups ?? DEFAULT_MAX_TASK_SLOTS

  // Submission sort
  const [submissionSort, setSubmissionSort] = useState<'score' | 'recent'>('score')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setIsInProgress(false)
    const taskId = parseInt(id, 10)

    const fetches: Promise<unknown>[] = [
      getTask(taskId),
      listPraxes({ task_id: taskId }),
      getTaskSignups(taskId),
      getMetaTasks(taskId).catch(() => []),
    ]
    if (user) {
      fetches.push(getMyTasks('in_progress'))
      fetches.push(
        listRelationships({ type: 'friend' }).then((rels) =>
          new Set(rels.filter((r) => r.status === 'active').map((r) => r.to_character_id))
        ).catch(() => new Set<number>())
      )
      fetches.push(
        listRelationships({ type: 'foe' }).then((rels) =>
          new Set(rels.filter((r) => r.status === 'active').map((r) => r.to_character_id))
        ).catch(() => new Set<number>())
      )
    }

    Promise.all(fetches)
      .then(([t, s, sg, mt, myTasks, friendSet, foeSet]) => {
        setTask(t as TaskOut)
        setSubmissions(s as PraxisOut[])
        setSignups(sg as TaskSignupOut[])
        setMetaTasks(mt as MetaTaskOut[])
        if (myTasks) {
          const tasks = myTasks as { task: { id: number } }[]
          setIsInProgress(tasks.some((ct) => ct.task.id === taskId))
          setTaskSlotCount(tasks.length)
        }
        if (friendSet) setFriends(friendSet as Set<number>)
        if (foeSet) setFoes(foeSet as Set<number>)
      })
      .catch((err) => setFetchError(extractError(err, "Couldn't load this task.")))
      .finally(() => setLoading(false))
  }, [id, location.key])

  // Re-fetch submissions when sort changes
  useEffect(() => {
    if (!id) return
    listPraxes({ task_id: parseInt(id, 10) })
      .then((s) => setSubmissions(s))
      .catch(() => {})
  }, [submissionSort, id])

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
  const slotsOpen = maxTaskSlots - taskSlotCount
  const avgVote = submissions.length > 0
    ? (submissions.reduce((sum, s) => sum + (s.score ?? 0), 0) / submissions.length).toFixed(1)
    : '—'

  // Compute faction modifier for the current user
  const myFaction = user?.character?.faction_slug
  const taskFaction = task.primary_faction_slug
  const factionConfig = myFaction && gameConfig
    ? gameConfig.factions.find((f) => f.slug === myFaction)
    : null
  const isOwnFaction = factionConfig && (taskFaction === myFaction || taskFaction === 'na' || !taskFaction)
  const factionMultiplier = factionConfig
    ? (isOwnFaction ? factionConfig.own_task_modifier : factionConfig.other_task_modifier)
    : 1.0
  const modifiedPoints = Math.round(task.point_value * factionMultiplier)

  const sortedSubmissions = [...submissions].sort((a, b) => {
    if (submissionSort === 'score') return (b.score ?? 0) - (a.score ?? 0)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div className="py-8">
      {/* ── Breadcrumb ── */}
      <PageTitle title="Task" eyebrow="Tasks · Detail" />
      <nav className="font-body mb-4" style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--color-text-tertiary)' }}>
        <Link to="/tasks" style={{ color: '#c49a3a', textDecoration: 'none' }}>Tasks</Link>
        {' › '}
        <span style={{ color: 'var(--color-text-primary)' }}>{task.title}</span>
      </nav>

      {/* ── Two-Column Layout ── */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* ── Main Column ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* ── Task Hero Block ── */}
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
                  background: task.status === 'active' ? 'var(--faction-analog-light)' : 'var(--color-bg-surface-alt)',
                  color: task.status === 'active' ? 'var(--faction-analog)' : 'var(--color-text-tertiary)',
                }}
              >
                {task.status}
              </span>
              <LevelPill level={task.level_required} />
            </div>

            {/* Title */}
            <h1
              className="font-display italic font-medium"
              style={{ fontSize: 28, color: 'var(--color-text-primary)', lineHeight: 1.2, marginBottom: 12 }}
            >
              {task.title}
            </h1>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${user && factionMultiplier !== 1.0 ? 5 : 4}, 1fr)`, gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Base Pts', value: task.point_value },
                ...(user && factionMultiplier !== 1.0 ? [{ label: `Your Pts (×${factionMultiplier})`, value: modifiedPoints }] : []),
                { label: 'Completed', value: submissions.length },
                { label: 'In Progress', value: signups.length },
                { label: 'Avg Vote', value: avgVote },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="text-center py-2"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-surface)' }}
                >
                  <div className="font-body font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                    {stat.value}
                  </div>
                  <div className="eyebrow" style={{ fontSize: 7 }}>{stat.label}</div>
                </div>
              ))}
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

          {/* ── Signup Block ── */}
          {canSignUp && (
            <div className="sidebar-card mb-5" style={{ padding: '16px 20px' }}>
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
                Sign up · earn up to {modifiedPoints} pts
              </button>

              <div className="eyebrow" style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span>You have {slotsOpen} of {maxTaskSlots} task slots open</span>
                <span>Level {task.level_required} required {meetsLevel ? '✓' : ''}</span>
              </div>

              {signupError && (
                <div
                  className="font-body"
                  style={{
                    fontSize: 11, color: '#dc2626', marginTop: 8,
                    padding: '8px 12px',
                    background: 'rgba(220,38,38,0.06)',
                    border: '1px solid rgba(220,38,38,0.2)',
                  }}
                >
                  {signupError}
                </div>
              )}
            </div>
          )}


          {/* Already signed up / submitted states */}
          {user && mySubmission && (
            <div className="sidebar-card mb-5" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  background: `${color}18`, border: `1.5px solid ${color}40`,
                  borderRadius: 8, padding: '8px 16px',
                  display: 'flex', alignItems: 'center', gap: 8, flex: 1,
                }}
              >
                <span style={{ color, fontSize: 16 }}>✓</span>
                <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-primary)' }}>
                  You've submitted praxis for this task
                </span>
              </div>
              <Link to={`/praxes/${mySubmission.id}/edit`} className="btn-outline" style={{ fontSize: 8, padding: '4px 12px' }}>
                edit
              </Link>
            </div>
          )}

          {user && !mySubmission && isInProgress && (
            <div className="sidebar-card mb-5" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  background: `${color}18`, border: `1.5px solid ${color}40`,
                  borderRadius: 8, padding: '8px 16px',
                  display: 'flex', alignItems: 'center', gap: 8, flex: 1,
                }}
              >
                <span style={{ color, fontSize: 12 }}>◎</span>
                <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-primary)' }}>You're on this task</span>
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
          )}

          {/* ── Meta Tasks Panel ── */}
          {metaTasks.length > 0 && (
            <div className="sidebar-card mb-5" style={{ padding: '16px 20px' }}>
              <p className="eyebrow mb-3">Meta tasks available for this task</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {metaTasks.map((mt) => {
                  const mtColor = factionColor(mt.faction_slug)
                  const bonusLabel = mt.bonus_type === 'percentage' ? `+${mt.bonus_value}%` : `+${mt.bonus_value} flat`
                  return (
                    <div
                      key={mt.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 0',
                        borderTop: '1px dashed var(--color-border)',
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: mtColor, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="font-body" style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)', display: 'block' }}>
                          {mt.name}
                        </span>
                        <span className="font-body" style={{ fontSize: 9, color: 'var(--color-text-secondary)' }}>
                          {mt.description}
                        </span>
                      </div>
                      <span
                        style={{
                          fontFamily: "'Courier Prime', monospace",
                          fontSize: 10, fontWeight: 700,
                          color: '#15803d',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {bonusLabel}
                      </span>
                      {mt.level_required > 0 && <LevelPill level={mt.level_required} />}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Completed Praxis Section ── */}
          <div className="mt-2">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="eyebrow">{submissions.length} Completed Praxis</span>
              <div style={{ display: 'flex', gap: 0 }}>
                {(['score', 'recent'] as const).map((sort) => (
                  <button
                    key={sort}
                    onClick={() => setSubmissionSort(sort)}
                    style={{
                      fontFamily: "'Courier Prime', monospace",
                      fontSize: 8, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.1em', padding: '4px 10px',
                      background: submissionSort === sort ? 'var(--color-text-primary)' : 'transparent',
                      color: submissionSort === sort ? 'var(--color-bg-page)' : 'var(--color-text-tertiary)',
                      border: `1px solid ${submissionSort === sort ? 'transparent' : 'var(--color-border)'}`,
                      cursor: 'pointer',
                    }}
                  >
                    {sort === 'score' ? 'Top Rated' : 'Recent'}
                  </button>
                ))}
              </div>
            </div>

            {sortedSubmissions.length === 0 ? (
              <p className="font-body text-muted">No submissions yet. Be the first.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sortedSubmissions.slice(0, 4).map((s) => <PraxisCard key={s.id} praxis={s} />)}
                </div>
                {submissions.length > 4 && (
                  <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <Link
                      to={`/praxes?task_id=${task.id}`}
                      style={{
                        fontFamily: "'Courier Prime', monospace",
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.1em', color: '#c49a3a',
                        textDecoration: 'none',
                      }}
                    >
                      View all {submissions.length} praxis &rarr;
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Right Sidebar Column ── */}
        <div style={{ width: 240, flexShrink: 0 }}>
          {/* Players in Progress */}
          <div className="sidebar-card mb-3">
            <p className="eyebrow mb-2">{signups.length} Players in Progress</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {signups.slice(0, VISIBLE_SIGNUPS).map((signup) => {
                const signupColor = factionColor(signup.faction_slug)
                const isFriend = friends.has(signup.character_id)
                const isFoe = foes.has(signup.character_id)
                return (
                  <div
                    key={signup.character_id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '4px 0',
                    }}
                  >
                    <Link to={`/characters/${signup.character_id}`}>
                      {signup.avatar_url ? (
                        <img
                          src={mediaUrl(signup.avatar_url)}
                          alt={signup.display_name}
                          style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: `linear-gradient(135deg, ${signupColor}, ${signupColor}88)`,
                          }}
                        />
                      )}
                    </Link>
                    <Link
                      to={`/characters/${signup.character_id}`}
                      className="font-body"
                      style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-primary)', textDecoration: 'none', flex: 1 }}
                    >
                      {signup.display_name}
                    </Link>
                    {isFriend && <FeedBadge type="friend" label="Friend" />}
                    {isFoe && <FeedBadge type="duel" label="Foe" />}
                  </div>
                )
              })}
            </div>
            {signups.length > VISIBLE_SIGNUPS && (
              <p className="eyebrow" style={{ marginTop: 6, color: 'var(--color-text-tertiary)' }}>
                +{signups.length - VISIBLE_SIGNUPS} more &rarr;
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

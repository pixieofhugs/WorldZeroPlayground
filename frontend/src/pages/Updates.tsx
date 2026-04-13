import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listSubmissions, type SubmissionOut } from '../api/submissions'
import { getMessages, type MessageOut } from '../api/messages'
import { getMyTasks, type CharacterTaskOut } from '../api/tasks'
import SubmissionCard from '../components/SubmissionCard'
import PageTitle from '../components/ui/PageTitle'
import FilterStamps from '../components/ui/FilterStamps'
import { useAuth } from '../auth/AuthContext'
import { useTheme } from '../hooks/useTheme'
import { factionColor } from '../utils/factions'
import { relativeTime } from '../utils/dates'
import { extractError } from '../utils/errors'

type FeedFilter = 'All' | 'Your stuff' | 'Global'

/** Feed item accent colors by type (§17.3) */
const TYPE_COLORS: Record<string, string> = {
  message: '#be185d',
  task: '#4f46e5',
  praxis: '#14532d',
}

export default function Updates() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [submissions, setSubmissions] = useState<SubmissionOut[]>([])
  const [messages, setMessages] = useState<MessageOut[]>([])
  const [inProgressTasks, setInProgressTasks] = useState<CharacterTaskOut[]>([])
  const [filter, setFilter] = useState<FeedFilter>('All')
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

  if (loading) return <div className="py-8 font-body text-muted">Loading...</div>

  if (fetchError) return (
    <div className="py-8">
      <PageTitle title="Updates" />
      <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
        {fetchError}{' '}
        <button onClick={() => window.location.reload()} className="underline">Try refreshing.</button>
      </p>
    </div>
  )

  const showMessages = filter === 'All' || filter === 'Your stuff'
  const showTasks = filter === 'All' || filter === 'Your stuff'
  const showPraxis = filter === 'All' || filter === 'Your stuff'

  return (
    <div className="py-8">
      <PageTitle title="Updates" />

      {/* ── Feed Filters (§17.2) ── */}
      <div style={{ marginBottom: 20 }}>
        <FilterStamps
          options={['All', 'Your stuff', 'Global']}
          value={filter}
          onChange={(v) => setFilter(v as FeedFilter)}
        />
      </div>

      {/* ── Messages Section ── */}
      {showMessages && messages.length > 0 && (
        <section className="mb-6">
          {/* Date separator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span className="eyebrow">Messages</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map((m) => (
              <div
                key={m.id}
                className="sidebar-card"
                style={{
                  borderLeft: `4px solid ${TYPE_COLORS.message}`,
                  padding: '10px 14px',
                  position: 'relative',
                }}
              >
                {/* Type label pill */}
                <span
                  style={{
                    position: 'absolute', top: 8, right: 10,
                    fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.1em',
                    color: TYPE_COLORS.message, fontFamily: "'Courier Prime', monospace",
                    fontWeight: 700,
                  }}
                >
                  {!m.read_at && '● '}message
                </span>

                <p className="font-body" style={{ fontSize: 11, color: 'var(--color-text-primary)', marginBottom: 4, paddingRight: 60 }}>
                  {m.body}
                </p>
                <span className="eyebrow">
                  from #{m.from_character_id} · {relativeTime(m.created_at)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Tasks in Progress Section ── */}
      {showTasks && (
        <section className="mb-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span className="eyebrow">Tasks in progress</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>

          {inProgressTasks.length === 0 ? (
            <p className="font-body" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
              No tasks in progress. <Link to="/tasks" className="underline" style={{ color: 'var(--color-text-secondary)' }}>Browse tasks</Link> to sign up.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {inProgressTasks.map((ct) => {
                const color = factionColor(ct.task.primary_faction_slug)
                return (
                  <div
                    key={ct.id}
                    className="sidebar-card"
                    style={{
                      borderLeft: `4px solid ${color}`,
                      padding: '10px 14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <Link
                        to={`/tasks/${ct.task.id}`}
                        className="font-body block truncate"
                        style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)', textDecoration: 'none' }}
                      >
                        {ct.task.title}
                      </Link>
                      <span className="eyebrow">
                        {ct.task.point_value} pts · {relativeTime(ct.signed_up_at)}
                      </span>
                    </div>
                    <Link
                      to={`/tasks/${ct.task.id}/submit`}
                      style={{
                        background: color, color: 'white',
                        fontFamily: "'Courier Prime', monospace",
                        fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.1em', padding: '5px 12px',
                        textDecoration: 'none', whiteSpace: 'nowrap',
                        position: 'relative',
                      }}
                    >
                      <span style={{ position: 'absolute', inset: 2, border: '1px dashed rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                      Submit proof
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Your Praxis Section ── */}
      {showPraxis && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span className="eyebrow">Your praxis</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>

          {submissions.length === 0 ? (
            <p className="font-body" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
              You haven't submitted any praxis yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {submissions.map((s) => <SubmissionCard key={s.id} submission={s} />)}
            </div>
          )}
        </section>
      )}

      {/* Global filter — placeholder for when activity feed endpoint exists */}
      {filter === 'Global' && (
        <div className="sidebar-card" style={{ padding: '20px', textAlign: 'center' }}>
          <p className="eyebrow mb-2">Global activity feed</p>
          <p className="font-body" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
            Coming soon — site-wide events, new tasks, and era announcements will appear here.
          </p>
        </div>
      )}
    </div>
  )
}

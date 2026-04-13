import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listSubmissions, type SubmissionOut } from '../api/submissions'
import { getMessages, type MessageOut } from '../api/messages'
import { getMyTasks, type CharacterTaskOut } from '../api/tasks'
import { listRelationships, type RelationshipListItem } from '../api/relationships'
import SubmissionCard from '../components/SubmissionCard'
import PageTitle from '../components/ui/PageTitle'
import { useAuth } from '../auth/AuthContext'
import { useTheme } from '../hooks/useTheme'
import { factionColor } from '../utils/factions'
import { relativeTime } from '../utils/dates'
// Individual fetches fail silently — no global error state needed

type FeedFilter = 'All' | 'Friends' | 'Foes' | 'Your stuff' | 'Global'

const FILTER_OPTIONS: FeedFilter[] = ['All', 'Friends', 'Foes', 'Your stuff', 'Global']

/** Feed item accent colors by type (§17.3) */
const TYPE_COLORS: Record<string, string> = {
  message: '#be185d',
  task: '#4f46e5',
  praxis: '#14532d',
  friend: '#14532d',
  foe: '#dc2626',
}

export default function Updates() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [submissions, setSubmissions] = useState<SubmissionOut[]>([])
  const [messages, setMessages] = useState<MessageOut[]>([])
  const [inProgressTasks, setInProgressTasks] = useState<CharacterTaskOut[]>([])
  const [friends, setFriends] = useState<RelationshipListItem[]>([])
  const [foes, setFoes] = useState<RelationshipListItem[]>([])
  const [filter, setFilter] = useState<FeedFilter>('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch each data source independently so one failure doesn't break the page
    const fetches = [
      listSubmissions(user?.character ? { character_id: user.character.id } : {})
        .then(setSubmissions).catch(() => {}),
      getMessages()
        .then(setMessages).catch(() => {}),
      getMyTasks('in_progress')
        .then(setInProgressTasks).catch(() => {}),
      listRelationships({ type: 'friend' })
        .then((fr) => setFriends(fr.filter((r) => r.status === 'active'))).catch(() => {}),
      listRelationships({ type: 'foe' })
        .then((fo) => setFoes(fo.filter((r) => r.status === 'active'))).catch(() => {}),
    ]
    Promise.all(fetches).finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="py-8 font-body text-muted">Loading...</div>

  const showMessages = filter === 'All' || filter === 'Your stuff'
  const showTasks = filter === 'All' || filter === 'Your stuff'
  const showPraxis = filter === 'All' || filter === 'Your stuff'
  const showFriends = filter === 'All' || filter === 'Friends'
  const showFoes = filter === 'All' || filter === 'Foes'
  const showGlobal = filter === 'Global'

  return (
    <div className="py-8">
      <PageTitle title="Updates" eyebrow="Era I" />

      {/* ── Feed Filters (§17.2) — full set with badge count ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20, alignItems: 'center' }}>
        <span className="eyebrow">show</span>
        {FILTER_OPTIONS.map((option) => {
          const active = filter === option
          const count = option === 'All' ? null
            : option === 'Friends' ? friends.length || null
            : option === 'Foes' ? foes.length || null
            : null
          const hasRedBadge = false

          return (
            <button
              key={option}
              onClick={() => setFilter(option)}
              style={{
                position: 'relative',
                border: `2px solid ${active ? (dark ? '#f0e6d0' : '#1a1209') : (dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)')}`,
                borderRadius: 0,
                background: active ? (dark ? '#f0e6d0' : '#1a1209') : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)'),
                color: active ? (dark ? '#13121a' : '#F7F4EE') : 'var(--color-text-primary)',
                fontFamily: "'Courier Prime', monospace",
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.1em', padding: '5px 10px',
                cursor: 'pointer', transition: 'all 120ms',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {active && <span style={{ position: 'absolute', inset: 2, border: '1px dashed rgba(255,255,255,0.2)', pointerEvents: 'none' }} />}
              {option}
              {count !== null && (
                <span style={{
                  background: hasRedBadge ? '#dc2626' : (active ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'),
                  color: hasRedBadge ? 'white' : 'inherit',
                  fontSize: 8, padding: '0 5px', borderRadius: 8, minWidth: 16, textAlign: 'center',
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Friends Activity ── */}
      {showFriends && friends.length > 0 && (
        <section className="mb-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span className="eyebrow">Friends · {friends.length}</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {friends.map((rel) => {
              const color = factionColor(rel.to_faction_slug)
              return (
                <div
                  key={rel.id}
                  className="sidebar-card"
                  style={{ borderLeft: `4px solid ${TYPE_COLORS.friend}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}
                >
                  <Link to={`/characters/${rel.to_character_id}`}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}88)`, flexShrink: 0 }} />
                  </Link>
                  <Link to={`/characters/${rel.to_character_id}`} className="font-body" style={{ fontSize: 11, fontWeight: 700, color, textDecoration: 'none' }}>
                    {rel.to_display_name}
                  </Link>
                  <span style={{ position: 'absolute', top: 8, right: 10, fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.1em', color: TYPE_COLORS.friend, fontFamily: "'Courier Prime', monospace", fontWeight: 700 }}>
                    {rel.display_status}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Foes ── */}
      {showFoes && foes.length > 0 && (
        <section className="mb-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span className="eyebrow">Foes · {foes.length}</span>
            <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {foes.map((rel) => {
              const color = factionColor(rel.to_faction_slug)
              return (
                <div
                  key={rel.id}
                  className="sidebar-card"
                  style={{ borderLeft: `4px solid ${TYPE_COLORS.foe}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}
                >
                  <Link to={`/characters/${rel.to_character_id}`}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}88)`, flexShrink: 0 }} />
                  </Link>
                  <Link to={`/characters/${rel.to_character_id}`} className="font-body" style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textDecoration: 'none' }}>
                    {rel.to_display_name}
                  </Link>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Messages Section ── */}
      {showMessages && messages.length > 0 && (
        <section className="mb-6">
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
                style={{ borderLeft: `4px solid ${TYPE_COLORS.message}`, padding: '10px 14px', position: 'relative' }}
              >
                <span style={{ position: 'absolute', top: 8, right: 10, fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.1em', color: TYPE_COLORS.message, fontFamily: "'Courier Prime', monospace", fontWeight: 700 }}>
                  {!m.read_at && '● '}message
                </span>
                <p className="font-body" style={{ fontSize: 11, color: 'var(--color-text-primary)', marginBottom: 4, paddingRight: 60 }}>{m.body}</p>
                <span className="eyebrow">from #{m.from_character_id} · {relativeTime(m.created_at)}</span>
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
              No tasks in progress. <Link to="/tasks" className="underline" style={{ color: 'var(--color-text-secondary)' }}>Browse tasks</Link>
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {inProgressTasks.map((ct) => {
                const color = factionColor(ct.task.primary_faction_slug)
                return (
                  <div key={ct.id} className="sidebar-card" style={{ borderLeft: `4px solid ${color}`, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <Link to={`/tasks/${ct.task.id}`} className="font-body block truncate" style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)', textDecoration: 'none' }}>{ct.task.title}</Link>
                      <span className="eyebrow">{ct.task.point_value} pts · {relativeTime(ct.signed_up_at)}</span>
                    </div>
                    <Link to={`/tasks/${ct.task.id}/submit`} style={{ background: color, color: 'white', fontFamily: "'Courier Prime', monospace", fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '5px 12px', textDecoration: 'none', whiteSpace: 'nowrap', position: 'relative' }}>
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
            <p className="font-body" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>No praxis yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {submissions.map((s) => <SubmissionCard key={s.id} submission={s} />)}
            </div>
          )}
        </section>
      )}

      {/* Global placeholder */}
      {showGlobal && (
        <div className="sidebar-card" style={{ padding: 20, textAlign: 'center' }}>
          <p className="eyebrow mb-2">Global activity feed</p>
          <p className="font-body" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
            Coming soon — site-wide events, new tasks, and era announcements.
          </p>
        </div>
      )}

      {/* Friends empty state */}
      {filter === 'Friends' && friends.length === 0 && (
        <div className="sidebar-card" style={{ padding: 20, textAlign: 'center' }}>
          <p className="font-body" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>No friends yet. Visit a player's profile to add them.</p>
        </div>
      )}
      {filter === 'Foes' && foes.length === 0 && (
        <div className="sidebar-card" style={{ padding: 20, textAlign: 'center' }}>
          <p className="font-body" style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>No foes yet.</p>
        </div>
      )}
    </div>
  )
}

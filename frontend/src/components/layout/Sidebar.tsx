import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { getMyTasks, type CharacterTaskOut } from '../../api/tasks'
import { listSubmissions, type SubmissionOut } from '../../api/submissions'
import { relativeTime } from '../../utils/dates'

/** Faction display names keyed by slug */
const FACTION_NAMES: Record<string, string> = {
  ua: 'UA',
  analog: 'Analog',
  gestalt: 'Gestalt',
  snide: 'S.N.I.D.E.',
  journeymen: 'Journeymen',
  singularity: 'Singularity',
  ua_masters: 'UA Masters',
}

/** Faction color for the avatar orb gradient and accents */
const FACTION_COLORS: Record<string, string> = {
  ua: '#6b6a7a',
  analog: '#15803d',
  gestalt: '#14532d',
  snide: '#8a6a20',
  journeymen: '#c49a3a',
  singularity: '#7c3aed',
  ua_masters: '#555555',
}

const MAX_TASK_SLOTS = 20

/**
 * Always-on right sidebar (Style Guide §4.2).
 * Character card + active tasks (live data) + recent activity (live data) + propose-a-task button.
 */
export default function Sidebar() {
  const { user } = useAuth()
  const character = user?.character

  const [activeTasks, setActiveTasks] = useState<CharacterTaskOut[]>([])
  const [recentActivity, setRecentActivity] = useState<SubmissionOut[]>([])

  useEffect(() => {
    if (!user) return
    getMyTasks('active').then(setActiveTasks).catch(() => {})
    listSubmissions().then((submissions) => setRecentActivity(submissions.slice(0, 3))).catch(() => {})
  }, [user])

  const slotCount = activeTasks.length
  const slotPercent = Math.min((slotCount / MAX_TASK_SLOTS) * 100, 100)

  return (
    <aside className="flex flex-col gap-3" style={{ width: 256 }}>
      {/* ── Character Card ── */}
      {character ? (
        <div className="sidebar-card">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="shrink-0 rounded-full"
              style={{
                width: 40,
                height: 40,
                background: `linear-gradient(135deg, ${FACTION_COLORS[character.faction_slug ?? ''] ?? '#6b6a7a'}, ${FACTION_COLORS[character.faction_slug ?? ''] ?? '#6b6a7a'}88)`,
              }}
            />
            <div className="min-w-0">
              <Link
                to={`/characters/${character.id}`}
                className="font-display italic text-sm block truncate"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {character.display_name}
              </Link>
              <span
                className="font-body uppercase block truncate"
                style={{
                  fontSize: 9,
                  letterSpacing: '0.12em',
                  color: FACTION_COLORS[character.faction_slug ?? ''] ?? 'var(--color-text-tertiary)',
                }}
              >
                {FACTION_NAMES[character.faction_slug ?? ''] ?? 'Unaffiliated'} · Level {character.level}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {[
              { label: 'Score', value: character.score },
              { label: 'Level', value: character.level },
              { label: 'Era', value: 1 },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center rounded-md py-1.5"
                style={{ background: 'var(--color-bg-surface-alt)' }}
              >
                <div className="font-body font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {stat.value}
                </div>
                <div className="eyebrow" style={{ fontSize: 7 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="sidebar-card">
          <p className="eyebrow text-center">No character yet</p>
        </div>
      )}

      {/* ── Active Tasks Panel ── */}
      <div className="sidebar-card">
        <p className="eyebrow mb-2">Your active tasks</p>

        {activeTasks.length === 0 ? (
          <p className="font-body text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            No active tasks
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {activeTasks.map((characterTask) => {
              const factionColor = FACTION_COLORS[characterTask.task.primary_faction_slug ?? ''] ?? '#6b6a7a'
              const factionName = FACTION_NAMES[characterTask.task.primary_faction_slug ?? ''] ?? 'UA'
              return (
                <div
                  key={characterTask.id}
                  style={{
                    borderLeft: `3px solid ${factionColor}`,
                    paddingLeft: 8,
                  }}
                >
                  <Link
                    to={`/tasks/${characterTask.task.id}`}
                    className="font-body"
                    style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-primary)', textDecoration: 'none', display: 'block', lineHeight: 1.3 }}
                  >
                    {characterTask.task.title}
                  </Link>
                  <span className="font-body" style={{ fontSize: 8, color: 'var(--color-text-tertiary)' }}>
                    {factionName} · lvl {characterTask.task.level_required} · {relativeTime(characterTask.signed_up_at)}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Progress bar */}
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background: 'var(--color-bg-surface-alt)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${slotPercent}%`,
                background: '#4f46e5',
                borderRadius: 2,
                transition: 'width 300ms',
              }}
            />
          </div>
          <p className="font-body" style={{ fontSize: 8, color: 'var(--color-text-tertiary)', marginTop: 3 }}>
            {slotCount} / {MAX_TASK_SLOTS} slots
          </p>
        </div>
      </div>

      {/* ── Recent Activity Panel ── */}
      <div className="sidebar-card">
        <p className="eyebrow mb-2">Recent activity</p>

        {recentActivity.length === 0 ? (
          <p className="font-body text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            No activity yet
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recentActivity.map((submission, index) => (
              <div
                key={submission.id}
                style={{
                  padding: '5px 0',
                  borderTop: index > 0 ? '1px dashed var(--color-border)' : undefined,
                }}
              >
                <div className="font-body" style={{ fontSize: 9, lineHeight: 1.4 }}>
                  <Link
                    to={`/characters/${submission.character_id}`}
                    style={{
                      fontWeight: 700,
                      color: 'var(--color-text-primary)',
                      textDecoration: 'none',
                    }}
                  >
                    {submission.character_display_name}
                  </Link>
                  {' completed '}
                  <Link
                    to={`/submissions/${submission.id}`}
                    style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}
                  >
                    {submission.task_title}
                  </Link>
                </div>
                <span className="font-body" style={{ fontSize: 7, color: 'var(--color-text-tertiary)' }}>
                  {relativeTime(submission.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Propose a Task Button ── */}
      <Link
        to="/propose-task"
        className="btn-primary text-center w-full block"
      >
        Propose a Task
      </Link>
    </aside>
  )
}

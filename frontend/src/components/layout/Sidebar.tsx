import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { getMyTasks, type CharacterTaskOut } from '../../api/tasks'
import { listSubmissions, type SubmissionOut } from '../../api/submissions'
import { relativeTime } from '../../utils/dates'
import { factionColor, factionName } from '../../utils/factions'

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
    getMyTasks('in_progress').then(setActiveTasks).catch(() => {})
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
                background: `linear-gradient(135deg, ${factionColor(character.faction_slug)}, ${factionColor(character.faction_slug)}88)`,
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
                  color: factionColor(character.faction_slug),
                }}
              >
                {factionName(character.faction_slug)} · Level {character.level}
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
              const taskFactionColor = factionColor(characterTask.task.primary_faction_slug)
              const taskFactionName = factionName(characterTask.task.primary_faction_slug)
              return (
                <div
                  key={characterTask.id}
                  style={{
                    borderLeft: `3px solid ${taskFactionColor}`,
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
                    {taskFactionName} · lvl {characterTask.task.level_required} · {relativeTime(characterTask.signed_up_at)}
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

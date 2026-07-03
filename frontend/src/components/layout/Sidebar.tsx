import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { getActivityFeed, type ActivityFeedItem } from '../../api/activityFeed'
import { relativeTime } from '../../utils/dates'
import { factionCssVar, factionName } from '../../utils/factions'
import { mediaUrl } from '../../utils/media'
import FeedBadge from '../feed/FeedBadge'
import { useMyActiveTasks } from '../../hooks/useMyActiveTasks'
import type { PraxisType } from '../../api/praxis'
import { useMyCharacterStats } from '../../hooks/useMyCharacterStats'
import { usePendingRequests } from '../../hooks/usePendingRequests'
import { useGameConfig } from '../../hooks/useGameConfig'

const DEFAULT_MAX_TASK_SLOTS = 20

const PRAXIS_TYPE_LABEL: Record<PraxisType, string> = {
  solo: 'Solo',
  collab: 'Collab',
  duel: 'Duel',
}

/**
 * Always-on right sidebar (Style Guide §4.2).
 * Character card + pending requests + active tasks + recent global activity + propose button.
 */
export default function Sidebar() {
  const { user } = useAuth()
  const character = user?.character

  const { activeTasks } = useMyActiveTasks()
  const { votesReceived } = useMyCharacterStats(character?.id)
  const { pendingRequests } = usePendingRequests()
  const gameConfig = useGameConfig()
  const [globalActivity, setGlobalActivity] = useState<ActivityFeedItem[]>([])

  useEffect(() => {
    if (!user) return
    // Global activity from the unified feed API
    getActivityFeed({ filter: 'global', limit: 5 })
      .then((response) => setGlobalActivity(response.items))
      .catch(() => {})
  }, [user])

  const maxTaskSlots = gameConfig?.max_task_signups ?? DEFAULT_MAX_TASK_SLOTS
  const slotCount = activeTasks.length
  const slotPercent = Math.min((slotCount / maxTaskSlots) * 100, 100)

  return (
    <aside className="flex flex-col gap-3 w-64">
      {/* ── Character Card ── */}
      {character ? (
        <div className="sidebar-card">
          <div className="eyebrow mb-2" style={{ fontSize: 8, color: 'var(--color-text-tertiary)' }}>
            Your Character
          </div>
          <div className="flex items-center gap-3 mb-3">
            {character.avatar_url ? (
              <img
                src={mediaUrl(character.avatar_url)}
                alt={character.display_name}
                className="shrink-0 rounded-full"
                style={{ width: 40, height: 40, objectFit: 'cover' }}
              />
            ) : (
              <div
                className="shrink-0 rounded-full"
                style={{
                  width: 40,
                  height: 40,
                  background: `linear-gradient(135deg, ${factionCssVar(character.faction_slug, 'light')}, ${factionCssVar(character.faction_slug)})`,
                }}
              />
            )}
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
                  color: factionCssVar(character.faction_slug),
                }}
              >
                {factionName(character.faction_slug)} · Level {character.level}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {[
              { label: 'Score', value: character.score?.toLocaleString() ?? '0' },
              { label: 'Votes', value: votesReceived.toLocaleString() },
              { label: 'Current', value: `Era 3`, sublabel: true },
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

      {/* ── Pending Requests Panel ── */}
      {pendingRequests.length > 0 && (
        <div className="sidebar-card">
          <p className="eyebrow mb-2">
            Pending Requests · {pendingRequests.length}
          </p>
          <div className="flex flex-col gap-1.5">
            {pendingRequests.map((item, index) => {
              const isCollab = item.type === 'collab_invite'
              return (
                <Link
                  key={`${item.type}-${index}`}
                  to="/updates?filter=requests"
                  className="flex items-center gap-2 py-1.5"
                  style={{
                    borderTop: index > 0 ? '1px dashed var(--color-border)' : undefined,
                    textDecoration: 'none',
                  }}
                >
                  <div
                    className="shrink-0 rounded-full"
                    style={{
                      width: 24,
                      height: 24,
                      background: `linear-gradient(135deg, ${factionCssVar(item.actor_faction_slug, 'light')}, ${factionCssVar(item.actor_faction_slug)})`,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-body block" style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {item.actor_display_name}
                    </span>
                    <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>
                      {isCollab ? 'Collab Invite' : 'Duel Challenge'}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Active Tasks Panel ── */}
      <div className="sidebar-card">
        <p className="eyebrow mb-2">In progress tasks</p>

        {activeTasks.length === 0 ? (
          <p className="font-body text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            No in progress tasks
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {activeTasks.map((praxis) => (
              <div
                key={praxis.id}
                className="flex items-start justify-between"
                style={{
                  borderLeft: `3px solid var(--color-border)`,
                  paddingLeft: 8,
                }}
              >
                <div className="min-w-0">
                  <Link
                    to={`/praxes/${praxis.id}/edit`}
                    className="font-body block"
                    style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-primary)', textDecoration: 'none', lineHeight: 1.3 }}
                  >
                    {praxis.task_title}
                  </Link>
                </div>
                <FeedBadge
                  type={praxis.type === 'solo' ? 'global' : praxis.type}
                  label={PRAXIS_TYPE_LABEL[praxis.type]}
                />
              </div>
            ))}
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-2">
          <div
            className="overflow-hidden"
            style={{
              height: 4,
              borderRadius: 2,
              background: 'var(--color-bg-surface-alt)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${slotPercent}%`,
                background: 'var(--faction-singularity)',
                borderRadius: 2,
                transition: 'width 300ms',
              }}
            />
          </div>
          <p className="font-body" style={{ fontSize: 8, color: 'var(--color-text-tertiary)', marginTop: 3 }}>
            {slotCount} / {maxTaskSlots} slots
          </p>
        </div>
      </div>

      {/* ── Recent Global Activity Panel ── */}
      <div className="sidebar-card">
        <p className="eyebrow mb-2">Recent global activity</p>

        {globalActivity.length === 0 ? (
          <p className="font-body text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            No activity yet
          </p>
        ) : (
          <div className="flex flex-col">
            {globalActivity.map((item, index) => {
              const isTask = item.type === 'global_task'
              const isEra = item.type === 'era_announcement'
              return (
                <div
                  key={`${item.type}-${index}`}
                  className="py-1"
                  style={{
                    borderTop: index > 0 ? '1px dashed var(--color-border)' : undefined,
                  }}
                >
                  <div className="font-body" style={{ fontSize: 9, lineHeight: 1.4 }}>
                    {isEra ? (
                      <span style={{ fontWeight: 700, color: 'var(--faction-ephemerists)' }}>
                        {item.payload.era_name} has begun
                      </span>
                    ) : isTask ? (
                      <>
                        <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>New task: </span>
                        <Link
                          to={`/tasks/${item.payload.task_id}`}
                          style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}
                        >
                          {item.payload.task_title}
                        </Link>
                      </>
                    ) : (
                      <>
                        <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {item.actor_display_name}
                        </span>
                        {' completed '}
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          {item.payload.task_title || item.payload.praxis_title || 'a task'}
                        </span>
                      </>
                    )}
                  </div>
                  <span className="font-body" style={{ fontSize: 7, color: 'var(--color-text-tertiary)' }}>
                    {relativeTime(item.timestamp)}
                  </span>
                </div>
              )
            })}
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

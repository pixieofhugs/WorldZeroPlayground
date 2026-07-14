import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
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
import { useRespondToRequest } from '../../hooks/useRespondToRequest'
import { useGameConfig } from '../../hooks/useGameConfig'

const DEFAULT_MAX_TASK_SLOTS = 20

/**
 * Always-on right sidebar (Style Guide §4.2).
 * Character card + pending requests + active tasks + recent global activity + propose button.
 */
export default function Sidebar() {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  const character = user?.character

  const { activeTasks, refetch: refetchActiveTasks } = useMyActiveTasks()
  const { votesReceived } = useMyCharacterStats(character?.id)
  const { pendingRequests, refetch: refetchPendingRequests } = usePendingRequests()
  const gameConfig = useGameConfig()
  const [globalActivity, setGlobalActivity] = useState<ActivityFeedItem[]>([])

  const praxisTypeLabel: Record<PraxisType, string> = {
    solo: t('praxisType.solo'),
    collab: t('praxisType.collab'),
    duel: t('praxisType.duel'),
  }

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
          <div className="flex items-baseline justify-between mb-2">
            <span className="eyebrow" style={{ fontSize: 8, color: 'var(--color-text-tertiary)' }}>
              {t('sidebar.characterCard.eyebrow')}
            </span>
            <Link
              to={`/characters/${character.id}/edit`}
              className="eyebrow hover:underline"
              style={{ fontSize: 8, color: 'var(--color-text-tertiary)' }}
            >
              {t('sidebar.characterCard.edit')}
            </Link>
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
                {t('sidebar.characterCard.factionLevel', {
                  faction: factionName(character.faction_slug),
                  level: character.level,
                })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {[
              { label: t('sidebar.stats.score'), value: character.score?.toLocaleString() ?? '0' },
              { label: t('sidebar.stats.votes'), value: votesReceived.toLocaleString() },
              { label: t('sidebar.stats.current'), value: t('sidebar.stats.currentValue') },
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
          <p className="eyebrow text-center">{t('sidebar.characterCard.noCharacter')}</p>
        </div>
      )}

      {/* ── Pending Requests Panel ── */}
      {pendingRequests.length > 0 && (
        <div className="sidebar-card">
          <p className="eyebrow mb-2">
            {t('sidebar.pendingRequests.heading', { count: pendingRequests.length })}
          </p>
          <div className="flex flex-col gap-1.5">
            {pendingRequests.map((item, index) => (
              <PendingRequestRow
                key={`${item.type}-${index}`}
                item={item}
                isFirst={index === 0}
                onResolved={() => {
                  // An accepted collab/duel becomes an in-progress praxis —
                  // refresh both panels so the request moves bars (#346).
                  refetchPendingRequests()
                  refetchActiveTasks()
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Active Tasks Panel ── */}
      <div className="sidebar-card">
        <p className="eyebrow mb-2">{t('sidebar.activeTasks.heading')}</p>

        {activeTasks.length === 0 ? (
          <p className="font-body text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {t('sidebar.activeTasks.empty')}
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
                  label={praxisTypeLabel[praxis.type]}
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
            {t('sidebar.activeTasks.slots', { count: slotCount, max: maxTaskSlots })}
          </p>
        </div>
      </div>

      {/* ── Recent Global Activity Panel ── */}
      <div className="sidebar-card">
        <p className="eyebrow mb-2">{t('sidebar.globalActivity.heading')}</p>

        {globalActivity.length === 0 ? (
          <p className="font-body text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {t('sidebar.globalActivity.empty')}
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
                        {t('sidebar.globalActivity.eraBegun', { eraName: item.payload.era_name })}
                      </span>
                    ) : isTask ? (
                      <Trans
                        i18nKey="sidebar.globalActivity.newTask"
                        values={{ title: item.payload.task_title }}
                        components={[
                          <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }} />,
                          <Link
                            to={`/tasks/${item.payload.task_id}`}
                            style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}
                          />,
                        ]}
                      />
                    ) : (
                      <Trans
                        i18nKey="sidebar.globalActivity.completedTask"
                        values={{
                          actor: item.actor_display_name,
                          title:
                            item.payload.task_title ||
                            item.payload.praxis_title ||
                            t('sidebar.globalActivity.fallbackTaskTitle'),
                        }}
                        components={[
                          <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }} />,
                          <span style={{ color: 'var(--color-text-secondary)' }} />,
                        ]}
                      />
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
        {t('actions.proposeTask')}
      </Link>
    </aside>
  )
}

const REQUEST_BUTTON_BASE: CSSProperties = {
  fontFamily: "'Courier Prime', monospace",
  fontSize: 8,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  padding: '3px 8px',
}

/**
 * One actionable row in the Pending Requests panel: accept/decline inline via
 * the shared request hook (#346) — same logic the feed cards use.
 */
function PendingRequestRow({
  item,
  isFirst,
  onResolved,
}: {
  item: ActivityFeedItem
  isFirst: boolean
  onResolved: () => void
}) {
  const { t } = useTranslation('common')
  const isCollab = item.type === 'collab_invite'
  const actorId = isCollab
    ? item.payload.inviter_character_id
    : item.payload.challenger_character_id
  const badgeVar = isCollab ? 'var(--badge-collab)' : 'var(--badge-duel)'
  const { accept, decline, loading, error } = useRespondToRequest(item)

  const respond = async (action: typeof accept) => {
    const result = await action()
    if (result.ok) onResolved()
  }

  return (
    <div
      className="py-1.5"
      style={{ borderTop: !isFirst ? '1px dashed var(--color-border)' : undefined }}
    >
      <div className="flex items-center gap-2">
        <Link to={`/characters/${actorId}`} className="shrink-0">
          <div
            className="rounded-full"
            style={{
              width: 24,
              height: 24,
              background: `linear-gradient(135deg, ${factionCssVar(item.actor_faction_slug, 'light')}, ${factionCssVar(item.actor_faction_slug)})`,
            }}
          />
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            to={`/characters/${actorId}`}
            className="font-body block truncate"
            style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-primary)', textDecoration: 'none' }}
          >
            {item.actor_display_name}
          </Link>
          <Link
            to="/updates?filter=requests"
            className="eyebrow block"
            style={{ color: 'var(--color-text-tertiary)', textDecoration: 'none' }}
          >
            {isCollab ? t('requests.collabInvite') : t('requests.duelChallenge')}
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-1.5" style={{ marginTop: 4, marginLeft: 32 }}>
        <button
          onClick={() => respond(accept)}
          disabled={loading}
          style={{
            ...REQUEST_BUTTON_BASE,
            background: badgeVar,
            color: 'var(--color-text-on-accent)',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {t('actions.accept')}
        </button>
        <button
          onClick={() => respond(decline)}
          disabled={loading}
          style={{
            ...REQUEST_BUTTON_BASE,
            background: 'transparent',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {t('actions.decline')}
        </button>
      </div>
      {error && (
        <span
          className="eyebrow block"
          style={{ color: 'var(--color-danger)', marginTop: 3, marginLeft: 32 }}
        >
          {error}
        </span>
      )}
    </div>
  )
}

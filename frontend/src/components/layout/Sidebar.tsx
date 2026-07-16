import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthContext'
import { getActivityFeed, type ActivityFeedItem } from '../../api/activityFeed'
import { relativeTime } from '../../utils/dates'
import { factionCssVar, factionName } from '../../utils/factions'
import { mediaUrl } from '../../utils/media'
import { useMyActiveTasks } from '../../hooks/useMyActiveTasks'
import type { PraxisType } from '../../api/praxis'
import { usePendingRequests } from '../../hooks/usePendingRequests'
import { useRespondToRequest } from '../../hooks/useRespondToRequest'
import { useGameConfig } from '../../hooks/useGameConfig'

const DEFAULT_MAX_TASK_SLOTS = 20

/** Shared panel shell for the redesigned sidebar (unaffiliated rainbow style). */
const panelStyle: CSSProperties = {
  position: 'relative',
  overflow: 'hidden',
  background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-xl)',
  padding: 'var(--space-lg)',
}

const sectionLabel: CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-base)',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'var(--color-text-secondary)',
}

/** "LABEL ——————" header: eyebrow + a rule that fades out to the right. */
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-3.5">
      <span style={sectionLabel}>{label}</span>
      <span
        style={{
          flex: 1,
          height: 1,
          background: 'linear-gradient(90deg, var(--color-border-strong), transparent)',
        }}
      />
    </div>
  )
}

/**
 * Always-on right sidebar (Style Guide §4.2), redesigned into the unaffiliated
 * "all paths" rainbow-spectrum identity: character card + pending requests +
 * in-progress tasks + recent global activity + propose CTA.
 */
export default function Sidebar() {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  const character = user?.character

  const { activeTasks, refetch: refetchActiveTasks } = useMyActiveTasks()
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
    <aside className="flex flex-col gap-4 w-full">
      {/* ── Character Card ── */}
      {character ? (
        <section style={panelStyle}>
          {/* signature rainbow rule (this panel only) */}
          <span
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              opacity: 0.85,
              background: 'var(--faction-default-rainbow)',
            }}
          />
          <div className="flex items-center justify-between mb-4">
            <span style={sectionLabel}>{t('sidebar.characterCard.eyebrow')}</span>
            {/* ponytail: dropped a 1px paddingBottom rather than round it up to
                --space-xs — 4px would visibly detach the underline; 0 is the
                nearest honest value and the smallest delta off 1px. */}
            <Link
              to={`/characters/${character.id}/edit`}
              className="hover:opacity-80"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-base)',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--faction-default-card-muted)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--color-border-strong)',
              }}
            >
              {t('sidebar.characterCard.edit')}
            </Link>
          </div>

          <div className="flex items-center gap-3.5 mb-4">
            {/* avatar in a rainbow ring (unaffiliated / all-paths mark) */}
            <div
              className="shrink-0 rounded-full"
              style={{ width: 58, height: 58, padding: 'var(--space-xs)', background: 'var(--faction-default-ring)' }}
            >
              {character.avatar_url ? (
                <img
                  src={mediaUrl(character.avatar_url)}
                  alt={character.display_name}
                  className="w-full h-full rounded-full"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div
                  className="w-full h-full rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${factionCssVar(character.faction_slug, 'light')}, ${factionCssVar(character.faction_slug)})`,
                  }}
                />
              )}
            </div>
            <div className="min-w-0">
              <Link
                to={`/characters/${character.id}`}
                className="font-display italic block truncate"
                style={{ fontSize: 'var(--text-heading)', lineHeight: 1.05, color: 'var(--color-text-primary)', textDecoration: 'none' }}
              >
                {character.display_name}
              </Link>
              <div
                className="truncate"
                style={{
                  marginTop: 'var(--space-xs)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-base)',
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {t('sidebar.characterCard.factionLevel', {
                  faction: factionName(character.faction_slug),
                  level: character.level,
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: t('sidebar.stats.score'), value: character.score?.toLocaleString() ?? '0' },
              { label: t('sidebar.stats.allTime'), value: character.all_time_score?.toLocaleString() ?? '0' },
              { label: t('sidebar.stats.current'), value: user?.era_name ?? '' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center"
                style={{
                  background: 'var(--color-bg-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 9,
                  padding: 'var(--space-md) var(--space-sm)',
                }}
              >
                <div className="font-display" style={{ fontSize: 'var(--text-content)', lineHeight: 1, color: 'var(--color-text-primary)' }}>
                  {stat.value}
                </div>
                <div
                  style={{
                    marginTop: 'var(--space-sm)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-xs)',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section style={panelStyle}>
          <p className="eyebrow text-center">{t('sidebar.characterCard.noCharacter')}</p>
        </section>
      )}

      {/* ── Pending Requests Panel ── */}
      {pendingRequests.length > 0 && (
        <section style={panelStyle}>
          <SectionHeader label={t('sidebar.pendingRequests.heading', { count: pendingRequests.length })} />
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
        </section>
      )}

      {/* ── In Progress Panel ── */}
      <section style={panelStyle}>
        <SectionHeader label={t('sidebar.activeTasks.heading')} />

        {activeTasks.length === 0 ? (
          <p className="font-body text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {t('sidebar.activeTasks.empty')}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {activeTasks.map((praxis) => (
              <div key={praxis.id} className="flex items-start justify-between gap-3">
                <Link
                  to={`/praxes/${praxis.id}/edit`}
                  className="font-display min-w-0"
                  style={{ fontSize: 'var(--text-content)', lineHeight: 1.25, color: 'var(--color-text-primary)', textDecoration: 'none' }}
                >
                  {praxis.task_title}
                </Link>
                <span
                  className="shrink-0"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 'var(--text-sm)',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'var(--faction-default-card-muted)',
                    padding: 'var(--space-xs) var(--space-sm)',
                    border: '1px solid var(--color-border-strong)',
                    borderRadius: 999,
                  }}
                >
                  {praxisTypeLabel[praxis.type]}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Slot-usage progress bar — rainbow fill, drifts unless reduced-motion */}
        <div className="mt-4">
          <div className="overflow-hidden" style={{ height: 6, borderRadius: 999, background: 'var(--color-bg-surface-alt)' }}>
            <div
              className="cs-shimmer"
              style={{
                height: '100%',
                width: `${slotPercent}%`,
                borderRadius: 999,
                background: 'var(--faction-default-rainbow)',
                backgroundSize: '200% 100%',
                transition: 'width 300ms',
              }}
            />
          </div>
          <p
            className="font-body text-right"
            style={{ fontSize: 'var(--text-base)', letterSpacing: '0.08em', color: 'var(--color-text-secondary)', marginTop: 'var(--space-sm)' }}
          >
            {t('sidebar.activeTasks.slots', { count: slotCount, max: maxTaskSlots })}
          </p>
        </div>
      </section>

      {/* ── Recent Global Activity Panel ── */}
      <section style={panelStyle}>
        <SectionHeader label={t('sidebar.globalActivity.heading')} />

        {globalActivity.length === 0 ? (
          <p className="font-body text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {t('sidebar.globalActivity.empty')}
          </p>
        ) : (
          <div className="flex flex-col">
            {globalActivity.map((item, index) => {
              const isTask = item.type === 'global_task'
              const isEra = item.type === 'era_announcement'
              const isLast = index === globalActivity.length - 1
              const taskId = item.payload.task_id
              const title = isEra
                ? item.payload.era_name
                : item.payload.task_title ||
                  item.payload.praxis_title ||
                  t('sidebar.globalActivity.fallbackTaskTitle')
              const kicker = isEra
                ? t('sidebar.globalActivity.kickerEra')
                : isTask
                  ? t('sidebar.globalActivity.kickerNewTask')
                  : item.actor_display_name
              const titleStyle: CSSProperties = {
                fontSize: 'var(--text-content)',
                lineHeight: 1.3,
                color: 'var(--color-text-primary)',
                textDecoration: 'none',
              }
              return (
                <div
                  key={`${item.type}-${index}`}
                  className="flex gap-3"
                  style={{
                    padding: 'var(--space-md) 0',
                    borderBottom: isLast ? undefined : '1px solid var(--color-border)',
                  }}
                >
                  {/* rainbow bullet — sampled from the default spectrum by position */}
                  <span
                    className="shrink-0"
                    style={{
                      width: 6,
                      height: 6,
                      marginTop: 'var(--space-xs)',
                      borderRadius: 2,
                      background: 'var(--faction-default-rainbow)',
                      backgroundSize: '600% 100%',
                      backgroundPosition: `${index * 20}% 0`,
                    }}
                  />
                  <div className="min-w-0">
                    <div
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--text-sm)',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: 'var(--color-text-secondary)',
                        marginBottom: 'var(--space-xs)',
                      }}
                    >
                      {kicker}
                    </div>
                    {isTask && taskId ? (
                      <Link to={`/tasks/${taskId}`} className="font-display block truncate" style={titleStyle}>
                        {title}
                      </Link>
                    ) : (
                      <div className="font-display truncate" style={titleStyle}>
                        {title}
                      </div>
                    )}
                    <div className="font-body" style={{ marginTop: 'var(--space-xs)', fontSize: 'var(--text-base)', color: 'var(--color-text-tertiary)' }}>
                      {relativeTime(item.timestamp)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Propose a Task CTA ── */}
      <Link
        to="/propose-task"
        className="font-display w-full flex items-center justify-center gap-2.5 hover:opacity-90"
        style={{
          boxSizing: 'border-box',
          padding: 'var(--space-lg)',
          borderRadius: 11,
          fontSize: 'var(--text-xl)',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--color-bg-page)',
          background: 'var(--color-text-primary)',
          border: '1px solid var(--color-text-primary)',
          textDecoration: 'none',
        }}
      >
        <span style={{ fontSize: 'var(--text-xl)', lineHeight: 1 }}>+</span>
        <span>{t('actions.proposeTask')}</span>
      </Link>
    </aside>
  )
}

const REQUEST_BUTTON_BASE: CSSProperties = {
  fontFamily: "'Courier Prime', monospace",
  fontSize: 'var(--text-xs)',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  padding: 'var(--space-xs) var(--space-sm)',
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
            /* An actor byline in a dense 24px-avatar notification row —
               scanned, not read. Label tier by the role vocabulary (§4), not
               an exception to the content floor. */
            style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text-primary)', textDecoration: 'none' }}
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
      <div className="flex items-center gap-1.5" style={{ marginTop: 'var(--space-xs)', marginLeft: 'var(--space-2xl)' }}>
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
          style={{ color: 'var(--color-danger)', marginTop: 'var(--space-xs)', marginLeft: 'var(--space-2xl)' }}
        >
          {error}
        </span>
      )}
    </div>
  )
}

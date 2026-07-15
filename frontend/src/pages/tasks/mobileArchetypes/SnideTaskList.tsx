import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TaskOut } from '../../../api/tasks'
import { factionCssVar, factionName, sortFactionsByRainbowOrder } from '../../../utils/factions'
import type { TasksState } from '../useTasks'

/**
 * S.N.I.D.E. MOBILE task-browse skin (#530) — the case board on a phone. The
 * same scannable single-column list + touch-native filter chip rows as the
 * Default browse skin (status / faction / level), dressed as dark job files
 * taped to the wall: Bebas titles, acid edge, hard offset shadow. Dispatched by
 * the VIEWING life's faction (a S.N.I.D.E. operative browsing tasks), so it
 * consumes the shared `useTasks()` state verbatim — a chip tap mutates the same
 * filter state that keys the read. Grounds on the `--faction-snide-*` tokens;
 * native-dark.
 */

const WALL = 'var(--faction-snide-wall)'
const WALL_TEXT = 'var(--faction-snide-wall-text)'
const INK = 'var(--faction-snide-card-bg)'
const TEXT = 'var(--faction-snide-card-text)'
const MUTED = 'var(--faction-snide-card-muted)'
const ACID = 'var(--faction-snide-card-accent)'
const ACCENT_WALL = 'var(--faction-snide)'
const LINE = 'var(--faction-snide-border)'
const COND = 'var(--faction-snide-font-cond)'
const IMPACT = 'var(--faction-snide-font-impact)'
const TYPE = 'var(--faction-snide-font-type)'
const MARKER = 'var(--faction-snide-font-marker)'

const CARD_SHADOW = '5px 6px 0 rgba(0,0,0,.5)'

const kicker: CSSProperties = {
  fontFamily: TYPE,
  fontSize: 8,
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: MUTED,
}

export default function SnideTaskList({ state }: { state: TasksState }) {
  const { t } = useTranslation('tasks')
  const { t: tc } = useTranslation('common')
  const {
    tasks,
    loading,
    error,
    factions,
    statusFilters,
    levelFilters,
    status,
    setStatus,
    faction,
    setFaction,
    level,
    setLevel,
    displayPointsFor,
  } = state

  return (
    <div data-skin="snide" className="py-4" style={{ fontFamily: TYPE, color: WALL_TEXT, background: WALL }} data-testid="mobile-tasks-browse">
      <div style={{ ...kicker, color: ACCENT_WALL }}>{t('snide.faction')}</div>
      <h1 style={{ fontFamily: COND, fontSize: 32, letterSpacing: '0.03em', lineHeight: 1, color: WALL_TEXT, margin: '2px 0 0' }}>
        {tc('nav.tasks')}
      </h1>
      <div style={{ height: 2, margin: '9px 0 12px', background: ACCENT_WALL }} />
      <p style={{ ...kicker, marginBottom: 12 }}>{t('mobile.count', { count: tasks.length })}</p>

      <ChipRow label={tc('filters.status')}>
        {statusFilters.map((option) => (
          <Chip key={option} on={status === option} onClick={() => setStatus(option)}>
            {option}
          </Chip>
        ))}
      </ChipRow>

      <ChipRow label={tc('filters.faction')}>
        <Chip on={faction === ''} onClick={() => setFaction('')}>
          {t('mobile.allFactions')}
        </Chip>
        {sortFactionsByRainbowOrder(factions).map((f) => (
          <Chip
            key={f.slug}
            on={faction === f.slug}
            onClick={() => setFaction(faction === f.slug ? '' : f.slug)}
            tint={factionCssVar(f.slug)}
          >
            {factionName(f.slug)}
          </Chip>
        ))}
      </ChipRow>

      <ChipRow label={tc('filters.level')}>
        <Chip on={level === ''} onClick={() => setLevel('')}>
          {t('mobile.anyLevel')}
        </Chip>
        {levelFilters.map((lvl) => (
          <Chip key={lvl} on={level === lvl} onClick={() => setLevel(level === lvl ? '' : lvl)}>
            {tc('filters.levelAtLeast', { level: lvl })}
          </Chip>
        ))}
      </ChipRow>

      <div className="mt-4">
        {loading ? (
          <p style={{ fontFamily: MARKER, fontSize: 14, color: MUTED }}>{t('listPage.loading')}</p>
        ) : error ? (
          <p style={{ fontFamily: TYPE, fontSize: 12, color: 'var(--color-danger)', border: `1px solid ${LINE}`, padding: '8px 12px' }}>
            {t('mobile.loadError')}
          </p>
        ) : tasks.length === 0 ? (
          <p style={{ fontFamily: MARKER, fontSize: 14, color: MUTED, transform: 'rotate(-1deg)' }}>{t('listPage.empty')}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {tasks.map((task) => (
              <JobFile key={task.id} task={task} points={displayPointsFor(task)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span style={{ ...kicker, flex: 'none' }}>{label}</span>
      <div className="flex gap-2" style={{ overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
        {children}
      </div>
    </div>
  )
}

function Chip({
  on,
  onClick,
  tint,
  children,
}: {
  on: boolean
  onClick: () => void
  tint?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: TYPE,
        fontSize: 10,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: on ? INK : MUTED,
        background: on ? ACID : INK,
        border: `1px solid ${on ? ACID : LINE}`,
        padding: '8px 14px',
        minHeight: 36,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
      }}
    >
      {tint && <i style={{ width: 8, height: 8, flex: 'none', background: tint }} />}
      {children}
    </button>
  )
}

function JobFile({ task, points }: { task: TaskOut; points: number }) {
  const { t } = useTranslation('tasks')
  const color = factionCssVar(task.primary_faction_slug)
  return (
    <Link
      to={`/tasks/${task.id}`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '14px 16px',
        background: INK,
        color: TEXT,
        border: `1px solid ${LINE}`,
        borderLeft: `4px solid ${color}`,
        boxShadow: CARD_SHADOW,
        textDecoration: 'none',
        overflow: 'hidden',
      }}
    >
      <span
        aria-hidden
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'radial-gradient(rgba(182,255,46,0.07) 32%, transparent 34%)', backgroundSize: '5px 5px' }}
      />
      <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: TYPE, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color }}>
        <i style={{ width: 7, height: 7, background: color, flex: 'none' }} />
        {factionName(task.primary_faction_slug)}
      </span>

      <h2 style={{ position: 'relative', fontFamily: COND, fontSize: 21, letterSpacing: '0.02em', lineHeight: 1.1, color: TEXT, margin: 0 }}>
        {task.title}
      </h2>

      {task.description && (
        <p
          style={{
            position: 'relative',
            fontFamily: TYPE,
            fontSize: 12.5,
            lineHeight: 1.5,
            color: MUTED,
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {task.description}
        </p>
      )}

      <div className="flex items-center gap-3" style={{ position: 'relative', marginTop: 2 }}>
        <span style={{ fontFamily: IMPACT, fontSize: 13, letterSpacing: '0.02em', color: INK, background: ACID, padding: '3px 9px' }}>
          {t('mobile.points', { points })}
        </span>
        <span style={{ ...kicker, color: MUTED }}>{t('mobile.level', { level: task.level_required })}</span>
      </div>
    </Link>
  )
}

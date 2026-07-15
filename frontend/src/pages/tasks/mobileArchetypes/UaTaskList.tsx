import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TaskOut } from '../../../api/tasks'
import { factionCssVar, factionName, sortFactionsByRainbowOrder } from '../../../utils/factions'
import type { TasksState } from '../useTasks'

/**
 * University of Asthmatics MOBILE task-browse skin (#525) — the salon
 * prospectus on a phone. The same scannable single-column list + touch-native
 * filter chip rows as the Default browse skin (status / faction / level),
 * dressed as parchment commission plates on a gilt rail. Dispatched by the
 * VIEWING life's faction (a UA member browsing tasks), so it consumes the shared
 * `useTasks()` state verbatim — a chip tap mutates the same filter state that
 * keys the read. Grounds on the `--faction-ua-*` / `--ua-*` tokens; always-light.
 */

const PAPER = 'var(--faction-ua-card-bg)'
const PAPER_WARM = 'var(--ua-paper-warm)'
const WALL = 'var(--ua-wall)'
const INK = 'var(--faction-ua-card-text)'
const ACCENT = 'var(--faction-ua-card-accent)'
const SUB = 'var(--faction-ua-card-muted)'
const MUTED = 'var(--ua-muted)'
const GOLD = 'var(--ua-gold)'
const LINE = 'var(--ua-line)'
const DISPLAY = 'var(--faction-ua-card-font)'
const ENGRAVED = 'var(--font-faction-engraved)'
const MONO = 'var(--font-body)'

const kicker: CSSProperties = {
  fontFamily: MONO,
  fontSize: 8,
  letterSpacing: '0.24em',
  textTransform: 'uppercase',
  color: MUTED,
}

export default function UaTaskList({ state }: { state: TasksState }) {
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
    <div data-skin="ua" className="py-4" style={{ fontFamily: MONO, color: INK, background: WALL }} data-testid="mobile-tasks-browse">
      <div style={kicker}>{t('ua.masthead')}</div>
      <h1 style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 30, lineHeight: 1.05, color: INK, margin: '2px 0 0' }}>
        {tc('nav.tasks')}
      </h1>
      <div style={{ height: 1, margin: '9px 0 12px', background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
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
          <p style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 15, color: SUB }}>{t('listPage.loading')}</p>
        ) : error ? (
          <p style={{ fontFamily: MONO, fontSize: 12, color: 'var(--color-danger)', border: `1px solid ${LINE}`, padding: '8px 12px' }}>
            {t('mobile.loadError')}
          </p>
        ) : tasks.length === 0 ? (
          <p style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 15, color: SUB }}>{t('listPage.empty')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {tasks.map((task) => (
              <CommissionPlate key={task.id} task={task} points={displayPointsFor(task)} />
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
        fontFamily: ENGRAVED,
        fontSize: 10,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: on ? PAPER_WARM : SUB,
        background: on ? ACCENT : PAPER,
        border: `1px solid ${on ? ACCENT : LINE}`,
        borderRadius: 999,
        padding: '8px 14px',
        minHeight: 36,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
      }}
    >
      {tint && <i style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: tint }} />}
      {children}
    </button>
  )
}

function CommissionPlate({ task, points }: { task: TaskOut; points: number }) {
  const { t } = useTranslation('tasks')
  const color = factionCssVar(task.primary_faction_slug)
  return (
    <Link
      to={`/tasks/${task.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '14px 16px',
        background: PAPER,
        backgroundImage: 'radial-gradient(rgba(60,40,10,.03) 1px, transparent 1px)',
        backgroundSize: '5px 5px',
        border: `1px solid ${LINE}`,
        borderLeft: `4px solid ${color}`,
        boxShadow: `inset 0 0 0 3px ${PAPER}, inset 0 0 0 4px var(--ua-gold-pale)`,
        textDecoration: 'none',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: ENGRAVED, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color }}>
        <i style={{ width: 7, height: 7, borderRadius: '50%', background: color, flex: 'none' }} />
        {factionName(task.primary_faction_slug)}
      </span>

      <h2 style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 700, fontSize: 19, lineHeight: 1.15, color: INK, margin: 0 }}>
        {task.title}
      </h2>

      {task.description && (
        <p
          style={{
            fontFamily: DISPLAY,
            fontStyle: 'italic',
            fontSize: 13,
            lineHeight: 1.5,
            color: SUB,
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

      <div className="flex items-center gap-3" style={{ marginTop: 2 }}>
        <span style={{ fontFamily: ENGRAVED, fontSize: 12, letterSpacing: '0.04em', color: INK, background: PAPER_WARM, border: `1px solid ${GOLD}`, padding: '3px 9px' }}>
          {t('mobile.points', { points })}
        </span>
        <span style={{ ...kicker, color: MUTED }}>{t('mobile.level', { level: task.level_required })}</span>
      </div>
    </Link>
  )
}

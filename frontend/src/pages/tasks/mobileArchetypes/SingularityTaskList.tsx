import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TaskOut } from '../../../api/tasks'
import { factionCssVar, factionName, sortFactionsByRainbowOrder } from '../../../utils/factions'
import type { TasksState } from '../useTasks'

/**
 * Singularity MOBILE task-browse skin (#526) — the terminal directory on a
 * phone. The same scannable single-column list + touch-native filter chip rows
 * as the Default browse skin (status / faction / level), dressed as bracketed
 * readout cards on a void field. Dispatched by the VIEWING life's faction (a
 * Singularity node browsing tasks), so it consumes the shared `useTasks()` state
 * verbatim — a chip tap mutates the same filter state that keys the read.
 *
 * Always-dark: every colour resolves to a --faction-singularity-* token that
 * reads identically in both themes; the skin paints its own void container and
 * never mutates data-theme.
 */

const VOID = 'var(--faction-singularity-card-bg)'
const PHOSPHOR = 'var(--faction-singularity-card-accent)'
const SIGNAL = 'var(--faction-singularity-card-muted)'
const BORDER_HARD = 'var(--faction-singularity-border-hard)'
const FONT = 'var(--font-faction-terminal)'

const phosphor = (pct: number): string => `color-mix(in srgb, ${PHOSPHOR} ${pct}%, transparent)`
const signal = (pct: number): string => `color-mix(in srgb, ${SIGNAL} ${pct}%, transparent)`

const kicker: CSSProperties = {
  fontFamily: FONT,
  fontSize: 8,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: signal(60),
}

export default function SingularityTaskList({ state }: { state: TasksState }) {
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
    <div data-skin="singularity" className="py-4" style={{ fontFamily: FONT, color: PHOSPHOR, background: VOID }} data-testid="mobile-tasks-browse">
      <div style={kicker}>{t('singularity.mobile.listMasthead')}</div>
      <h1 style={{ fontFamily: FONT, fontSize: 24, lineHeight: 1.05, color: PHOSPHOR, letterSpacing: '0.03em', margin: '2px 0 0' }}>
        {tc('nav.tasks')}
      </h1>
      <div style={{ height: 1, margin: '9px 0 12px', background: `linear-gradient(90deg, ${BORDER_HARD}, transparent)` }} />
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
          <p style={{ fontFamily: FONT, fontSize: 12, color: phosphor(50) }}>{t('listPage.loading')}</p>
        ) : error ? (
          <p style={{ fontFamily: FONT, fontSize: 12, color: 'var(--color-danger)', border: `1px solid ${signal(40)}`, padding: '8px 12px' }}>
            {t('mobile.loadError')}
          </p>
        ) : tasks.length === 0 ? (
          <p style={{ fontFamily: FONT, fontSize: 12, color: phosphor(50) }}>{t('listPage.empty')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {tasks.map((task) => (
              <ReadoutCard key={task.id} task={task} points={displayPointsFor(task)} />
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
        fontFamily: FONT,
        fontSize: 10,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: on ? VOID : signal(70),
        background: on ? PHOSPHOR : 'transparent',
        border: `1px solid ${on ? PHOSPHOR : signal(35)}`,
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

function ReadoutCard({ task, points }: { task: TaskOut; points: number }) {
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
        background: VOID,
        border: `1px solid ${signal(38)}`,
        borderLeft: `3px solid ${color}`,
        textDecoration: 'none',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT, fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: SIGNAL }}>
        <i style={{ width: 7, height: 7, background: color, flex: 'none' }} />
        {factionName(task.primary_faction_slug)}
      </span>

      <h2 style={{ fontFamily: FONT, fontSize: 15, lineHeight: 1.3, color: PHOSPHOR, margin: 0, overflowWrap: 'anywhere' }}>
        {'> '}
        {task.title}
      </h2>

      {task.description && (
        <p
          style={{
            fontFamily: FONT,
            fontSize: 11,
            lineHeight: 1.5,
            color: phosphor(55),
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

      <div className="flex items-center gap-3" style={{ marginTop: 2, borderTop: `1px solid ${signal(20)}`, paddingTop: 8 }}>
        <span style={{ fontFamily: FONT, fontSize: 12, letterSpacing: '0.04em', color: PHOSPHOR, border: `1px solid ${signal(38)}`, padding: '3px 9px' }}>
          {t('mobile.points', { points })}
        </span>
        <span style={{ ...kicker }}>{t('mobile.level', { level: task.level_required })}</span>
      </div>
    </Link>
  )
}

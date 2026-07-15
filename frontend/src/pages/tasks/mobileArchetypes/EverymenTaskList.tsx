import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TaskOut } from '../../../api/tasks'
import { factionCssVar, factionName, sortFactionsByRainbowOrder } from '../../../utils/factions'
import type { TasksState } from '../useTasks'

/**
 * Everymen MOBILE task-browse skin (#529) — the union jobs board on a phone. The
 * same scannable single-column list + touch-native filter chip rows as the
 * Default browse skin (status / faction / level), dressed as posted work orders
 * on cream newsprint with a red ledger rail and a gold points seal. Dispatched by
 * the VIEWING life's faction (an Everymen member browsing tasks), so it consumes
 * the shared `useTasks()` state verbatim — a chip tap mutates the same filter
 * state that keys the read. Grounds on the `--everymen-*` tokens; flips with
 * `[data-theme]`.
 */

const INK = 'var(--everymen-ink)'
const CREAM = 'var(--everymen-cream)'
const RED = 'var(--everymen-red)'
const GOLD = 'var(--everymen-gold)'
const MUTED = 'var(--everymen-muted)'
const PAPER = 'var(--everymen-paper)'
const PAPER_DEEP = 'var(--everymen-paper-deep)'
const ACCENT_FONT = 'var(--font-accent)'
const BODY_FONT = 'var(--font-body)'

const kicker: CSSProperties = {
  fontFamily: BODY_FONT,
  fontSize: 8,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: MUTED,
}

export default function EverymenTaskList({ state }: { state: TasksState }) {
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
    <div data-skin="everymen" className="py-4" style={{ fontFamily: BODY_FONT, color: INK, background: PAPER }} data-testid="mobile-tasks-browse">
      <div style={{ ...kicker, color: RED }}>{t('everymen.masthead')}</div>
      <h1 style={{ fontFamily: ACCENT_FONT, fontSize: 32, lineHeight: 0.95, letterSpacing: '0.02em', color: INK, margin: '2px 0 0' }}>
        {tc('nav.tasks')}
      </h1>
      <div style={{ height: 3, margin: '9px 0 12px', background: `repeating-linear-gradient(90deg, ${RED} 0 12px, ${GOLD} 12px 20px)` }} />
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
          <p style={{ fontFamily: ACCENT_FONT, fontSize: 16, color: MUTED }}>{t('listPage.loading')}</p>
        ) : error ? (
          <p style={{ fontFamily: BODY_FONT, fontSize: 12, color: RED, border: `1.5px solid ${RED}`, padding: '8px 12px' }}>
            {t('mobile.loadError')}
          </p>
        ) : tasks.length === 0 ? (
          <p style={{ fontFamily: ACCENT_FONT, fontSize: 16, color: MUTED }}>{t('listPage.empty')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {tasks.map((task) => (
              <WorkOrder key={task.id} task={task} points={displayPointsFor(task)} />
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
        fontFamily: BODY_FONT,
        fontSize: 10,
        fontWeight: on ? 700 : 400,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: on ? CREAM : INK,
        background: on ? INK : PAPER_DEEP,
        border: `1.5px solid ${INK}`,
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

function WorkOrder({ task, points }: { task: TaskOut; points: number }) {
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
        backgroundImage: 'radial-gradient(color-mix(in srgb, var(--everymen-ink) 6%, transparent) 0.6px, transparent 0.9px)',
        backgroundSize: '5px 5px',
        border: `2px solid ${INK}`,
        borderLeft: `5px solid ${color}`,
        textDecoration: 'none',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...kicker, color }}>
        <i style={{ width: 7, height: 7, background: color, flex: 'none' }} />
        {factionName(task.primary_faction_slug)}
      </span>

      <h2 style={{ fontFamily: ACCENT_FONT, fontSize: 22, lineHeight: 1, letterSpacing: '0.01em', color: INK, margin: 0 }}>
        {task.title}
      </h2>

      {task.description && (
        <p
          style={{
            fontFamily: BODY_FONT,
            fontSize: 13,
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

      <div className="flex items-center gap-3" style={{ marginTop: 2 }}>
        <span style={{ fontFamily: ACCENT_FONT, fontSize: 15, letterSpacing: '0.04em', color: INK, background: GOLD, padding: '3px 10px' }}>
          {t('mobile.points', { points })}
        </span>
        <span style={{ ...kicker }}>{t('mobile.level', { level: task.level_required })}</span>
      </div>
    </Link>
  )
}

import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TaskOut } from '../../../api/tasks'
import { factionCssVar, factionName, sortFactionsByRainbowOrder } from '../../../utils/factions'
import { EphMark } from '../../../components/cards/ephemeristsAtoms'
import type { TasksState } from '../useTasks'

/**
 * The Ephemerists MOBILE task-browse skin (#527) — the survey register on a
 * phone. The same scannable single-column list + touch-native filter chip rows as
 * the Default browse skin (status / faction / level), dressed as ledger-ruled
 * commission leaves on aged vellum. Dispatched by the VIEWING life's faction (an
 * Ephemerist browsing tasks), so it consumes the shared `useTasks()` state
 * verbatim — a chip tap mutates the same filter state that keys the read. Grounds
 * on the `--eph-*` tokens; theme-aware through the cascade.
 */

const VELLUM = 'var(--eph-vellum)'
const VELLUM_DEEP = 'var(--eph-vellum-deep)'
const TEXT = 'var(--eph-vellum-text)'
const MUTED = 'var(--eph-muted)'
const RUBRIC = 'var(--eph-rubric)'
const LAPIS = 'var(--eph-lapis)'
const GOLD = 'var(--eph-gold)'
const GOLD_DEEP = 'var(--eph-gold-deep)'
const PARCHMENT = 'var(--eph-parchment)'
const DISPLAY = 'var(--eph-display)'
const SERIF = 'var(--eph-serif)'
const SCRIPT = 'var(--eph-script)'

const kicker: CSSProperties = {
  fontFamily: DISPLAY,
  fontSize: 8,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: MUTED,
}

export default function EphemeristsTaskList({ state }: { state: TasksState }) {
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
    <div data-skin="ephemerists" className="py-4" style={{ fontFamily: SERIF, color: TEXT, background: VELLUM_DEEP }} data-testid="mobile-tasks-browse">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: RUBRIC }}>
        <EphMark size={12} color={LAPIS} />
        <span style={kicker}>{t('ephemerists.masthead')}</span>
      </div>
      <h1 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 28, lineHeight: 1.05, color: TEXT, margin: '4px 0 0' }}>
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
          <p style={{ fontFamily: SCRIPT, fontStyle: 'italic', fontSize: 15, color: MUTED }}>{t('listPage.loading')}</p>
        ) : error ? (
          <p style={{ fontFamily: SERIF, fontSize: 12, color: 'var(--color-danger)', border: `1px solid ${GOLD_DEEP}`, padding: '8px 12px' }}>
            {t('mobile.loadError')}
          </p>
        ) : tasks.length === 0 ? (
          <p style={{ fontFamily: SCRIPT, fontStyle: 'italic', fontSize: 15, color: MUTED }}>{t('listPage.empty')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {tasks.map((task) => (
              <CommissionLeaf key={task.id} task={task} points={displayPointsFor(task)} />
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
        fontFamily: DISPLAY,
        fontSize: 10,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: on ? PARCHMENT : MUTED,
        background: on ? RUBRIC : VELLUM,
        border: `1px solid ${on ? RUBRIC : GOLD_DEEP}`,
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

function CommissionLeaf({ task, points }: { task: TaskOut; points: number }) {
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
        background: VELLUM,
        border: `1px solid ${GOLD_DEEP}`,
        borderLeft: `4px solid ${color}`,
        textDecoration: 'none',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: DISPLAY, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color }}>
        <i style={{ width: 7, height: 7, borderRadius: '50%', background: color, flex: 'none' }} />
        {factionName(task.primary_faction_slug)}
      </span>

      <h2 style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 19, lineHeight: 1.15, color: TEXT, margin: 0 }}>
        {task.title}
      </h2>

      {task.description && (
        <p
          style={{
            fontFamily: SCRIPT,
            fontStyle: 'italic',
            fontSize: 14,
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
        <span style={{ fontFamily: DISPLAY, fontSize: 12, letterSpacing: '0.04em', color: TEXT, background: VELLUM_DEEP, border: `1px solid ${GOLD}`, padding: '3px 9px' }}>
          {t('mobile.points', { points })}
        </span>
        <span style={{ ...kicker, color: MUTED }}>{t('mobile.level', { level: task.level_required })}</span>
      </div>
    </Link>
  )
}

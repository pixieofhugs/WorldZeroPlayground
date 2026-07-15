import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TaskOut } from '../../../api/tasks'
import { factionCssVar, factionName, sortFactionsByRainbowOrder } from '../../../utils/factions'
import AlbescentMark from '../../../components/cards/AlbescentMark'
import type { TasksState } from '../useTasks'

/**
 * Albescent MOBILE task-browse skin (#528) — the Ledger on a phone. The same
 * scannable single-column list + touch-native filter chip rows as the Default
 * browse skin (status / faction / level), dressed as quiet cotton entries: the
 * surveyor's Mark, hairline borders, Cormorant italic, one hue of ink. Dispatched
 * by the VIEWING life's faction (an Albescent keeper browsing tasks), so it
 * consumes the shared `useTasks()` state verbatim — a chip tap mutates the same
 * filter state that keys the read. Grounds on the `--faction-albescent-*` tokens;
 * always-light.
 */

const INK = 'var(--faction-albescent-card-text)'
const SHEET = 'var(--faction-albescent-card-bg)'
const PAGE = 'var(--faction-albescent-page)'
const FONT = 'var(--faction-albescent-card-font)'
const MONO = 'var(--faction-albescent-mono)'
/** A near-black ink wash at the given opacity — the whole palette is one hue. */
const ink = (pct: number) => `color-mix(in srgb, ${INK} ${pct}%, transparent)`

const kicker: CSSProperties = {
  fontFamily: MONO,
  fontSize: 8,
  letterSpacing: '0.28em',
  textTransform: 'uppercase',
  color: ink(30),
}

export default function AlbescentTaskList({ state }: { state: TasksState }) {
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
    <div data-skin="albescent" className="py-4" style={{ fontFamily: MONO, color: INK, background: PAGE }} data-testid="mobile-tasks-browse">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
        <AlbescentMark size={22} />
        <div style={kicker}>{t('albescent.masthead')}</div>
      </div>
      <h1 style={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 300, fontSize: 30, lineHeight: 1.05, color: INK, margin: '4px 0 0' }}>
        {tc('nav.tasks')}
      </h1>
      <div style={{ height: 1, margin: '9px 0 12px', background: ink(10) }} />
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
          <p style={{ fontFamily: FONT, fontStyle: 'italic', fontSize: 15, color: ink(45) }}>{t('listPage.loading')}</p>
        ) : error ? (
          <p style={{ fontFamily: MONO, fontSize: 12, color: 'var(--color-danger)', border: `1px solid ${ink(14)}`, padding: '8px 12px' }}>
            {t('mobile.loadError')}
          </p>
        ) : tasks.length === 0 ? (
          <p style={{ fontFamily: FONT, fontStyle: 'italic', fontSize: 15, color: ink(45) }}>{t('listPage.empty')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {tasks.map((task) => (
              <EntryPlate key={task.id} task={task} points={displayPointsFor(task)} />
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
        fontFamily: MONO,
        fontSize: 9,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: on ? PAGE : ink(45),
        background: on ? INK : SHEET,
        border: `1px solid ${on ? INK : ink(14)}`,
        borderRadius: 0,
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

function EntryPlate({ task, points }: { task: TaskOut; points: number }) {
  const { t } = useTranslation('tasks')
  return (
    <Link
      to={`/tasks/${task.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '16px 18px',
        background: SHEET,
        border: `1px solid ${ink(10)}`,
        boxShadow: '0 2px 18px rgba(0,0,0,0.045), 0 1px 3px rgba(0,0,0,0.04)',
        textDecoration: 'none',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <AlbescentMark size={16} opacity={0.75} />
        <i style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: ink(24), fontStyle: 'normal' }}>
          {factionName(task.primary_faction_slug)}
        </i>
      </span>

      <h2 style={{ fontFamily: FONT, fontStyle: 'italic', fontWeight: 300, fontSize: 19, lineHeight: 1.28, color: INK, margin: 0, overflowWrap: 'anywhere' }}>
        {task.title}
      </h2>

      {task.description && (
        <p
          style={{
            fontFamily: MONO,
            fontSize: 10,
            lineHeight: 1.6,
            color: ink(42),
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

      <div className="flex items-center justify-between" style={{ marginTop: 2, borderTop: `1px solid ${ink(7)}`, paddingTop: 10 }}>
        <span style={{ ...kicker, letterSpacing: '0.2em', color: ink(24) }}>{t('mobile.level', { level: task.level_required })}</span>
        <span style={{ fontFamily: FONT, fontStyle: 'italic', fontSize: 16, color: ink(55) }}>{t('mobile.points', { points })}</span>
      </div>
    </Link>
  )
}

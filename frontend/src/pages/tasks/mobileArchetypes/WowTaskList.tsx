import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TaskOut } from '../../../api/tasks'
import { factionCssVar, factionName, sortFactionsByRainbowOrder } from '../../../utils/factions'
import type { TasksState } from '../useTasks'

/**
 * Warriors of Whimsy MOBILE task-browse skin (#531) — the quest board on a
 * phone. The same scannable single-column list + touch-native filter chip rows
 * as the Default browse skin (status / faction / level), dressed as pink
 * scrapbook "quest" sticker-cards: dotted board, inner notepad, sparkle accents,
 * Caveat titles. Dispatched by the VIEWING life's faction (a WOW witch browsing
 * quests), so it consumes the shared `useTasks()` state verbatim — a chip tap
 * mutates the same filter state that keys the read. Grounds on the
 * `--faction-wow-*` window tokens already in index.css (the set the WOW pilots
 * use); always-light. Presentation-only.
 */

const PINK = 'var(--faction-wow)'
const PINK_DEEP = 'var(--faction-wow-card-accent)'
const TITLE_TEXT = 'var(--faction-wow-title-text)'
const CARD_TEXT = 'var(--faction-wow-card-text)'
const CARD_MUTED = 'var(--faction-wow-card-muted)'
const WIN_BORDER = 'var(--faction-wow-win-border)'
const NOTEPAD_BG = 'var(--faction-wow-notepad-bg)'
const NOTEPAD_BORDER = 'var(--faction-wow-notepad-border)'
const BODY_BG = 'var(--faction-wow-body-bg)'
const DOT = 'var(--faction-wow-dot)'
const SCRIPT = 'var(--faction-wow-card-font)' // Caveat
const BODY = 'var(--font-body)' // Courier Prime
const ON_ACCENT = 'var(--color-text-on-accent)'

/** The kit's four-point sparkle. */
function Sparkle({ size, color, style }: { size: number; color: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden>
      <path
        d="M12 0c.9 7 4.1 10.2 11 11-6.9.8-10.1 4-11 11-.9-7-4.1-10.2-11-11C7.9 10.2 11.1 7 12 0Z"
        fill={color}
      />
    </svg>
  )
}

export default function WowTaskList({ state }: { state: TasksState }) {
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
    <div
      data-skin="wow"
      className="py-4"
      style={{
        fontFamily: BODY,
        color: CARD_TEXT,
        background: BODY_BG,
        backgroundImage: `radial-gradient(${DOT} 1.4px, transparent 1.4px)`,
        backgroundSize: '15px 15px',
        marginLeft: -16,
        marginRight: -16,
        paddingLeft: 16,
        paddingRight: 16,
      }}
      data-testid="mobile-tasks-browse"
    >
      <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: PINK_DEEP }}>
        {t('wow.mobile.masthead')}
      </div>
      <h1
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: SCRIPT,
          fontSize: 34,
          lineHeight: 0.95,
          color: TITLE_TEXT,
          margin: '2px 0 0',
        }}
      >
        {tc('nav.tasks')}
        <Sparkle size={15} color={PINK} />
      </h1>
      <p style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: CARD_MUTED, margin: '6px 0 12px' }}>
        {t('mobile.count', { count: tasks.length })}
      </p>

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
          <p style={{ fontFamily: SCRIPT, fontSize: 20, color: PINK }}>{t('listPage.loading')}</p>
        ) : error ? (
          <p style={{ fontFamily: BODY, fontSize: 12, color: 'var(--color-danger)', border: `1.5px solid ${NOTEPAD_BORDER}`, borderRadius: 9, padding: '10px 12px' }}>
            {t('mobile.loadError')}
          </p>
        ) : tasks.length === 0 ? (
          <p style={{ fontFamily: SCRIPT, fontSize: 20, color: PINK }}>{t('listPage.empty')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {tasks.map((task) => (
              <QuestCard key={task.id} task={task} points={displayPointsFor(task)} />
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
      <span style={{ flex: 'none', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: CARD_MUTED }}>
        {label}
      </span>
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
        fontFamily: BODY,
        fontSize: 11,
        fontWeight: on ? 700 : 400,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: on ? ON_ACCENT : CARD_MUTED,
        background: on ? `linear-gradient(180deg, ${PINK}, ${PINK_DEEP})` : NOTEPAD_BG,
        border: `1.5px solid ${on ? PINK_DEEP : NOTEPAD_BORDER}`,
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

/** A pink scrapbook quest sticker-card: dotted board + inner notepad. */
function QuestCard({ task, points }: { task: TaskOut; points: number }) {
  const { t } = useTranslation('tasks')
  const color = factionCssVar(task.primary_faction_slug)
  return (
    <Link
      to={`/tasks/${task.id}`}
      style={{
        display: 'block',
        borderRadius: 14,
        overflow: 'hidden',
        border: `2px solid ${WIN_BORDER}`,
        boxShadow: `0 6px 16px color-mix(in srgb, ${PINK} 18%, transparent)`,
        textDecoration: 'none',
      }}
    >
      <div
        style={{
          padding: 10,
          background: BODY_BG,
          backgroundImage: `radial-gradient(${DOT} 1.4px, transparent 1.4px)`,
          backgroundSize: '13px 13px',
        }}
      >
        <div style={{ background: NOTEPAD_BG, border: `1.5px solid ${NOTEPAD_BORDER}`, borderRadius: 9, padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color }}>
            <Sparkle size={10} color={color} />
            {t('wow.mobile.cardMeta', { faction: factionName(task.primary_faction_slug), points })}
          </span>

          <h2 style={{ fontFamily: SCRIPT, fontSize: 22, lineHeight: 1.05, color: TITLE_TEXT, margin: 0, overflowWrap: 'anywhere' }}>
            {task.title}
          </h2>

          {task.description && (
            <p
              style={{
                fontFamily: BODY,
                fontSize: 12,
                lineHeight: 1.5,
                color: CARD_MUTED,
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
            <span style={{ fontFamily: BODY, fontSize: 12, fontWeight: 700, color: PINK_DEEP, background: BODY_BG, border: `1px solid ${NOTEPAD_BORDER}`, borderRadius: 999, padding: '3px 11px' }}>
              {t('mobile.points', { points })}
            </span>
            <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: CARD_MUTED }}>
              {t('mobile.level', { level: task.level_required })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

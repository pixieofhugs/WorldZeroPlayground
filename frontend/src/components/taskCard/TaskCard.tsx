import type { TaskOut } from '../../api/tasks'
import { useAuth } from '../../auth/AuthContext'
import { useAdminMode } from '../../auth/AdminModeContext'
import DefaultTaskCard from './DefaultTaskCard'
import { factionCssVar, factionFill, factionName } from '../../utils/factions'
import { pickVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'
import type { } from 'react'

/**
 * The contract every faction task-card skin is built against (ADR-0055).
 *
 * Points arrive UNMULTIPLIED, with the viewer's faction modifier alongside,
 * rather than as the pre-multiplied product the pre-v2 `displayPoints` prop
 * carried. A card renders `basePoints`, and renders a `×multiplier` badge only
 * when `isNeutralMultiplier(multiplier)` is false — which is never at `era_1`
 * values, and automatic the day an era ships a non-1.0 modifier.
 */
export interface CardProps {
  task: TaskOut
  /** `task.point_value` — the unmodified value, never `base × multiplier`. */
  basePoints: number
  /** Raw own/other task modifier for the viewer. 1.0 → no badge. */
  multiplier: number
  /** Characters actively working this task (#1021). 0 → no in-progress line. */
  inProgressCount: number
  onSignup?: (id: number) => void
}

/**
 * What the dispatcher itself accepts. The two derived props are optional here
 * and required on {@link CardProps}: a surface with no viewer-faction context
 * (a character profile's task list) has no multiplier to pass, and
 * `inProgressCount` is a plain read off the task. Defaulting once here beats
 * spelling both out at every call site — and keeps the skin contract total.
 */
export type TaskCardProps =
  Omit<CardProps, 'multiplier' | 'inProgressCount'>
  & Partial<Pick<CardProps, 'multiplier' | 'inProgressCount'>>

// `na` / unaffiliated + any faction without a bespoke card → the spectrum
// default skin (#418). No longer borrows UA's costume.
export const DEFAULT_CARD = DefaultTaskCard

export default function TaskCard({
  task,
  basePoints,
  multiplier = 1,
  // `in_progress_count` is optional on TaskOut so pre-#1021 fixtures stay
  // valid; a live backend always sends it (int, default 0).
  inProgressCount = task.in_progress_count ?? 0,
  onSignup,
}: TaskCardProps) {
  const { user } = useAuth()
  const { adminMode } = useAdminMode()
  const showAdminControls = user?.is_admin && adminMode

  // `api/admin` is loaded here rather than at module scope (#1141): a task card
  // renders for every visitor, and a static import put the admin chunk in every
  // logged-out `/tasks` waterfall for a control only a moderator can reach.
  const handleStatusChange = async (newStatus: string) => {
    const { updateTaskStatus } = await import('../../api/admin')
    await updateTaskStatus(task.id, newStatus)
    window.location.reload()
  }

  const Card = pickVariant(surfaceMap('taskCard'), task.primary_faction_slug, DEFAULT_CARD)
  const isMetatask = task.task_type === 'metatask'
  return (
    <div style={{ position: 'relative' }}>
      <Card
        task={task}
        basePoints={basePoints}
        multiplier={multiplier}
        inProgressCount={inProgressCount}
        onSignup={onSignup}
      />
      {isMetatask && (
        <div
          style={{
            position: 'absolute',
            top: -6,
            left: -6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 'var(--space-xs)',
            zIndex: 5,
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontFamily: "'Courier Prime', monospace",
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              padding: 'var(--space-xs) var(--space-sm)',
              border: `1.5px solid ${factionCssVar(task.metatask_faction_slug, 'border')}`,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              // na → rainbow frame (overrides the faction border below); real
              // faction → solid hue + on-fill ink, keeping its 1.5px border.
              ...factionFill(task.metatask_faction_slug, 'pill'),
            }}
          >
            META
          </span>
          <span
            style={{
              background: factionCssVar(task.metatask_faction_slug, 'light'),
              color: factionCssVar(task.metatask_faction_slug),
              fontFamily: "'Courier Prime', monospace",
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: 'var(--space-xs) var(--space-sm)',
              border: `1px solid ${factionCssVar(task.metatask_faction_slug, 'border')}`,
            }}
          >
            {factionName(task.metatask_faction_slug)}
          </span>
        </div>
      )}
      {showAdminControls && (
        <div
          style={{
            position: 'absolute', bottom: 4, right: 4,
            display: 'flex', gap: 'var(--space-xs)', zIndex: 10,
          }}
        >
          {task.status === 'active' && (
            <AdminStatusButton label="retire" tone="danger" onClick={() => void handleStatusChange('retired')} />
          )}
          {task.status === 'retired' && (
            <AdminStatusButton label="activate" tone="success" onClick={() => void handleStatusChange('active')} />
          )}
          {task.status === 'pending' && (
            <>
              <AdminStatusButton label="activate" tone="success" onClick={() => void handleStatusChange('active')} />
              <AdminStatusButton label="retire" tone="danger" onClick={() => void handleStatusChange('retired')} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function AdminStatusButton({
  label,
  tone,
  onClick,
}: {
  label: string
  tone: 'danger' | 'success'
  onClick: () => void
}) {
  const toneVar = tone === 'danger' ? 'var(--color-danger)' : 'var(--color-success)'
  return (
    <button
      onClick={onClick}
      className="eyebrow"
      style={{
        padding: 'var(--space-xs) var(--space-sm)',
        border: `1px solid color-mix(in srgb, ${toneVar} 30%, transparent)`,
        color: toneVar,
        background: 'var(--color-surface-scrim)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

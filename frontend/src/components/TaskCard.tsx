import type { TaskOut } from '../api/tasks'
import { useAuth } from '../auth/AuthContext'
import { useAdminMode } from '../auth/AdminModeContext'
import { updateTaskStatus } from '../api/admin'
import TaskCardUA from './cards/TaskCardUA'
import TaskCardWow from './cards/TaskCardWow'
import TaskCardSNIDE from './cards/TaskCardSNIDE'
import TaskCardEphemerists from './cards/TaskCardEphemerists'
import TaskCardSingularity from './cards/TaskCardSingularity'
import TaskCardEverymen from './cards/TaskCardEverymen'
import AlbescentTaskCard from './cards/AlbescentTaskCard'
import { factionCssVar, factionName } from '../utils/factions'
import { pickVariant } from '../utils/factionDispatch'
import type { ComponentType } from 'react'

export interface CardProps {
  task: TaskOut
  displayPoints: number
  onSignup?: (id: number) => void
}

/** Style Guide §6 — one card archetype per faction. */
export const CARD_COMPONENTS: Record<string, ComponentType<CardProps>> = {
  ua: TaskCardUA,
  everymen: TaskCardEverymen,
  wow: TaskCardWow,
  snide: TaskCardSNIDE,
  ephemerists: TaskCardEphemerists,
  singularity: TaskCardSingularity,
  // First-class Albescent identity (#232 slice 1). The explicit entry beats the
  // albescent→ua alias in pickVariant, so it renders immediately.
  albescent: AlbescentTaskCard,
}

export const DEFAULT_CARD = TaskCardUA

export default function TaskCard({ task, displayPoints, onSignup }: CardProps) {
  const { user } = useAuth()
  const { adminMode } = useAdminMode()
  const showAdminControls = user?.is_admin && adminMode

  const handleStatusChange = async (newStatus: string) => {
    await updateTaskStatus(task.id, newStatus)
    window.location.reload()
  }

  const Card = pickVariant(CARD_COMPONENTS, task.primary_faction_slug, DEFAULT_CARD)
  const isMetatask = task.task_type === 'metatask'
  return (
    <div style={{ position: 'relative' }}>
      <Card task={task} displayPoints={displayPoints} onSignup={onSignup} />
      {isMetatask && (
        <div
          style={{
            position: 'absolute',
            top: -6,
            left: -6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 2,
            zIndex: 5,
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              background: factionCssVar(task.metatask_faction_slug),
              color: 'var(--color-text-on-accent)',
              fontFamily: "'Courier Prime', monospace",
              fontSize: 8,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              padding: '2px 8px',
              border: `1.5px solid ${factionCssVar(task.metatask_faction_slug, 'border')}`,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            META
          </span>
          <span
            style={{
              background: factionCssVar(task.metatask_faction_slug, 'light'),
              color: factionCssVar(task.metatask_faction_slug),
              fontFamily: "'Courier Prime', monospace",
              fontSize: 7,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: '1px 6px',
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
            display: 'flex', gap: 3, zIndex: 10,
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
        fontSize: 7, padding: '1px 5px',
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

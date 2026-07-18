import type { TaskOut } from '../api/tasks'
import { useAuth } from '../auth/AuthContext'
import { useAdminMode } from '../auth/AdminModeContext'
import { updateTaskStatus } from '../api/admin'
import UaTaskCard from './cards/UaTaskCard'
import WowTaskCard from './cards/WowTaskCard'
import SnideTaskCard from './cards/SnideTaskCard'
import EphemeristsTaskCard from './cards/EphemeristsTaskCard'
import SingularityTaskCard from './cards/SingularityTaskCard'
import EverymenTaskCard from './cards/EverymenTaskCard'
import AlbescentTaskCard from './cards/AlbescentTaskCard'
import DefaultTaskCard from './cards/DefaultTaskCard'
import { factionCssVar, factionFill, factionName } from '../utils/factions'
import { pickVariant } from '../utils/factionDispatch'
import type { ComponentType } from 'react'

export interface CardProps {
  task: TaskOut
  displayPoints: number
  onSignup?: (id: number) => void
}

/** Style Guide §6 — one card archetype per faction. */
export const CARD_COMPONENTS: Record<string, ComponentType<CardProps>> = {
  ua: UaTaskCard,
  everymen: EverymenTaskCard,
  wow: WowTaskCard,
  snide: SnideTaskCard,
  ephemerists: EphemeristsTaskCard,
  singularity: SingularityTaskCard,
  // First-class Albescent identity (#232 slice 1). The explicit entry beats the
  // albescent→ua alias in pickVariant, so it renders immediately.
  albescent: AlbescentTaskCard,
}

// `na` / unaffiliated + any faction without a bespoke card → the spectrum
// default skin (#418). No longer borrows UA's costume.
export const DEFAULT_CARD = DefaultTaskCard

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
              fontFamily: "'Courier Prime', monospace",
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              padding: '2px 8px',
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
        padding: '1px 5px',
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

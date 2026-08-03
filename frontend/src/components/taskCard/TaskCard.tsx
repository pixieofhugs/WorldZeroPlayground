import { useState } from 'react'
import type { TaskOut } from '../../api/tasks'
// Type-only, so the admin chunk stays out of every visitor's waterfall (#1141);
// the value import below is still dynamic.
import type { AdminTaskStatus } from '../../api/admin'
import { useAuth } from '../../auth/AuthContext'
import { useAdminMode } from '../../auth/AdminModeContext'
import DefaultTaskCard from './DefaultTaskCard'
import { factionCssVar, factionFill, factionName } from '../../utils/factions'
import { pickVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'

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

/**
 * Which task this card draws: the moderator's echo of their own last status
 * change, while it is still about THIS task, else the prop the list handed down
 * (#1524).
 *
 * The id check matters because a card is not always remounted when its prop
 * moves — an echo must never be shown over a different task that happens to
 * land in the same slot.
 */
export function displayedTask(task: TaskOut, moderated: TaskOut | null): TaskOut {
  return moderated !== null && moderated.id === task.id ? moderated : task
}

export default function TaskCard({
  task,
  basePoints,
  multiplier = 1,
  inProgressCount,
  onSignup,
}: TaskCardProps) {
  const { user } = useAuth()
  const { adminMode } = useAdminMode()
  const showAdminControls = user?.is_admin && adminMode

  /**
   * The write's own answer, kept so the card can redraw itself. This used to be
   * `window.location.reload()`: a whole document thrown away to reflect one
   * field, taking the scroll position, any in-flight request and every cached
   * fetch on the surface with it.
   *
   * ponytail: the echo is card-local, so a LIST filtered by status keeps showing
   * a task the filter no longer matches until the next fetch — which is also the
   * moderator's undo affordance, since the opposite control is right there. If a
   * surface ever needs the row to leave on the spot, the upgrade is an
   * `onStatusChanged?: (task: TaskOut) => void` prop lifting this to the list;
   * no caller wants that today.
   */
  const [moderated, setModerated] = useState<TaskOut | null>(null)
  const shown = displayedTask(task, moderated)
  // Caller's value wins; otherwise read it off the SHOWN task, so the write's
  // own answer refreshes it the way the reload used to. `in_progress_count` is
  // optional on TaskOut so pre-#1021 fixtures stay valid; a live backend always
  // sends it (int, default 0).
  const shownInProgressCount = inProgressCount ?? shown.in_progress_count ?? 0

  // `api/admin` is loaded here rather than at module scope (#1141): a task card
  // renders for every visitor, and a static import put the admin chunk in every
  // logged-out `/tasks` waterfall for a control only a moderator can reach.
  const handleStatusChange = async (newStatus: AdminTaskStatus) => {
    const { updateTaskStatus } = await import('../../api/admin')
    setModerated(await updateTaskStatus(task.id, newStatus))
  }

  const Card = pickVariant(surfaceMap('taskCard'), shown.primary_faction_slug, DEFAULT_CARD)
  const isMetatask = shown.task_type === 'metatask'
  return (
    <div style={{ position: 'relative' }}>
      <Card
        task={shown}
        basePoints={basePoints}
        multiplier={multiplier}
        inProgressCount={shownInProgressCount}
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
              border: `1.5px solid ${factionCssVar(shown.metatask_faction_slug, 'border')}`,
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              // na → rainbow frame (overrides the faction border below); real
              // faction → solid hue + on-fill ink, keeping its 1.5px border.
              ...factionFill(shown.metatask_faction_slug, 'pill'),
            }}
          >
            META
          </span>
          <span
            style={{
              background: factionCssVar(shown.metatask_faction_slug, 'light'),
              color: factionCssVar(shown.metatask_faction_slug),
              fontFamily: "'Courier Prime', monospace",
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: 'var(--space-xs) var(--space-sm)',
              border: `1px solid ${factionCssVar(shown.metatask_faction_slug, 'border')}`,
            }}
          >
            {factionName(shown.metatask_faction_slug)}
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
          {shown.status ==='active' && (
            <AdminStatusButton label="retire" tone="danger" onClick={() => void handleStatusChange('retired')} />
          )}
          {shown.status ==='retired' && (
            <AdminStatusButton label="activate" tone="success" onClick={() => void handleStatusChange('active')} />
          )}
          {shown.status ==='pending' && (
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

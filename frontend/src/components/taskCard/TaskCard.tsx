import { useState } from 'react'
import type { TaskOut } from '../../api/tasks'
// Type-only: the admin chunk stays out of every visitor's waterfall (#1141).
import type { AdminTaskStatus } from '../../api/admin'
import { useAuth } from '../../auth/AuthContext'
import { useAdminMode } from '../../auth/AdminModeContext'
import StartHereMark from '../StartHereMark'
import { factionCssVar, factionFill, factionName } from '../../utils/factions'
import { resolveVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'

/**
 * The contract every faction task-card skin is built against (ADR-0055).
 *
 * THE TITLE IS AN `<h2>` (#1950): one level under the page's `<h1>`, enforced by
 * `cardHeadingOutline.test.tsx`. No `headingLevel` prop (#1817).
 *
 * Points arrive UNMULTIPLIED; a `×multiplier` badge renders only when
 * `isNeutralMultiplier(multiplier)` is false.
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

/** Derived props are optional here, defaulted once, so the skin contract stays total. */
type TaskCardProps =
  Omit<CardProps, 'multiplier' | 'inProgressCount'>
  & Partial<Pick<CardProps, 'multiplier' | 'inProgressCount'>>

/**
 * The moderator's status-change echo while it is about THIS task, else the prop
 * (#1524). The id check matters: a card is not always remounted when its prop moves.
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
   * The write's own answer, so the card redraws itself without a page reload.
   *
   * ponytail: card-local, so a status-filtered LIST keeps a no-longer-matching
   * task until the next fetch (also the undo affordance). Upgrade: an
   * `onStatusChanged` prop lifting this to the list.
   */
  const [moderated, setModerated] = useState<TaskOut | null>(null)
  const shown = displayedTask(task, moderated)
  // Read off the SHOWN task so the write's answer refreshes it.
  const shownInProgressCount = inProgressCount ?? shown.in_progress_count

  // Dynamic import keeps the admin chunk out of every visitor's waterfall (#1141).
  const handleStatusChange = async (newStatus: AdminTaskStatus) => {
    const { updateTaskStatus } = await import('../../api/admin')
    setModerated(await updateTaskStatus(task.id, newStatus))
  }

  const Card = resolveVariant(surfaceMap('taskCard'), shown.primary_faction_slug)
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
      {/* On the dispatcher, like META, so no skin can forget it (#1861).
          `start_here` is server-derived. Top RIGHT, clear of META on the left. */}
      {shown.start_here && (
        <div
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            zIndex: 5,
            pointerEvents: 'none',
          }}
        >
          <StartHereMark />
        </div>
      )}
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
              fontFamily: "var(--font-body)",
              fontSize: 'var(--text-md)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              padding: 'var(--space-xs) var(--space-sm)',
              border: `1.5px solid ${factionCssVar(shown.metatask_faction_slug, 'border')}`,
              // na → rainbow frame (overrides the border); real faction →
              // solid hue + on-fill ink. Opaque either way: no text shadow needed.
              ...factionFill(shown.metatask_faction_slug, 'pill'),
            }}
          >
            META
          </span>
          <span
            style={{
              background: factionCssVar(shown.metatask_faction_slug, 'light'),
              // The tint keeps the hue, the type does not (#2077): the bare hue
              // fails AA in light; `-card-text` clears ≥9.83:1. Not
              // `-card-muted`: 4.02:1 under this wash (WOW).
              color: factionCssVar(shown.metatask_faction_slug, 'card-text'),
              fontFamily: "var(--font-body)",
              fontSize: 'var(--text-md)',
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
      {/* Moderation is a strip in flow under the card, never an overlay: an
          overlay meets the centred sign-up button at narrow widths (#2049).
          The wrapper takes NO inline `display` — `.task-card-row > *` makes it
          a column so cards stretch (#1945). */}
      {showAdminControls && (
        <div
          style={{
            display: 'flex', justifyContent: 'flex-end',
            gap: 'var(--space-xs)', marginTop: 'var(--space-xs)',
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
      className="label-caption"
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

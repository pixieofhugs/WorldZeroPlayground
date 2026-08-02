import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { CurrentUser } from '../../api/auth'

/**
 * The one entry point into `/propose-task` (#1556).
 *
 * WHY IT LIVES ON /tasks
 * ----------------------
 * It used to hang off the bottom of the desktop rail and off each of the eight
 * mobile Field Desk skins — an authoring control on a status surface. The
 * desktop redesign's handoff note moves it here: *"the sidebar is status and
 * requests, not an authoring entry point"*, and `/tasks` is where the player is
 * already reading the bank they would be adding to. Both home screens lose it;
 * this is its only home.
 *
 * WHY THE GATE IS HERE AND NOT AT THE CALL SITES
 * ----------------------------------------------
 * `can_propose_task` is a server answer, and the move must not change WHO gets
 * an entry point — only where it is. Putting the check inside the component
 * means neither form factor can forget it, which is the failure the rail
 * actually shipped: the sidebar's button was ungated and offered the route to
 * every signed-in account, including the ones `POST /tasks` would refuse. The
 * eight Field Desk skins were the ones getting it right.
 *
 * Renders NOTHING when the viewer cannot propose — hide an unusable control,
 * never draw it disabled.
 */
export default function ProposeTaskLink({
  user,
  fullWidth = false,
}: {
  user: CurrentUser | null
  /**
   * Stretch to the container. The phone wants a thumb-width target across the
   * column (#494: the mobile path stacks single-column); the desktop wants a
   * pill sitting beside the page title.
   */
  fullWidth?: boolean
}) {
  const { t } = useTranslation('common')

  if (!user?.can_propose_task) return null

  return (
    <Link
      to="/propose-task"
      className={`font-display flex items-center justify-center gap-2.5 shrink-0 hover:opacity-90 ${
        fullWidth ? 'w-full' : ''
      }`}
      style={{
        boxSizing: 'border-box',
        padding: 'var(--space-md) var(--space-lg)',
        borderRadius: 11,
        fontSize: 'var(--text-md)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--color-bg-page)',
        background: 'var(--color-text-primary)',
        border: '1px solid var(--color-text-primary)',
        textDecoration: 'none',
      }}
    >
      <span style={{ fontSize: 'var(--text-md)', lineHeight: 1 }}>+</span>
      <span>{t('actions.proposeTask')}</span>
    </Link>
  )
}

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { CurrentUser } from '../../api/auth'

/**
 * The one entry point into `/propose-task` (#1556); lives on /tasks because the
 * sidebar is status, not authoring. The `can_propose_task` gate is inside the
 * component so no call site can forget it. Renders nothing when unusable.
 */
export default function ProposeTaskLink({ user }: { user: CurrentUser | null }) {
  const { t } = useTranslation('common')

  if (!user?.can_propose_task) return null

  return (
    <Link
      to="/propose-task"
      className="font-display flex items-center justify-center gap-2.5 shrink-0 hover:opacity-90 w-full md:w-auto mb-6"
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

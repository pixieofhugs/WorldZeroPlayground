import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAdminCounts, type AdminCounts } from '../../pages/admin/useAdminCounts'

type Badge = 'urgent' | 'quiet'
type ItemKey = 'reports' | 'messages' | 'proposals' | 'praxis' | 'tasks' | 'people' | 'modLog' | 'factionCopy' | 'levelCopy'
type GroupKey = 'needs' | 'run' | 'words'
interface Item {
  key: ItemKey
  to: string
  count?: keyof AdminCounts
  badge?: Badge
  tally?: keyof AdminCounts
}

const GROUPS: { key: GroupKey; items: Item[] }[] = [
  {
    key: 'needs',
    items: [
      { key: 'reports', to: '/admin/reports', count: 'reports', badge: 'urgent' },
      { key: 'messages', to: '/admin/messages', count: 'messages', badge: 'quiet' },
      { key: 'proposals', to: '/admin/proposals', count: 'proposals', badge: 'quiet' },
    ],
  },
  {
    key: 'run',
    items: [
      { key: 'praxis', to: '/admin/praxis', tally: 'praxis' },
      { key: 'tasks', to: '/admin/tasks', tally: 'tasks' },
      { key: 'people', to: '/admin/people', tally: 'people' },
      { key: 'modLog', to: '/admin/mod-log' },
    ],
  },
  {
    key: 'words',
    items: [
      { key: 'factionCopy', to: '/admin/copy' },
      { key: 'levelCopy', to: '/admin/level-ups' },
    ],
  },
]

/** The console's left rail. `onNavigate` lets the phone Menu close itself. */
export default function AdminRail({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const { t } = useTranslation('admin')
  const counts = useAdminCounts(useLocation().pathname)

  return (
    <nav id="admin-rail" className="adm-rail" aria-label={t('console.rail.label')} data-open={open} onClick={onNavigate}>
      <Link to="/" className="adm-back">
        {t('console.rail.back')}
      </Link>
      <div className="adm-brand">
        <span className="adm-word">{t('console.rail.brand')}</span>
        <span className="adm-spectrum" aria-hidden="true" />
        <span className="card-meta">{t('console.rail.sub')}</span>
      </div>
      {GROUPS.map((group) => (
        <div key={group.key}>
          <p className="adm-grp">{t(`console.rail.groups.${group.key}`)}</p>
          {group.items.map((item) => {
            const count = item.count ? counts[item.count] : null
            const tally = item.tally ? counts[item.tally] : null
            return (
              <NavLink key={item.key} to={item.to} className="adm-nav">
                <span>{t(`console.rail.items.${item.key}`)}</span>
                {count ? (
                  <span
                    className={item.badge === 'quiet' ? 'adm-count adm-count-q' : 'adm-count'}
                    aria-label={t('console.rail.countLabel', { count })}
                  >
                    {count}
                  </span>
                ) : null}
                {tally !== null && <span className="adm-tally">{tally}</span>}
              </NavLink>
            )
          })}
        </div>
      ))}
      <div className="adm-fill" />
      <hr className="adm-rule" />
      <p className="adm-grp adm-grp-danger">{t('console.rail.groups.danger')}</p>
      <NavLink to="/admin/era" className="adm-nav adm-nav-danger">
        <span>{t('console.rail.items.era')}</span>
      </NavLink>
    </nav>
  )
}

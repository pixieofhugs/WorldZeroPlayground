import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import PageTitle from '../components/ui/PageTitle'
import ModerationTab from './admin/ModerationTab'
import TasksTab from './admin/TasksTab'
import AccountsTab from './admin/AccountsTab'
import OverviewTab from './admin/OverviewTab'

type Tab = 'moderation' | 'tasks' | 'accounts' | 'overview'

const TABS: Tab[] = ['moderation', 'tasks', 'accounts', 'overview']

function getInitialTab(): Tab {
  const hash = window.location.hash.replace('#', '')
  if (TABS.some((t) => t === hash)) return hash as Tab
  return 'moderation'
}

export default function Admin() {
  const { t } = useTranslation('admin')
  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab)

  const switchTab = (tab: Tab) => {
    setActiveTab(tab)
    window.location.hash = tab
  }

  return (
    <div className="py-8">
      <PageTitle title={t('title')} />

      {/* Tab bar */}
      <div
        className="flex gap-6 mb-6"
        style={{ borderBottom: '2px solid var(--color-border)' }}
      >
        {TABS.map((key) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className="label-heading pb-2 transition-colors"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: activeTab === key ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
              borderBottom: activeTab === key ? '2px solid var(--color-text-primary)' : '2px solid transparent',
              // eslint-disable-next-line local/no-raw-style-values -- ornament: the negation of the 2px border above it, so the active tab's underline lands ON the bar's rule rather than under it. The offset IS the drawn stroke (§4a ring-inset shape); any rung breaks the seam.
              marginBottom: -2,
              fontFamily: "'Courier Prime', monospace",
              fontSize: 'var(--text-base)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'moderation' && <ModerationTab />}
      {activeTab === 'tasks' && <TasksTab />}
      {activeTab === 'accounts' && <AccountsTab />}
      {activeTab === 'overview' && <OverviewTab />}
    </div>
  )
}

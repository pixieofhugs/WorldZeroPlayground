import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ALBESCENT_FACTION_SLUG, FACTION_RAINBOW_ORDER, factionName } from '../utils/factions'
import { FactionRow } from './characterPaths/editCharacterSlots'
import PageTitle from '../components/ui/PageTitle'
import ModerationTab from './admin/ModerationTab'
import TasksTab from './admin/TasksTab'
import AccountsTab from './admin/AccountsTab'
import OverviewTab from './admin/OverviewTab'
import EraTab from './admin/EraTab'

type Tab = 'moderation' | 'tasks' | 'accounts' | 'overview' | 'era'

// Era goes last, and stays last: it is the one tab whose button cannot be
// undone, so it does not sit next to the ones a mod clicks all day (#827).
const TABS: Tab[] = ['moderation', 'tasks', 'accounts', 'overview', 'era']

function getInitialTab(): Tab {
  const hash = window.location.hash.replace('#', '')
  if (TABS.some((t) => t === hash)) return hash as Tab
  return 'moderation'
}

/** Every faction with a copy sheet, in the order the pickers list them. */
const COPY_SHEET_SLUGS = [...FACTION_RAINBOW_ORDER, ALBESCENT_FACTION_SLUG]

/**
 * Which faction's copy sheet to open. The picker is Edit Character's own
 * `FactionRow` — the same toggles Create Character draws — fed a model that
 * only remembers the pick: there is no move to confirm here.
 */
function CopySheetPicker() {
  const { t } = useTranslation('admin')
  const [picked, setPicked] = useState(COPY_SHEET_SLUGS[0])
  return (
    <div className="flex flex-col gap-3 mb-6" style={{ maxWidth: '24rem' }}>
      <p className="card-meta">{t('copySheet.pickerHint')}</p>
      <FactionRow
        slug={picked}
        picker={{
          current: COPY_SHEET_SLUGS[0],
          picked,
          offered: COPY_SHEET_SLUGS.slice(1),
          pick: setPicked,
          touched: picked !== COPY_SHEET_SLUGS[0],
          confirming: false,
          cancelConfirm: () => {},
          confirm: async () => {},
          saving: false,
        }}
      />
      <Link to={`/admin/copy/${picked}`} className="btn-outline text-xs self-start">
        {t('copySheet.button', { name: factionName(picked) })}
      </Link>
    </div>
  )
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

      <CopySheetPicker />

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
              fontFamily: "var(--font-body)",
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
      {activeTab === 'era' && <EraTab />}
    </div>
  )
}

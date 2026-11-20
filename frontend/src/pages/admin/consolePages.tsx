import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PageTitle from '../../components/ui/PageTitle'
import EraTab from './EraTab'
import ReportsTab from './ReportsTab'
import MessagesTab from './MessagesTab'

export { default as PraxisPage } from './PraxisTab'
export { default as PeoplePage } from './PeopleTab'
export { default as TasksPage } from './TasksTab'
export { default as ModLogPage } from './ModLogTab'
export { default as CopySheetIndexPage } from './CopySheetIndex'

export { MessagesTab as MessagesPage }

export function ReportsPage() {
  const navigate = useNavigate()
  return <ReportsTab onViewAccount={(search) => navigate(`/admin/people?search=${encodeURIComponent(search)}`)} />
}

export function EraPage() {
  const { t } = useTranslation('admin')
  return (
    <>
      <PageTitle title={t('era.heading')} />
      <EraTab />
    </>
  )
}

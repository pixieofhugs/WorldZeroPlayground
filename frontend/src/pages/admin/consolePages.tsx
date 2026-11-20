import { useNavigate, useSearchParams } from 'react-router-dom'
import ReportsTab from './ReportsTab'
import MessagesTab from './MessagesTab'
import AccountsTab from './AccountsTab'

export { default as PraxisPage } from './PraxisTab'
export { default as TasksPage } from './TasksTab'
export { default as ModLogPage } from './ModLogTab'
export { default as EraPage } from './EraTab'
export { default as CopySheetIndexPage } from './CopySheetIndex'

export { MessagesTab as MessagesPage }

export function ReportsPage() {
  const navigate = useNavigate()
  return <ReportsTab onViewAccount={(search) => navigate(`/admin/people?search=${encodeURIComponent(search)}`)} />
}

export function PeoplePage() {
  const search = useSearchParams()[0].get('search') ?? ''
  return <AccountsTab key={search} initialSearch={search} />
}

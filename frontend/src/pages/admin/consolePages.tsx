import { useNavigate } from 'react-router-dom'
import ReportsTab from './ReportsTab'
import MessagesTab from './MessagesTab'

export { default as PraxisPage } from './PraxisTab'
export { default as PeoplePage } from './PeopleTab'
export { default as TasksPage } from './TasksTab'
export { default as EraPage } from './EraTab'
export { default as CopySheetIndexPage } from './CopySheetIndex'

export { MessagesTab as MessagesPage }

export function ReportsPage() {
  const navigate = useNavigate()
  return <ReportsTab onViewAccount={(search) => navigate(`/admin/people?search=${encodeURIComponent(search)}`)} />
}

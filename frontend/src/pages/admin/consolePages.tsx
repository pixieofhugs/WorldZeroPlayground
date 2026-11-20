import { useNavigate } from 'react-router-dom'
import ModerationTab from './ModerationTab'

export { default as PraxisPage } from './PraxisTab'
export { default as PeoplePage } from './PeopleTab'
export { default as TasksPage } from './TasksTab'
export { default as EraPage } from './EraTab'
export { default as CopySheetIndexPage } from './CopySheetIndex'

/** Reports and Messages both mount the one tab until #3670 splits it. */
export function ModerationPage() {
  const navigate = useNavigate()
  return <ModerationTab onViewAccount={(search) => navigate(`/admin/people?search=${encodeURIComponent(search)}`)} />
}

import { useNavigate, useSearchParams } from 'react-router-dom'
import ModerationTab from './ModerationTab'
import AccountsTab from './AccountsTab'

export { default as PraxisPage } from './PraxisTab'
export { default as TasksPage } from './TasksTab'
export { default as EraPage } from './EraTab'
export { default as CopySheetIndexPage } from './CopySheetIndex'

/** Reports and Messages both mount the one tab until #3670 splits it. */
export function ModerationPage() {
  const navigate = useNavigate()
  return <ModerationTab onViewAccount={(search) => navigate(`/admin/people?search=${encodeURIComponent(search)}`)} />
}

export function PeoplePage() {
  const search = useSearchParams()[0].get('search') ?? ''
  return <AccountsTab key={search} initialSearch={search} />
}

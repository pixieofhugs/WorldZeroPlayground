// DefaultFieldDesk (na) mobile home — the account's carried life at a glance:
// character header, stat tiles, in-progress quests, primary actions. The skin
// every faction falls through to until it registers a bespoke home.
import { DefaultFieldDesk } from 'worldzero-frontend'
import { fieldDeskState } from './_state'

/** A mid-level unaffiliated life with two active quests. */
export function Home() {
  return <DefaultFieldDesk state={fieldDeskState('na')} />
}

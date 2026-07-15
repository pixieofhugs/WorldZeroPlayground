// WowFieldDesk mobile home — Warriors of Whimsy scrapbook-window idiom on a
// phone: the same carried-life content slots as the Default home, dressed as
// taped pink windows on a rose board. Reuses the shared FieldDesk state.
import { WowFieldDesk } from 'worldzero-frontend'
import { fieldDeskState } from './_state'

/** The Whimsy home for a WOW life — scrapbook windows, sparkle-titled bars. */
export function Home() {
  return <WowFieldDesk state={fieldDeskState('wow')} />
}

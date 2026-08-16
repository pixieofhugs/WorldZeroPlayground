// The Players page on the phone — podium, faction race, roster (#1855).
import { MobilePlayers } from 'worldzero-frontend'
import { playersProps } from './_state'

export function Roster() {
  return <MobilePlayers {...playersProps} />
}

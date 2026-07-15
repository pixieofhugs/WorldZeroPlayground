// DefaultPlayers mobile — the players directory across factions.
import { DefaultPlayers } from 'worldzero-frontend'
import { playersProps } from './_state'

export function Roster() {
  return <DefaultPlayers {...playersProps} />
}

// DesktopPlayers — the Players page on the desktop (#1855): podium, faction
// race, roster. The phone twin (`MobilePlayers`) has had a card since #1855;
// this is the desktop skin's, and it takes the same fixture so the two cards
// are a true form-factor comparison rather than two different datasets.
//
// Pure presentational skin — it takes the whole page as controlled props and
// fetches nothing, so this card is the real surface, not an empty state.
//
// ONE CELL: `scoreMode` is the one prop that varies the view, and it is a
// control the card renders — a second cell would be the same page with one
// segment pressed.
import { DesktopPlayers } from 'worldzero-frontend'
import { playersProps } from './_state'

export function Roster() {
  return <DesktopPlayers {...playersProps} />
}

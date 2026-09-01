// FactionsDirectoryView — the PURE skin behind DefaultFactionsDirectory: the
// phone factions directory, title + stripe legend + a vertical stack of the
// bespoke FactionSelectCard archetypes (#732/#743).
//
// WHY THIS CARD SHOWS THE UNAFFILIATED STATE, and its container's card does not.
// `unaffiliated` is derived in the container from `useAuth()`, and the preview
// provider's mock character is sworn to UA — so DefaultFactionsDirectory's card
// can only ever render the affiliated view. `unaffiliated` is a PROP here, which
// makes this the one place the banner is reachable. Rendering the affiliated
// case again would just be the sibling card twice.
//
// The stripe bar is a legend, one hard-edged span per rendered row in the same
// rainbow order, so stripe N is card N. Albescent is absent from the fixture,
// which is correct — it is hidden until revealed (ADR-0027).
//
// ONE CELL: `cardMode: single` at the phone viewport renders one export, and the
// banner state is the one worth spending it on.
import { FactionsDirectoryView } from 'worldzero-frontend'
import { noop } from './_fixtures'
import { factionsDirectoryState } from './_state'

export function Unaffiliated() {
  // `error` is deliberately not spread from the fixture: the hook types it as
  // `unknown` (the container narrows it through `extractError`), while this pure
  // skin takes an already-resolved `string | null`. The loaded state is null.
  const { factions, factionPage, loading } = factionsDirectoryState()
  return (
    <FactionsDirectoryView
      factions={factions}
      factionPage={factionPage}
      loading={loading}
      error={null}
      unaffiliated
      onVisit={noop}
    />
  )
}

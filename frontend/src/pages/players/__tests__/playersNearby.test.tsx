/**
 * The Nearby option and the airport code on its rows (#3247).
 *
 * SEAM: the markup `PlayersFilterBar` emits — Nearby is offered only when the
 * server recognised the viewer's airport (`showNearby`).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'

vi.mock('../../../hooks/useFactions', () => ({ useFactions: () => [] }))

import PlayersFilterBar from '../PlayersFilterBar'
import { PLAYERS_FILTERS_DEFAULT } from '../playersData'

function bar(showNearby: boolean, showRelationshipRail = true): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <PlayersFilterBar
        filters={PLAYERS_FILTERS_DEFAULT}
        onChange={() => {}}
        showRelationshipRail={showRelationshipRail}
        showNearby={showNearby}
      />
    </MemoryRouter>,
  )
}

describe('Nearby rail option', () => {
  it('is offered when the viewer has a recognised airport', () => {
    expect(bar(true)).toContain('Nearby')
  })

  it('is hidden when the server answered null', () => {
    expect(bar(false)).not.toContain('Nearby')
    expect(bar(false)).toContain('Friends')
  })
})

/**
 * A published praxis offers its owner ONE control, unsubmit, and no `/edit`
 * link (#2136): every surface `/edit` reaches for a published praxis is
 * read-only. Unsubmit → composer is the way to edit.
 */
import { describe, it, expect } from 'vitest'
import { PraxisOwnerActions } from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'
import type { PraxisOut, PraxisMemberOut } from '../../../api/praxis'
import type { CurrentUser } from '../../../api/auth'
import type { DuelDetailOut, DuelStatus } from '../../../api/duel'
import { aDuel, aDuelSide, aMember } from '../../../test/fixtures'
import { anOwnedPraxis, anOwner, aPraxisDetailState, markup as render } from '../../../test/praxisDetail'

const EDIT_HREF = 'href="/praxis/1/edit"'

const member = (characterId: number, name: string): PraxisMemberOut =>
  aMember({ id: characterId * 10, character_id: characterId, character_display_name: name })

// All submitted: ADR-0062 means nothing else reaches the page.
const praxis = (overrides: Partial<PraxisOut> = {}): PraxisOut =>
  anOwnedPraxis({ created_by_faction_slug: 'wow', ...overrides })


const duel = (status: DuelStatus): DuelDetailOut =>
  aDuel({
    status,
    challenger: aDuelSide({ character_id: 1, faction_slug: 'wow' }),
    opponent: aDuelSide({
      praxis_id: 2,
      character_id: 2,
      display_name: 'Rax',
      faction_slug: 'wow',
    }),
  })

const user = (): CurrentUser => anOwner({ faction_slug: 'wow' })


const state = (overrides: Partial<PraxisDetailState>): PraxisDetailState =>
  aPraxisDetailState({ praxis: praxis(), isOwner: true, user: user(), ...overrides })

const COLLAB_MEMBERS = [member(1, 'Ada'), member(2, 'Beth')]

describe('no owner state offers a link to /edit (#2136)', () => {
  it('a submitted solo praxis', () => {
    const { html } = render(<PraxisOwnerActions state={state({})} />)
    expect(html).not.toContain(EDIT_HREF)
  })

  it('a one-member collab', () => {
    const { html } = render(
      <PraxisOwnerActions state={state({ praxis: praxis({ type: 'collab' }) })} />,
    )
    expect(html).not.toContain(EDIT_HREF)
  })

  it('a declined challenge', () => {
    const { html } = render(
      <PraxisOwnerActions
        state={state({ praxis: praxis({ duel_id: 5 }), duel: duel('declined') })}
      />,
    )
    expect(html).not.toContain(EDIT_HREF)
  })

  // Phases where `/edit` draws a read-only surface (#1397 kept the link here).
  it('a published collab, which used to reach the completed reading', () => {
    const { html } = render(
      <PraxisOwnerActions
        state={state({ praxis: praxis({ type: 'collab', members: COLLAB_MEMBERS }) })}
      />,
    )
    expect(html).not.toContain(EDIT_HREF)
  })

  it.each<DuelStatus>(['pending', 'active'])(
    'a duel side at %s, which used to reach the waiting surface',
    (status) => {
      const { html } = render(
        <PraxisOwnerActions
          state={state({ praxis: praxis({ duel_id: 5 }), duel: duel(status) })}
        />,
      )
      expect(html).not.toContain(EDIT_HREF)
    },
  )

  it('a settled duel side, which used to reach the completed reading too', () => {
    const { html } = render(
      <PraxisOwnerActions
        state={state({ praxis: praxis({ duel_id: 5 }), duel: duel('settled') })}
      />,
    )
    expect(html).not.toContain(EDIT_HREF)
  })

  it('a moderated praxis, which used to reach its own locked composer', () => {
    const { html } = render(
      <PraxisOwnerActions
        state={state({ praxis: praxis({ moderation_status: 'failed' }) })}
      />,
    )
    expect(html).not.toContain(EDIT_HREF)
  })

  it('and the copy goes with the href', () => {
    const { text } = render(
      <PraxisOwnerActions
        state={state({ praxis: praxis({ type: 'collab', members: COLLAB_MEMBERS }) })}
      />,
    )
    expect(text).not.toContain('edit this praxis')
  })
})

describe('the one control that remains (#2136)', () => {
  it('is the quiet unsubmit, on a published solo', () => {
    const { text } = render(<PraxisOwnerActions state={state({})} />)
    expect(text.toLowerCase()).toContain('unsubmit')
  })

  it('and on a published collab, where the link used to sit beside it', () => {
    const { text } = render(
      <PraxisOwnerActions
        state={state({ praxis: praxis({ type: 'collab', members: COLLAB_MEMBERS }) })}
      />,
    )
    expect(text.toLowerCase()).toContain('unsubmit')
  })
})

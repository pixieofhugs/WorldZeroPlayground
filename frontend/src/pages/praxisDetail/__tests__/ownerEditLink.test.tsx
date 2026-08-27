/**
 * A published praxis offers its owner ONE control, and it is not a link to
 * `/edit` (#2136).
 *
 * #1397 hid the link on the `handoff` phase only, so the pair survived wherever
 * `/edit` still drew something: a published collab and a settled duel reach
 * `completed`, a live duel side reaches `waiting`, a moderated praxis reaches
 * the locked composer. Every one of those surfaces is READ-ONLY, so "edit this
 * praxis" named an outcome it could not deliver, beside a control that could.
 * The ruling deleted the link rather than re-gating it: "There is no reason for
 * the player to go back to the edit page unless they are going to edit. One
 * button only."
 *
 * The seam under test is `PraxisOwnerActions`: given an owner's state, is a
 * `/praxis/:id/edit` href anywhere in the markup? The phases named below are
 * the ones #1397 deliberately KEPT — they are exactly what this change removes,
 * so they are the ones worth spelling out.
 *
 * The way to edit a published praxis is the surviving control: unsubmit →
 * confirm → `PraxisDetail` redirects the now-`in_progress` praxis straight into
 * the composer. So the unsubmit trigger must survive everywhere the link went.
 */
import { describe, it, expect } from 'vitest'
import { PraxisOwnerActions } from '../shared'
import type { PraxisDetailState } from '../usePraxisDetail'
import type { PraxisOut, PraxisMemberOut } from '../../../api/praxis'
import type { CurrentUser } from '../../../api/auth'
import type { DuelDetailOut, DuelStatus } from '../../../api/duel'
import {
  aCharacter,
  aCurrentUser,
  aDuel,
  aDuelSide,
  aMember,
  aPraxis,
} from '../../../test/fixtures'
import { aPraxisDetailState, markup as render } from '../../../test/praxisDetail'

const EDIT_HREF = 'href="/praxis/1/edit"'

const member = (characterId: number, name: string): PraxisMemberOut =>
  aMember({ id: characterId * 10, character_id: characterId, character_display_name: name })

// EVERY case here is submitted: ADR-0062 means nothing else reaches the page.
const praxis = (overrides: Partial<PraxisOut> = {}): PraxisOut =>
  aPraxis({
    task_title: 'Mangrove',
    task_point_value: 30,
    task_level_required: 3,
    title: 'Reforestation',
    body_text: 'Seedlings.',
    submitted_at: '2026-01-02T00:00:00Z',
    created_by_id: 1,
    created_by_faction_slug: 'wow',
    updated_at: '2026-01-02T00:00:00Z',
    members: [member(1, 'Ada')],
    media_items: [],
    score: 0,
    points_from_votes: 0,
    ...overrides,
  })

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

const user = (): CurrentUser =>
  aCurrentUser({ character: aCharacter({ id: 1, faction_slug: 'wow' }) })

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

  // The four below are the phases #1397 kept: `/edit` still draws a real
  // surface for each, and every one of those surfaces is read-only.
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

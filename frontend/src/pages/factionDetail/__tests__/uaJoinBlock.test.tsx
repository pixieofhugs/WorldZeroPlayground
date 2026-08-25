/**
 * UA's join block, in all five membership states (#2660).
 *
 * The seam: `UaFactionBody`'s registry panel, rendered directly. It needs its
 * own test because until #2660 it was DEAD CODE — `resolveMembershipState`
 * short-circuited `slug === "ua"` to "none" before any status branch, so no
 * viewer could reach it and no state below had ever executed in production.
 * Deleting that branch is what makes this panel reachable, and a block that has
 * never run is exactly the one that should not be taken on trust.
 *
 * The copy is `ua.join.*`, which was fully written the whole time. The burn is
 * the shared neutral platform wording (ADR-0057) — that state had no branch at
 * all here and rendered a bare heading over nothing.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so faction copy keys resolve to English text.
import '../../../i18n'
import UaFactionBody from '../archetypes/UaFactionBody'
import type { FactionDetailState, MembershipState } from '../useFactionDetail'

/** The panel's eyebrow — present iff a join block is drawn at all. */
const REGISTRY_HEADING = 'Those practising'
/** A tail of `detail.burned.body` with no apostrophe — SSR escapes those. */
const ERA_NOTICE = 'until the next one begins'

function uaState(state: MembershipState): FactionDetailState {
  return {
    slug: 'ua',
    loading: false,
    faction: { slug: 'ua', status: 'visible' },
    fetchError: null,
    members: [],
    tasks: [],
    recentPraxis: [],
    viewerFactionSlug: null,
    gameFactions: [],
    onSignup: undefined,
    signupMsg: null,
    membership: {
      state,
      currentFactionSlug: null,
      join: async () => {},
      joining: false,
      joinError: null,
    },
  }
}

function render(state: MembershipState): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <UaFactionBody state={uaState(state)} />
    </MemoryRouter>,
  ).replace(/<[^>]*>/g, '')
}

describe('UA draws a join block like any other faction', () => {
  it('hides the whole panel when there is no viewer', () => {
    // "none" is now only ever logged-out / no character, as everywhere else.
    expect(render('none')).not.toContain(REGISTRY_HEADING)
  })

  it('tells a member they practise here', () => {
    const out = render('member')
    expect(out).toContain(REGISTRY_HEADING)
    expect(out).toContain('You practise here')
    // The standing VALUE. `ua.join.memberStanding` interpolates the accent word
    // as `<1>`, and UA alone split the separator out as `{" "}` — which made
    // the whitespace node child 1 and the span child 2, so i18next dropped it
    // and every UA member read a bare "Standing ·". Assert the WHOLE line:
    // `render()` strips tags and the eyebrow above is "Those practising", so
    // `toContain('practising')` passes vacuously against this exact defect.
    expect(out).toContain('Standing · practising')
  })

  it('offers an invited viewer the practice', () => {
    // The state a real UA invitation letter lands the viewer in: UA is not in
    // `_NON_INVITE_FACTION_SLUGS`, so those letters have always been delivered.
    const out = render('eligible')
    expect(out).toContain('Begin the practice')
    expect(out).toContain('Make one true piece a day')
  })

  it('shows the soft gate to a viewer who is not invited yet', () => {
    const out = render('gate')
    expect(out).toContain('Earn your place at the table')
    expect(out).not.toContain(ERA_NOTICE)
  })

  it('shows a burned viewer the closed door, not the soft gate', () => {
    const out = render('burned')
    expect(out).toContain('Closed for this era')
    expect(out).toContain(ERA_NOTICE)
    expect(out, 'the burn is not "keep tasking"').not.toContain(
      'Earn your place at the table',
    )
  })
})

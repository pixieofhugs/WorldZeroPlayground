/**
 * UA's join block in all five membership states (#2660). Copy is `ua.join.*`;
 * the burn uses the shared neutral wording (ADR-0057).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so faction copy keys resolve to English text.
import '../../../i18n'
import UaFactionBody from '../archetypes/UaFactionBody'
import type { FactionDetailState, MembershipState } from '../useFactionDetail'

/** The panel's eyebrow — present iff a join block is drawn at all. */
const REGISTRY_HEADING = 'Your standing in UA'
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
    expect(render('none')).not.toContain(REGISTRY_HEADING)
  })

  it('tells a member they practise here', () => {
    const out = render('member')
    expect(out).toContain(REGISTRY_HEADING)
    expect(out).toContain('I dunno, you&#x27;re here I guess?')
    // Whole line: a stray `{" "}` once shifted the `<1>` child so i18next dropped it.
    expect(out).toContain('Standing · practising')
  })

  it('offers an invited viewer the practice', () => {
    const out = render('eligible')
    expect(out).toContain('Begin the practice')
    expect(out).toContain('Make one true piece a day')
  })

  it('shows the soft gate to a viewer who is not invited yet', () => {
    const out = render('gate')
    expect(out).toContain('Aware of the Art Circle')
    expect(out).not.toContain(ERA_NOTICE)
  })

  it('shows a burned viewer the closed door, not the soft gate', () => {
    const out = render('burned')
    expect(out).toContain('Closed for this era')
    expect(out).toContain(ERA_NOTICE)
    expect(out, 'the burn is not "keep tasking"').not.toContain(
      'Aware of the Art Circle',
    )
  })
})

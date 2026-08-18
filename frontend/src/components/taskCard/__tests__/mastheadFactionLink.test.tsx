/**
 * The masthead goes where it points (#2167).
 *
 * A task card has three regions and three destinations: the body reads the task
 * (`/tasks/:id`), the CTA signs up, and the band — which says nothing but the
 * faction's name — reads the faction (`/factions/:slug`). Only the third was
 * missing: the band named a faction and did nothing when clicked.
 *
 * THE SEAM is `CardMasthead`'s rendered markup, reached through the nine skins
 * that mount it — the same seam `taskCardsV3.test.tsx` works at. The
 * destination is derived inside the shared component from the `slug` it already
 * takes, so this asserts the property once over the table rather than seven
 * times, and a skin that grew a hand-rolled band fails here.
 *
 * WHAT A STATIC RENDER CANNOT SEE: the hover affordance is a pointer handler,
 * and `renderToStaticMarkup` emits no handlers (and this repo has no jsdom), so
 * it is eyeballed rather than asserted. What IS asserted is the half a
 * stylesheet-free hover cannot rescue — that the band does not arrive wearing
 * the user agent's link paint over a faction's own ink.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ComponentType } from 'react'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import type { CardProps } from '../TaskCard'

vi.mock('../../../hooks/useFormFactor', () => ({ useFormFactor: () => 'desktop' }))

// Imported after the mock is registered.
import AlbescentTaskCard from '../AlbescentTaskCard'
import CovenTaskCard from '../CovenTaskCard'
import DefaultTaskCard from '../DefaultTaskCard'
import EphemeristsTaskCard from '../EphemeristsTaskCard'
import EverymenTaskCard from '../EverymenTaskCard'
import SingularityTaskCard from '../SingularityTaskCard'
import SnideTaskCard from '../SnideTaskCard'
import UaTaskCard from '../UaTaskCard'
import WowTaskCard from '../WowTaskCard'
import { aTask } from '../../../test/fixtures'
import { factionName } from '../../../utils/factions'

const TASK = aTask({ description: 'Leave something small where a stranger will find it.' })

interface Skin {
  slug: string
  Card: ComponentType<CardProps>
}

/** The seven bands. */
const MASTHEADED: Skin[] = [
  { slug: 'coven', Card: CovenTaskCard },
  { slug: 'ephemerists', Card: EphemeristsTaskCard },
  { slug: 'everymen', Card: EverymenTaskCard },
  { slug: 'singularity', Card: SingularityTaskCard },
  { slug: 'snide', Card: SnideTaskCard },
  { slug: 'ua', Card: UaTaskCard },
  { slug: 'wow', Card: WowTaskCard },
]

/**
 * The two that mount no band, and must not grow one. ADR-0048 makes that a rule
 * rather than a gap: `AlbescentTaskCard` IS `DefaultTaskCard`, and a band would
 * hand the secret society both a name and a link to `/factions/albescent` —
 * which is an in-world dead end, not a faction page.
 */
const BANDLESS: Skin[] = [
  { slug: 'na', Card: DefaultTaskCard },
  { slug: 'albescent', Card: AlbescentTaskCard },
]

function render({ Card }: Skin): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Card
        task={TASK}
        basePoints={TASK.point_value}
        multiplier={1}
        inProgressCount={TASK.in_progress_count}
        onSignup={() => {}}
      />
    </MemoryRouter>,
  )
}

/** The band's own opening tag, from `<` to `>`. */
function bandTag(html: string, slug: string): string {
  const at = html.indexOf(`data-card-masthead="${slug}"`)
  expect(at, 'the shared band from #2029').toBeGreaterThan(-1)
  return html.slice(html.lastIndexOf('<', at), html.indexOf('>', at) + 1)
}

describe.each(MASTHEADED)('$slug masthead reads the faction (#2167)', (skin) => {
  it('is an anchor to the faction page, not an inert band', () => {
    const tag = bandTag(render(skin), skin.slug)
    expect(tag, 'the band itself is the hit target').toMatch(/^<a /)
    expect(tag, 'and it goes to the faction it names').toContain(`href="/factions/${skin.slug}"`)
  })

  it('is named for the faction rather than for the furniture', () => {
    // The band's own text is the wordmark, which is the faction's name and
    // nothing else — so unlabelled it announces as "Cozy Coven, link", with no
    // hint of where it goes. The label says the destination and keeps the name.
    const label = i18n.t('feed:taskCard.mastheadLink', { faction: factionName(skin.slug) })
    expect(label, 'the faction, by name').toContain(factionName(skin.slug))
    expect(bandTag(render(skin), skin.slug)).toContain(`aria-label="${label}"`)
  })

  it('keeps the faction\'s own paint, not the user agent\'s link paint', () => {
    // An <a> that took the browser's blue-and-underlined default would repaint
    // seven hand-set wordmarks at once. The ink stays whatever the skin set.
    const tag = bandTag(render(skin), skin.slug)
    expect(tag, 'no standing underline').toContain('text-decoration:none')
    expect(tag, 'the ink is inherited or the skin\'s own').toMatch(/color:(inherit|var\()/)
  })

  it('closes before the body link opens, so no anchor nests in an anchor', () => {
    // The one thing that would make this invalid HTML. The band and the
    // card-wide task link are SIBLINGS in every archetype; a skin that moved
    // the band inside the body link fails here rather than in a validator.
    const html = render(skin)
    const band = html.indexOf(`data-card-masthead="${skin.slug}"`)
    const body = html.indexOf(`href="/tasks/${TASK.id}"`)
    expect(body, 'the body still reads the task').toBeGreaterThan(-1)
    expect(band, 'the band comes first').toBeLessThan(body)
    expect(html.slice(band, body), 'the band anchor is closed by then').toContain('</a>')
  })
})

describe.each(BANDLESS)('$slug card grows no faction link (#2167)', (skin) => {
  it('links to the task and to nothing else', () => {
    const html = render(skin)
    expect(html, 'no band to hang a link on').not.toContain('data-card-masthead')
    expect(html, 'and no faction page anywhere on the card').not.toContain('/factions/')
    expect(html.match(/<a /g) ?? [], 'the card-wide task link, alone').toHaveLength(1)
  })
})

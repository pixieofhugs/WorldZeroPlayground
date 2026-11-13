/**
 * The masthead links to the faction it names (#2167); the body reads the task,
 * the CTA signs up. Asserted once over the registry via `CardMasthead`'s markup.
 * Hover is a pointer handler a static render can't see; link paint is asserted.
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
import { surfaceMap } from '../../../factions'
import { aTask } from '../../../test/fixtures'
import { ALBESCENT_FACTION_SLUG, factionName } from '../../../utils/factions'

const TASK = aTask({ description: 'Leave something small where a stranger will find it.' })

interface Skin {
  slug: string
  Card: ComponentType<CardProps>
}

/**
 * No band, and must not grow one (ADR-0048): a band would give Albescent a name
 * and a dead-end `/factions/albescent` link. The population comes off the
 * registry (#2815); only this set is typed.
 */
const BANDLESS_SLUGS: ReadonlySet<string> = new Set(['na', ALBESCENT_FACTION_SLUG])

const SKINS: Skin[] = Object.entries(surfaceMap('taskCard')).map(([slug, Card]) => ({ slug, Card }))
const MASTHEADED: Skin[] = SKINS.filter(({ slug }) => !BANDLESS_SLUGS.has(slug))
const BANDLESS: Skin[] = SKINS.filter(({ slug }) => BANDLESS_SLUGS.has(slug))

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
    // Unlabelled it announces as "Cozy Coven, link"; the label says where.
    const label = i18n.t('feed:taskCard.mastheadLink', { faction: factionName(skin.slug) })
    expect(label, 'the faction, by name').toContain(factionName(skin.slug))
    expect(bandTag(render(skin), skin.slug)).toContain(`aria-label="${label}"`)
  })

  it('keeps the faction\'s own paint, not the user agent\'s link paint', () => {
    const tag = bandTag(render(skin), skin.slug)
    expect(tag, 'no standing underline').toContain('text-decoration:none')
    expect(tag, 'the ink is inherited or the skin\'s own').toMatch(/color:(inherit|var\()/)
  })

  it('closes before the body link opens, so no anchor nests in an anchor', () => {
    // Band and body link are SIBLINGS; nesting would be invalid HTML.
    const html = render(skin)
    const band = html.indexOf(`data-card-masthead="${skin.slug}"`)
    const body = html.indexOf(`href="/tasks/${TASK.id}"`)
    expect(body, 'the body still reads the task').toBeGreaterThan(-1)
    expect(band, 'the band comes first').toBeLessThan(body)
    expect(html.slice(band, body), 'the band anchor is closed by then').toContain('</a>')
  })
})

describe('the bandless half is still a half', () => {
  // An empty filter would make `describe.each` a silent green.
  it('names exclusions that are still registered skins', () => {
    expect(BANDLESS.map(({ slug }) => slug).sort()).toEqual([...BANDLESS_SLUGS].sort())
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

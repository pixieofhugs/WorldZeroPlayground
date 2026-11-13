/**
 * ONE BREADCRUMB ON PROPOSE A TASK (#2973). The page has no task yet, so kits
 * hand-rolled crumbs until `components/nav/Breadcrumb` grew a task-less trail.
 * Asserted without a DOM: exactly one `<nav>`, in the site's tertiary ink, above
 * the sheet — #2102's rules. The propose family's row of
 * `breadcrumbAcrossSurfaces.test.tsx`, kept beside its fixture. Roster derived
 * from `surfaceMap('proposeTask')` (#1162).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import { archetypeFor, EVERY_SLUG, proposeTaskState } from './proposeTaskState'
import type { ProposeTaskState } from '../useProposeTask'

/** The archetype the dispatcher would pick for `slug`, rendered. */
function renderFor(slug: string, overrides: Partial<ProposeTaskState> = {}): string {
  const Archetype = archetypeFor(slug)
  return renderToStaticMarkup(
    <MemoryRouter>
      <Archetype state={proposeTaskState({ factionSlug: slug, ...overrides })} />
    </MemoryRouter>,
  )
}

/** The opening tag of every `<nav>` the page drew. */
const navTags = (html: string): string[] => html.match(/<nav[^>]*>/g) ?? []

describe.each(EVERY_SLUG)('propose task — the trail back (%s)', (slug) => {
  it('draws exactly ONE trail, so no archetype hand-rolls a second', () => {
    expect(navTags(renderFor(slug))).toHaveLength(1)
  })

  it('leads back to the task bank, and the propose page is not a link to itself', () => {
    const html = renderFor(slug)
    expect(html, 'Cancel is not a way back — a link is').toContain('href="/tasks"')
    expect(html).toContain('aria-current="page"')
    expect(html.replace(/<[^>]*>/g, '')).toContain('Propose a Task')
  })

  it('is neutral site chrome — the site\'s tertiary ink, no faction token', () => {
    // #2102 rule 1: a faction token is measured on the wrong ground here.
    const [nav] = navTags(renderFor(slug))
    expect(nav).toContain('color:var(--color-text-tertiary)')
    expect(nav).not.toContain('--faction-')
    expect(nav).not.toContain('--label-ink')
  })

  it('sits ABOVE the sheet, never inside it', () => {
    // #2102 rule 2. Markup order: every kit wraps its sheet in the one `<form>`.
    const html = renderFor(slug)
    const nav = html.indexOf('<nav')
    const form = html.indexOf('<form')
    expect(nav).toBeGreaterThanOrEqual(0)
    expect(form, 'the form is the sheet boundary this reads against').toBeGreaterThan(0)
    expect(nav).toBeLessThan(form)
  })
})

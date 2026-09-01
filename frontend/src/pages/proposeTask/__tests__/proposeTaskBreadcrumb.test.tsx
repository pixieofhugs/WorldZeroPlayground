/**
 * ONE BREADCRUMB ON PROPOSE A TASK (#2973).
 *
 * THE SEAM IS THE MOUNT, not the markup. #2102 collapsed eighteen hand-rolled
 * crumbs onto `components/nav/Breadcrumb` and stated three rules it "enforces
 * rather than offers" — one ink, above the sheet, one component at every width.
 * The propose surfaces then restarted the drift, and not through carelessness:
 * the shared component took a `taskId` + `taskTitle` and this page has no task
 * yet, so seven archetypes each hit the same wall and each answered it
 * differently (inside the sheet / above it; slip ink / `--label-ink` / a
 * `--faction-*` token). #2973 gave the component a task-less trail so there is
 * one answer to mount.
 *
 * WHAT THIS ASSERTS IS THEREFORE "the trail on this page is the SHARED one",
 * and the way to say that without a DOM is: exactly one `<nav>` landmark on the
 * page, drawn in the site's own tertiary ink, carrying the shared component's
 * own shape. A hand-rolled copy fails on the count, the ink, or both — which is
 * the drift stated as a failing assertion rather than as a convention.
 *
 * The roster is DERIVED from `surfaceMap('proposeTask')`, so a future archetype
 * inherits this the moment it registers and no PR appends to a second list
 * (#1162). Nothing here proves a pixel: `renderToStaticMarkup`, no DOM
 * (SPEC-testing.md). Visual QA is outstanding and stated on the PR.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so copy keys resolve to English text.
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
    // Rule 1 of #2102, and the axis UA's crumb drifted off: the trail took the
    // leaf's own quiet ink, which is a `--faction-*` token on a control that is
    // measured on the app's own ground.
    const [nav] = navTags(renderFor(slug))
    expect(nav).toContain('color:var(--color-text-tertiary)')
    expect(nav).not.toContain('--faction-')
    expect(nav).not.toContain('--label-ink')
  })

  it('sits ABOVE the sheet, never inside it', () => {
    // Rule 2, and the axis Coven's crumb drifted off — its docblock argued for
    // the inside placement explicitly. Without a DOM, "outside the sheet" is
    // read off the order of the markup: every archetype wraps its sheet in the
    // page's one `<form>`, so a crumb drawn before that tag is a crumb the sheet
    // does not contain.
    const html = renderFor(slug)
    const nav = html.indexOf('<nav')
    const form = html.indexOf('<form')
    expect(nav).toBeGreaterThanOrEqual(0)
    expect(form, 'the form is the sheet boundary this reads against').toBeGreaterThan(0)
    expect(nav).toBeLessThan(form)
  })
})

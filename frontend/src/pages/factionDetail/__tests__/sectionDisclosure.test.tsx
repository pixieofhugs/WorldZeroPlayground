/**
 * The seam: SIXTEEN call sites — eight faction bodies × the Tasks and Praxis
 * sections — each carrying a real disclosure (#2311).
 *
 * WHY THIS IS DRIVEN OFF THE TWO i18n KEYS AND NOT OFF A COMPONENT NAME.
 * The eight archetypes do not share a heading component and must not (CLAUDE.md:
 * "each faction has its own card archetype; don't unify"). Seven of them define a
 * local `SectionHeading` / `SectionHead`; `DefaultFactionBody` defines neither
 * and draws a bare `<h2 className="label-heading">`. A sweep that greps for the
 * component name reaches twelve of the sixteen and ships whole faction pages
 * with no disclosure at all — which is exactly the failure #2311 was filed
 * predicting. `detail.default.tasksHeading` and `detail.default.recentHeading`
 * are the only thing all sixteen have in common, so the walk is by SLUG × KEY
 * and every archetype is rendered through the real page dispatch.
 *
 * WHAT IS ASSERTED, AND WHY EACH PART MATTERS
 *   - a `<button>` whose `aria-controls` names the section body, so the control
 *     is reachable by keyboard and announces what it owns. A `<div onClick>`
 *     that hides content is not a disclosure;
 *   - `aria-expanded`, which is the state announcement itself;
 *   - the `aria-label` from the sidebar's own `sidebar.panel.expand` /
 *     `.collapse` pair, naming the state the press MOVES TO;
 *   - an element actually carrying that `aria-controls` id, because a dangling
 *     reference is a silent screen-reader dead end;
 *   - the `· {{total}}` count STILL RENDERED while collapsed — the owner's
 *     "that is what makes a folded section still worth reading".
 *
 * THE HARNESS HAS NO DOM (`renderToStaticMarkup`, node env): effects never run
 * and `localStorage` does not exist. Two consequences shape this file. The
 * collapsed rendering is reachable anyway, because the hook reads storage in a
 * LAZY `useState` initializer, which runs during render — so a stubbed
 * `globalThis.localStorage` is enough. And the persistence rules themselves are
 * tested as pure functions, never through a mounted component.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
// Initialize the i18n catalog so the headings resolve to English text.
import '../../../i18n'
import i18next from 'i18next'
import type { FactionDetailState } from '../useFactionDetail'
import {
  FACTION_SECTIONS,
  PROFILE_SECTIONS,
  sectionStorageKey,
  sectionBodyId,
  resolveCollapsedSections,
  serializeCollapsedSections,
  toggleCollapsedSection,
} from '../sectionDisclosure'
import { aTask, aPraxisCard } from '../../../test/fixtures'

const mocks = vi.hoisted(() => ({
  state: undefined as unknown as FactionDetailState,
}))

vi.mock('../useFactionDetail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../useFactionDetail')>()),
  useFactionDetail: () => mocks.state,
}))

// Loaded after the mock, so the page picks it up.
const FactionDetail = (await import('../../FactionDetail')).default

/** The seven bespoke bodies plus `albescent`, which falls through to Default. */
const SLUGS = [
  'coven',
  'ephemerists',
  'everymen',
  'singularity',
  'snide',
  'ua',
  'wow',
  'albescent',
] as const

/** Three tasks and two praxis, so the Tasks count is a number worth reading. */
const TASKS = [aTask({ id: 1 }), aTask({ id: 2 }), aTask({ id: 3 })]
const PRAXIS = [aPraxisCard({ id: 1 }), aPraxisCard({ id: 2 })]

function stateFor(slug: string): FactionDetailState {
  return {
    slug,
    loading: false,
    faction: { slug, status: 'visible' },
    fetchError: null,
    members: [],
    tasks: TASKS,
    recentPraxis: PRAXIS,
    viewerFactionSlug: null,
    gameFactions: [],
    onSignup: undefined,
    signupMsg: null,
    membership: {
      state: 'none',
      currentFactionSlug: null,
      join: async () => {},
      joining: false,
      joinError: null,
    },
  } as unknown as FactionDetailState
}

function page(slug: string): string {
  mocks.state = stateFor(slug)
  const element: ReactElement = <FactionDetail slug={slug} />
  return renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
}

/** `t` is typed to the literal key union; these are looked up from a table. */
const translate = i18next.t as unknown as (
  key: string,
  options?: Record<string, unknown>,
) => string

/** The visible heading of each section — the string the aria-label names. */
const HEADING: Record<(typeof FACTION_SECTIONS.ids)[number], string> = {
  tasks: translate('factions:detail.default.tasksHeading', { total: TASKS.length }),
  praxis: translate('factions:detail.default.recentHeading'),
}

/** The opening tag of the disclosure button that owns `bodyId`, if any. */
function disclosureTag(html: string, bodyId: string): string | undefined {
  return html
    .match(/<button[^>]*>/g)
    ?.find((tag) => tag.includes(`aria-controls="${bodyId}"`))
}

/** Strip tags the way the sibling suites do, so copy matches plainly. */
function textOf(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

describe('every faction folds both galleries', () => {
  for (const slug of SLUGS) {
    for (const section of FACTION_SECTIONS.ids) {
      it(`${slug} · ${section} — the heading is a disclosure control`, () => {
        const html = page(slug)
        const bodyId = sectionBodyId(FACTION_SECTIONS, section)
        const tag = disclosureTag(html, bodyId)

        expect(tag, `${slug}'s ${section} heading draws no disclosure button`).toBeDefined()
        // Open by default.
        expect(tag).toContain('aria-expanded="true"')
        // The label names the state the press moves TO, per the sidebar pair.
        expect(tag).toContain(
          `aria-label="${translate('common:sidebar.panel.collapse', { panel: HEADING[section] })}"`,
        )
        // …and `aria-controls` resolves to something really in the document.
        expect(html, `${slug}'s ${section} body carries no ${bodyId}`).toContain(
          `id="${bodyId}"`,
        )
      })
    }
  }

  it('leaves the Charter, the Roll and the Members list alone', () => {
    // The owner's exclusion (#2311): a panel that tells you somebody is waiting
    // on you is not hideable, and folding a few paragraphs of charter saves
    // nothing. Only the two long galleries get a control — so the count of
    // disclosure buttons on a page is exactly two, on every skin.
    for (const slug of SLUGS) {
      const html = page(slug)
      const controls = html.match(/aria-controls="wz-faction-section-[a-z]+"/g) ?? []
      expect(controls, `${slug} draws ${controls.length} disclosures`).toHaveLength(2)
    }
  })
})

/**
 * The marker's DRAWING, at the same slug × section seam (#2372). The owner's
 * ruling, after the per-archetype design was put to her: the hairline goes
 * "Everywhere" — one stroke beside all eight faces, not eight tuned ones. So
 * the assertion is a CONSTANT across the sixteen call sites, and this suite is
 * what goes red the day a per-faction value is re-introduced without saying so.
 *
 * The em sizing and `currentColor` are asserted alongside because they are the
 * two things a stroke change is most likely to be "tidied" into breaking: the
 * marker must track its heading's size and take its heading's ink, on a page
 * where both are set eight different ways.
 */
describe('the disclosure marker is a hairline on every face', () => {
  /** The whole control — opening tag through `</button>`, so the assertion is
   *  scoped to the marker this disclosure actually draws. */
  function disclosureMarkup(html: string, bodyId: string): string | undefined {
    const start = html.search(new RegExp(`<button[^>]*aria-controls="${bodyId}"`))
    if (start < 0) return undefined
    const end = html.indexOf('</button>', start)
    return end < 0 ? undefined : html.slice(start, end + '</button>'.length)
  }

  for (const slug of SLUGS) {
    for (const section of FACTION_SECTIONS.ids) {
      it(`${slug} · ${section} — 1px, butt cap, miter join`, () => {
        const markup = disclosureMarkup(page(slug), sectionBodyId(FACTION_SECTIONS, section))
        expect(markup, `${slug}'s ${section} disclosure never closes`).toBeDefined()

        expect(markup).toContain('stroke-width="1"')
        expect(markup).toContain('stroke-linecap="butt"')
        expect(markup).toContain('stroke-linejoin="miter"')
        // The heading's own ink, never a token picked per faction.
        expect(markup).toContain('stroke="currentColor"')
        // Sized in `em`, so it tracks the display face it sits beside.
        expect(markup).toContain('width="0.55em"')
        expect(markup).toContain('height="0.8em"')
      })
    }
  }

  it('draws no chevron CHARACTER, on any face', () => {
    // The SVG exists because several of the eight display faces have no U+203A
    // and would paint a tofu box on a faction's front door. A thinner stroke is
    // no reason to revisit that — so no chevron glyph may appear inside a
    // disclosure control, however tempting the one-line version looks.
    for (const slug of SLUGS) {
      const html = page(slug)
      for (const section of FACTION_SECTIONS.ids) {
        const markup = disclosureMarkup(html, sectionBodyId(FACTION_SECTIONS, section))
        expect(markup, `${slug} · ${section}`).toContain('<svg')
        for (const glyph of ['\u203a', '\u276f', '\u3009', '\u00bb']) {
          expect(markup, `${slug} · ${section} draws a glyph marker`).not.toContain(
            glyph,
          )
        }
      }
    }
  })
})

describe('a folded section is still worth reading', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage')
  })

  /** Both sections stored collapsed, under the signed-out (bare) key — the
   *  AuthContext default in this harness has no user. */
  function stubStorage(value: string) {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: () => value, setItem: () => {} },
    })
  }

  it('keeps the heading, the count and the control when collapsed', () => {
    stubStorage(serializeCollapsedSections(FACTION_SECTIONS.ids, ['tasks', 'praxis']))
    for (const slug of SLUGS) {
      const html = page(slug)
      // The count is the whole reason a folded section still reads.
      expect(textOf(html), `${slug} lost its task count when folded`).toContain(
        HEADING.tasks,
      )
      expect(textOf(html)).toContain(HEADING.praxis)
      for (const section of FACTION_SECTIONS.ids) {
        const tag = disclosureTag(html, sectionBodyId(FACTION_SECTIONS, section))
        expect(tag, `${slug} · ${section}`).toContain('aria-expanded="false"')
        expect(tag).toContain(
          `aria-label="${translate('common:sidebar.panel.expand', { panel: HEADING[section] })}"`,
        )
      }
    }
  })

  it('hides the gallery itself, so the page actually gets shorter', () => {
    stubStorage(serializeCollapsedSections(FACTION_SECTIONS.ids, ['tasks']))
    const html = page('albescent')
    // React writes a bare `hidden` on the body it folds, and only on that one.
    expect(html).toContain(`id="${sectionBodyId(FACTION_SECTIONS, 'tasks')}" hidden`)
    expect(html).not.toContain(`id="${sectionBodyId(FACTION_SECTIONS, 'praxis')}" hidden`)
  })
})

/**
 * The persistence rules, at the seam the harness can actually reach. The hook
 * around them is storage-driven and this env has no `localStorage`; the resolver
 * is pure, so it is tested directly — the idiom `useSidebarPanelLayout`'s own
 * `resolveInitialPanelLayout` established.
 */
describe('the fold follows the account, not the browser', () => {
  it('appends the account id to the base key, like the rail does', () => {
    expect(sectionStorageKey(FACTION_SECTIONS.storageKey, 7)).toBe(`${FACTION_SECTIONS.storageKey}:7`)
    expect(sectionStorageKey(FACTION_SECTIONS.storageKey, 8)).not.toBe(sectionStorageKey(FACTION_SECTIONS.storageKey, 7))
  })

  it('falls back to the bare key before the account is known', () => {
    // A faction page renders while `/auth/me` is still in flight, and for a
    // signed-out visitor it never resolves at all.
    expect(sectionStorageKey(FACTION_SECTIONS.storageKey, null)).toBe(FACTION_SECTIONS.storageKey)
    expect(sectionStorageKey(FACTION_SECTIONS.storageKey, undefined)).toBe(FACTION_SECTIONS.storageKey)
  })

  it('opens everything rather than breaking on junk', () => {
    for (const stored of [null, '', 'not json', '{}', '[1,2]', '["nope"]']) {
      expect(resolveCollapsedSections(FACTION_SECTIONS.ids, stored)).toEqual([])
    }
  })

  it('round-trips a stored fold', () => {
    expect(resolveCollapsedSections(FACTION_SECTIONS.ids, serializeCollapsedSections(FACTION_SECTIONS.ids, ['praxis']))).toEqual([
      'praxis',
    ])
  })

  it('serializes in a stable order, whatever order they were folded in', () => {
    expect(serializeCollapsedSections(FACTION_SECTIONS.ids, ['praxis', 'tasks'])).toBe(
      serializeCollapsedSections(FACTION_SECTIONS.ids, ['tasks', 'praxis']),
    )
  })

  it('toggles one section without disturbing the other', () => {
    expect(toggleCollapsedSection(FACTION_SECTIONS.ids, [], 'tasks')).toEqual(['tasks'])
    expect(toggleCollapsedSection(FACTION_SECTIONS.ids, ['tasks'], 'praxis')).toEqual(['tasks', 'praxis'])
    expect(toggleCollapsedSection(FACTION_SECTIONS.ids, ['tasks', 'praxis'], 'tasks')).toEqual(['praxis'])
  })
})

/**
 * #2958 generalised this primitive so a character profile could reuse it. The
 * ruling was explicit that the two surfaces get SEPARATE keys — folding Praxis
 * on a faction page must not fold Praxis on every profile — and both surfaces
 * happen to have a section called `praxis`, which is exactly the shape that
 * makes a shared key look harmless and behave otherwise.
 *
 * This suite is what a "tidy it into one key" refactor has to argue with.
 */
describe('the two surfaces are kept apart', () => {
  it('remembers each surface under its own key', () => {
    expect(PROFILE_SECTIONS.storageKey).not.toBe(FACTION_SECTIONS.storageKey)
    // Nor may one be a prefix of the other: the account id is appended, so a
    // pair like `wz-faction-sections` / `wz-faction-sections-profile` would
    // collide for anything that ever walks these keys by prefix.
    expect(PROFILE_SECTIONS.storageKey.startsWith(FACTION_SECTIONS.storageKey)).toBe(false)
    expect(FACTION_SECTIONS.storageKey.startsWith(PROFILE_SECTIONS.storageKey)).toBe(false)
  })

  it('names each panel apart, though both surfaces have a praxis', () => {
    expect(FACTION_SECTIONS.ids).toContain('praxis')
    expect(PROFILE_SECTIONS.ids).toContain('praxis')
    expect(sectionBodyId(PROFILE_SECTIONS, 'praxis')).not.toBe(
      sectionBodyId(FACTION_SECTIONS, 'praxis'),
    )
  })

  it('ignores a blob written by the other surface', () => {
    // Belt and braces on the ruling: even if the keys were ever shared by
    // accident, a profile's fold cannot fold a faction's Tasks, because
    // resolving filters against the ASKING surface's own ids.
    const profileFold = serializeCollapsedSections(PROFILE_SECTIONS.ids, ['proposed'])
    expect(resolveCollapsedSections(FACTION_SECTIONS.ids, profileFold)).toEqual([])
  })
})

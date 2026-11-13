/**
 * Eight faction bodies × Tasks/Praxis each carry a real disclosure (#2311).
 * Walked by slug × i18n key, not component name: the archetypes share no
 * heading component. A `<button>` with `aria-controls` pointing at a real id,
 * `aria-expanded`, the sidebar's expand/collapse label, and the count still
 * shown when folded. Collapsed state is reachable because the hook reads
 * storage in a lazy `useState` initializer; persistence is tested as pure functions.
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

/** `albescent` falls through to Default. */
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

const HEADING: Record<(typeof FACTION_SECTIONS.ids)[number], string> = {
  tasks: translate('factions:detail.default.tasksHeading', { total: TASKS.length }),
  praxis: translate('factions:detail.default.recentHeading'),
}

function disclosureTag(html: string, bodyId: string): string | undefined {
  return html
    .match(/<button[^>]*>/g)
    ?.find((tag) => tag.includes(`aria-controls="${bodyId}"`))
}

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
        expect(tag).toContain('aria-expanded="true"')
        // The label names the state the press moves TO.
        expect(tag).toContain(
          `aria-label="${translate('common:sidebar.panel.collapse', { panel: HEADING[section] })}"`,
        )
        expect(html, `${slug}'s ${section} body carries no ${bodyId}`).toContain(
          `id="${bodyId}"`,
        )
      })
    }
  }

  it('leaves the Charter, the Roll and the Members list alone', () => {
    // #2311: only the two long galleries fold.
    for (const slug of SLUGS) {
      const html = page(slug)
      const controls = html.match(/aria-controls="wz-faction-section-[a-z]+"/g) ?? []
      expect(controls, `${slug} draws ${controls.length} disclosures`).toHaveLength(2)
    }
  })
})

/** #2372: one constant hairline marker on every face, sized in em, `currentColor` ink. */
describe('the disclosure marker is a hairline on every face', () => {
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
        expect(markup).toContain('stroke="currentColor"')
        expect(markup).toContain('width="0.55em"')
        expect(markup).toContain('height="0.8em"')
      })
    }
  }

  it('draws no chevron CHARACTER, on any face', () => {
    // Several display faces lack U+203A and would paint tofu; hence the SVG.
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

  // The harness has no user, so the bare key is read.
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
    expect(html).toContain(`id="${sectionBodyId(FACTION_SECTIONS, 'tasks')}" hidden`)
    expect(html).not.toContain(`id="${sectionBodyId(FACTION_SECTIONS, 'praxis')}" hidden`)
  })
})

describe('the fold follows the account, not the browser', () => {
  it('appends the account id to the base key, like the rail does', () => {
    expect(sectionStorageKey(FACTION_SECTIONS.storageKey, 7)).toBe(`${FACTION_SECTIONS.storageKey}:7`)
    expect(sectionStorageKey(FACTION_SECTIONS.storageKey, 8)).not.toBe(sectionStorageKey(FACTION_SECTIONS.storageKey, 7))
  })

  it('falls back to the bare key before the account is known', () => {
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

/** #2958: faction and profile folds use separate keys, though both have `praxis`. */
describe('the two surfaces are kept apart', () => {
  it('remembers each surface under its own key', () => {
    expect(PROFILE_SECTIONS.storageKey).not.toBe(FACTION_SECTIONS.storageKey)
    // Nor a prefix of the other, for anything walking keys by prefix.
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
    // Resolving filters against the asking surface's own ids.
    const profileFold = serializeCollapsedSections(PROFILE_SECTIONS.ids, ['proposed'])
    expect(resolveCollapsedSections(FACTION_SECTIONS.ids, profileFold)).toEqual([])
  })
})

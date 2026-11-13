/**
 * `FactionProfileBody` × the two long galleries, walked by registry SLUG and
 * form factor (#2958, #2996): all fold on a laptop, all switch on a phone.
 * Walking by slug, not component, is what would notice a future renderer fork.
 *
 * No DOM: markup and `aria-*` only. The hook reads storage in a lazy
 * `useState` initializer, so a stubbed `localStorage` reaches the folded render.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

import '../../../i18n'
import i18next from 'i18next'
import type { CharacterOut } from '../../../api/auth'
import {
  FACTION_SECTIONS,
  PROFILE_SECTIONS,
  sectionBodyId,
  serializeCollapsedSections,
} from '../../factionDetail/sectionDisclosure'
import { aTask, aPraxisCard } from '../../../test/fixtures'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  MOBILE_QUERY: '(max-width: 767px)',
  formFactorFor: (matches: boolean) => (matches ? 'mobile' : 'desktop'),
  useFormFactor: () => mocks.formFactor,
}))

// Loaded after the mock, so the archetypes pick it up.
const FactionProfileBody = (await import('../FactionProfileBody')).default
type ProfileBodyProps = import('../FactionProfileBody').ProfileBodyProps
const { surfaceMap } = await import('../../../factions')

/** Derived from the registry so a tenth kit is walked too (#2815). */
const SLUGS = Object.keys(surfaceMap('profileBody')).sort()

const PRAXIS = [aPraxisCard({ id: 1 }), aPraxisCard({ id: 2 })]
const TASKS = [aTask({ id: 1 }), aTask({ id: 2 })]

function character(slug: string): CharacterOut {
  return {
    id: 7,
    username: 'reza',
    display_name: 'Reza',
    bio: 'A short bio, so the About block really renders.',
    tagline: '',
    avatar_url: '',
    location: '',
    level: 7,
    score: 1880,
    all_time_score: 2400,
    faction_slug: slug,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [{ key: 'sock_puppet', name: 'Sock Puppet' }],
    invitations: [],
  }
}

function page(slug: string): string {
  const props: ProfileBodyProps = {
    character: character(slug),
    submissions: PRAXIS,
    proposedTasks: TASKS,
    progression: {
      nextLevel: 8,
      currentThreshold: 1500,
      nextThreshold: 2000,
      pointsIntoLevel: 380,
      levelSpan: 500,
      progressPercent: 76,
    },
    identityActions: null,
  }
  return renderToStaticMarkup(
    <MemoryRouter>
      <FactionProfileBody {...props} />
    </MemoryRouter>,
  )
}

/** `t` is typed to the literal key union; these are looked up from a table. */
const translate = i18next.t as unknown as (
  key: string,
  options?: Record<string, unknown>,
) => string

/** The visible heading of each section — the string the aria-label names. */
const HEADING: Record<(typeof PROFILE_SECTIONS.ids)[number], string> = {
  praxis: translate('common:profile.praxisHeading'),
  proposed: translate('common:profile.proposedTasksHeading'),
}

/** The opening tag of the disclosure button that owns `bodyId`, if any. */
function disclosureTag(html: string, bodyId: string): string | undefined {
  return html
    .match(/<button[^>]*>/g)
    ?.find((tag) => tag.includes(`aria-controls="${bodyId}"`))
}

beforeEach(() => {
  mocks.formFactor = 'desktop'
})

describe('every profile folds both galleries on a laptop', () => {
  for (const slug of SLUGS) {
    for (const section of PROFILE_SECTIONS.ids) {
      it(`${slug} · ${section} — the heading is a disclosure control`, () => {
        const html = page(slug)
        const bodyId = sectionBodyId(PROFILE_SECTIONS, section)
        const tag = disclosureTag(html, bodyId)

        expect(tag, `${slug}'s ${section} heading draws no disclosure button`).toBeDefined()
        // Open by default.
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

  it('leaves About and Badges alone', () => {
    // #2311: only the two long galleries fold.
    for (const slug of SLUGS) {
      const html = page(slug)
      const controls = html.match(/aria-controls="wz-profile-section-[a-z]+"/g) ?? []
      expect(controls, `${slug} draws ${controls.length} disclosures`).toHaveLength(2)
      expect(html, `${slug} still draws its About block`).toContain(
        translate('common:profile.aboutHeading'),
      )
      expect(html, `${slug} still draws its badges`).toContain('Sock Puppet')
    }
  })

  it('never reaches for the FACTION surface’s panels', () => {
    // Both surfaces have a `praxis` section; catch the wrong `SectionSurface`.
    for (const slug of SLUGS) {
      expect(page(slug), `${slug} mounts a faction panel`).not.toContain(
        FACTION_SECTIONS.bodyIdPrefix,
      )
    }
  })
})

describe('the phone switches instead of folding — on all nine (#2996)', () => {
  // The switch markup itself is asserted in `profileStructure.test.tsx`.
  beforeEach(() => {
    mocks.formFactor = 'mobile'
  })

  it('carries no stored fold onto a phone either', () => {
    // A fold stored on a laptop must not hide the phone's gallery: no control
    // at this width could bring it back.
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => serializeCollapsedSections(PROFILE_SECTIONS.ids, ['praxis', 'proposed']),
        setItem: () => {},
      },
    })
    try {
      for (const slug of SLUGS) {
        const html = page(slug)
        // `hidden=""` is React's boolean in static markup; distinct from
        // `aria-hidden="true"` and `overflow:hidden`.
        expect(html, `${slug} folded on a phone`).not.toMatch(/\shidden=""/)
        expect(html.replace(/<[^>]*>/g, ''), `${slug} lost its praxis`).toContain(
          PRAXIS[0].task_title,
        )
      }
    } finally {
      Reflect.deleteProperty(globalThis, 'localStorage')
    }
  })
})

describe('a folded gallery is still worth reading', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage')
  })

  /** Signed-out (bare) key: the harness has no user. */
  function stubStorage(value: string) {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: () => value, setItem: () => {} },
    })
  }

  it('keeps the heading, the count and the control when collapsed', () => {
    stubStorage(serializeCollapsedSections(PROFILE_SECTIONS.ids, ['praxis', 'proposed']))
    for (const slug of SLUGS) {
      const html = page(slug)
      const text = html.replace(/<[^>]*>/g, '')
      expect(text, `${slug} lost a heading when folded`).toContain(HEADING.praxis)
      expect(text).toContain(HEADING.proposed)
      // The count lives in the eyebrow, outside the panel.
      expect(text, `${slug} lost its task count when folded`).toContain(
        translate('common:profile.proposedTasksTotal', { count: TASKS.length }),
      )
      for (const section of PROFILE_SECTIONS.ids) {
        const tag = disclosureTag(html, sectionBodyId(PROFILE_SECTIONS, section))
        expect(tag, `${slug} · ${section}`).toContain('aria-expanded="false"')
        expect(tag).toContain(
          `aria-label="${translate('common:sidebar.panel.expand', { panel: HEADING[section] })}"`,
        )
      }
    }
  })

  it('hides the gallery itself, so the page actually gets shorter', () => {
    stubStorage(serializeCollapsedSections(PROFILE_SECTIONS.ids, ['praxis']))
    for (const slug of ['na', 'coven']) {
      const html = page(slug)
      expect(html, slug).toContain(`id="${sectionBodyId(PROFILE_SECTIONS, 'praxis')}" hidden`)
      expect(html, slug).not.toContain(
        `id="${sectionBodyId(PROFILE_SECTIONS, 'proposed')}" hidden`,
      )
      // `hidden` keeps the markup, so assert the cards sit INSIDE the panel.
      const praxisAt = html.indexOf(`id="${sectionBodyId(PROFILE_SECTIONS, 'praxis')}"`)
      const proposedAt = html.indexOf(`id="${sectionBodyId(PROFILE_SECTIONS, 'proposed')}"`)
      const praxisCardAt = html.indexOf(PRAXIS[0].task_title)
      const taskCardAt = html.indexOf(TASKS[0].title)
      expect(praxisCardAt, `${slug}: praxis outside the panel it folds`).toBeGreaterThan(
        praxisAt,
      )
      expect(praxisCardAt, `${slug}: praxis outside the panel it folds`).toBeLessThan(
        proposedAt,
      )
      expect(taskCardAt, `${slug}: tasks outside their own panel`).toBeGreaterThan(
        proposedAt,
      )
    }
  })
})

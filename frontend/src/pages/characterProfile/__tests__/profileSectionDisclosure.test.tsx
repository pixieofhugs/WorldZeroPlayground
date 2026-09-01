/**
 * The seam: `FactionProfileBody` × the profile's two long galleries, walked by
 * SLUG and by FORM FACTOR (#2958).
 *
 * WHY THE WALK IS BY SLUG AND NOT BY COMPONENT. Nine slugs reach three
 * renderers — six kits and WOW's laptop half go through `ProfileSkin`'s
 * `sectionHeading` seam, na and Albescent go through `DefaultProfileBody`, and
 * na and WOW each own a phone skin besides. A sweep that greps a heading
 * component name reaches one of those three and ships whole archetypes with no
 * disclosure, which is the failure `factionDetail/__tests__/sectionDisclosure`
 * was written predicting one surface over. `profile.praxisHeading` and
 * `profile.proposedTasksHeading` are the only thing every rendering has in
 * common, so the dispatch is driven and every archetype is really rendered.
 *
 * THE PHONE IS NOT A UNIFORM ROW, AND THAT IS THE POINT OF SPLITTING THE WALK.
 * Six kits draw the same two sections at both widths — `ProfileSkin` restacks,
 * it does not re-author — so their phone rendering folds. The na and WOW phone
 * skins draw Praxis and Proposed tasks behind a segmented Chronicles / Quests
 * switch instead: one gallery is on screen at a time and there is no section
 * heading to hang a control in, so there is nothing to fold and no fold is
 * asserted. That asymmetry is pinned below rather than left to be rediscovered
 * as a hole.
 *
 * THE HARNESS HAS NO DOM (`renderToStaticMarkup`, node env), so a press cannot
 * be simulated. What is reachable is the markup and the `aria-*` wiring, plus
 * the COLLAPSED rendering — the hook reads storage in a lazy `useState`
 * initializer, which runs during render, so a stubbed `globalThis.localStorage`
 * is enough. Whether anything visually collapses is an eyeball question.
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

/** The seven bespoke bodies, plus `na` and `albescent` on Default. */
const SLUGS = [
  'na',
  'albescent',
  'coven',
  'ephemerists',
  'everymen',
  'singularity',
  'snide',
  'ua',
  'wow',
] as const

/** The archetypes whose PHONE skin is `ProfileSkin` restacked — see the head. */
const FOLDING_ON_A_PHONE = ['coven', 'ephemerists', 'everymen', 'singularity', 'snide', 'ua']

/** The two that swap the sections for a segmented switch on a phone. */
const SEGMENTED_ON_A_PHONE = ['na', 'albescent', 'wow']

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

  it('leaves About and Badges alone', () => {
    // The faction ruling one surface over (#2311, applied by #2958): a bio and
    // a row of marks are not what pushes a profile down, and folding a few
    // paragraphs saves nothing. Only the two long galleries get a control — so
    // the count of disclosure buttons is exactly two, on every skin.
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
    // The two surfaces both have a section called `praxis`. A profile naming a
    // faction body id would mean the wrong `SectionSurface` was passed, and
    // every assertion above would still pass.
    for (const slug of SLUGS) {
      expect(page(slug), `${slug} mounts a faction panel`).not.toContain(
        FACTION_SECTIONS.bodyIdPrefix,
      )
    }
  })
})

describe('the phone rendering folds wherever it draws the two sections', () => {
  beforeEach(() => {
    mocks.formFactor = 'mobile'
  })

  for (const slug of FOLDING_ON_A_PHONE) {
    it(`${slug} — both galleries fold at 375px too`, () => {
      const html = page(slug)
      for (const section of PROFILE_SECTIONS.ids) {
        const bodyId = sectionBodyId(PROFILE_SECTIONS, section)
        expect(disclosureTag(html, bodyId), `${slug} · ${section}`).toContain(
          'aria-expanded="true"',
        )
        expect(html).toContain(`id="${bodyId}"`)
      }
    })
  }

  for (const slug of SEGMENTED_ON_A_PHONE) {
    it(`${slug} — a segmented switch instead, so there is nothing to fold`, () => {
      const html = page(slug)
      // Both tabs are there and exactly one gallery is on screen, which is the
      // bounding gesture a fold would otherwise supply. If this skin is ever
      // redrawn into two stacked sections, this goes red and the fold is owed.
      const text = html.replace(/<[^>]*>/g, '')
      expect(text, `${slug} lost its segmented switch`).toContain(
        translate('common:profile.mobile.tabPraxis'),
      )
      expect(text).toContain(translate('common:profile.mobile.tabTasks'))
      expect(html, `${slug} grew a half-built disclosure`).not.toContain(
        PROFILE_SECTIONS.bodyIdPrefix,
      )
    })
  }
})

describe('a folded gallery is still worth reading', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage')
  })

  /** Stored under the signed-out (bare) key — the AuthContext default in this
   *  harness has no user, which is the fallback the ruling keeps on purpose. */
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
      // The count beside Proposed tasks is the whole reason a folded section
      // still reads — it lives in the eyebrow, outside the panel.
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
      // React writes a bare `hidden` on the body it folds, and only on that one.
      expect(html, slug).toContain(`id="${sectionBodyId(PROFILE_SECTIONS, 'praxis')}" hidden`)
      expect(html, slug).not.toContain(
        `id="${sectionBodyId(PROFILE_SECTIONS, 'proposed')}" hidden`,
      )
      // `hidden` is the rail's idiom and it KEEPS the markup — the gallery
      // holds its state and its scroll position, and the browser takes it out
      // of the flow. So the assertion is that the cards are INSIDE the folded
      // panel rather than absent: the praxis cards fall between the praxis
      // panel's opening tag and the proposed panel's, and the task cards after.
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

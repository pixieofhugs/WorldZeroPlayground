/**
 * The seam: `FactionProfileBody` × the profile's two long galleries, walked by
 * SLUG and by FORM FACTOR (#2958, inverted on the phone axis by #2996).
 *
 * WHY THE WALK IS BY SLUG AND NOT BY COMPONENT. It was written when nine slugs
 * reached THREE renderers, so that a sweep greping a heading component name
 * could not reach one of them and ship whole archetypes with no disclosure —
 * the failure `factionDetail/__tests__/sectionDisclosure` was written
 * predicting one surface over. There is one renderer now (#2996), and the walk
 * stays exactly as it was: a registry-driven dispatch is what would notice the
 * next fork, and `profile.praxisHeading` / `profile.proposedTasksHeading` are
 * still the only things every rendering has in common.
 *
 * WHAT INVERTED. This file used to pin an ASYMMETRY: six kits folded on a phone
 * and na and WOW switched instead, because those two owned phone skins. The
 * owner's ruling collapsed the two shapes into the one that suits the width —
 * all nine fold on a laptop, all nine switch on a phone — so the two lists below
 * became one, and the axis they used to disagree on is now the axis they agree
 * on. The reasoning is the one this file already recorded for the two: with one
 * gallery on screen there is no section heading for a control to live in, and a
 * fold on top of a switch is a second mechanism answering the same question.
 * `profileStructure.test.tsx` is the derived guard on the same collapse; this
 * one is about the DISCLOSURE and stays about it.
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

/** The seven bespoke bodies, plus `na` and `albescent` on the na kit. */
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

describe('the phone switches instead of folding — on all nine (#2996)', () => {
  beforeEach(() => {
    mocks.formFactor = 'mobile'
  })

  for (const slug of SLUGS) {
    it(`${slug} — a segmented switch, so there is nothing to fold`, () => {
      const html = page(slug)
      // Both tabs are there and exactly one gallery is on screen, which is the
      // bounding gesture a fold would otherwise supply. If any skin is ever
      // redrawn into two stacked sections at this width, this goes red and the
      // fold is owed on it again.
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

  it('carries no stored fold onto a phone either', () => {
    // The preference is per account × SURFACE and survives a width change, so a
    // player who folded Praxis on a laptop still has it folded in storage when
    // they open the same profile on a phone. The phone must ignore it rather
    // than hide the gallery its switch says is up — there is no control at this
    // width to bring it back with.
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
        // A bare `hidden` ATTRIBUTE — React's own spelling for a folded panel.
        // Matched as an attribute rather than as a word, so neither the
        // `aria-hidden` chrome nor the six kits' `overflow:hidden` reads as one.
        expect(html, `${slug} folded on a phone`).not.toMatch(/\shidden[>\s]/)
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

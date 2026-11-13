/**
 * `FactionProfileBody` × every registry slug × both form factors: one profile
 * shape (#2996) — all nine fold on a laptop, all nine switch on a phone. The
 * slug list is derived from `surfaceMap('profileBody')`, never typed (#2815).
 * Static markup only: no press, no pixels.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import '../../../i18n'
import i18next from 'i18next'
import type { CharacterOut } from '../../../api/auth'
import { aTask, aPraxisCard } from '../../../test/fixtures'
import { PROFILE_SECTIONS, sectionBodyId } from '../../factionDetail/sectionDisclosure'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  MOBILE_QUERY: '(max-width: 767px)',
  formFactorFor: (matches: boolean) => (matches ? 'mobile' : 'desktop'),
  useFormFactor: () => mocks.formFactor,
}))

// Loaded after the mock, so the archetypes pick it up.
const FactionProfileBody = (await import('../FactionProfileBody')).default
type ProfileBodyProps = import('../FactionProfileBody').ProfileBodyProps
const { surfaceMap, FACTION_MANIFESTS } = await import('../../../factions')
const DefaultProfileBody = (await import('../archetypes/DefaultProfileBody')).default
const { isKnownFaction } = await import('../../../utils/factions')

/** Every slug the registry can dispatch a profile body for. */
const SLUGS = Object.keys(surfaceMap('profileBody')).sort()

const PRAXIS = [aPraxisCard({ id: 1, title: 'A quiet finding' })]
const TASKS = [aTask({ id: 1, title: 'Plant a tree' })]

/** `t` is typed to the literal key union; these are looked up from a table. */
const translate = i18next.t as unknown as (
  key: string,
  options?: Record<string, unknown>,
) => string

const TAB_PRAXIS = translate('common:profile.mobile.tabPraxis')
const TAB_TASKS = translate('common:profile.mobile.tabTasks')

function character(slug: string): CharacterOut {
  return {
    id: 7,
    username: 'reza',
    display_name: 'Reza',
    bio: 'A short bio, so the About block really renders.',
    tagline: 'Small acts, kept up.',
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
    identityActions: <div>Friend</div>,
  }
  return renderToStaticMarkup(
    <MemoryRouter>
      <FactionProfileBody {...props} />
    </MemoryRouter>,
  )
}

const count = (html: string, needle: string) => html.split(needle).length - 1

beforeEach(() => {
  mocks.formFactor = 'desktop'
})

describe('the registry has profiles to walk', () => {
  it('dispatches all nine slugs', () => {
    // Guards against an empty registry making every loop vacuous.
    expect(SLUGS.length).toBeGreaterThanOrEqual(9)
    expect(SLUGS).toContain('na')
  })
})

describe.each(['desktop', 'mobile'] as const)(
  'one section spine on %s, on every slug',
  (formFactor) => {
    beforeEach(() => {
      mocks.formFactor = formFactor
    })

    it.each(SLUGS)('%s draws the whole spine', (slug) => {
      const html = page(slug)
      const text = html.replace(/<[^>]*>/g, ' ')

      // ① identity: one <h1>, the tagline slot, friend/foe, one level bar.
      expect(count(html, '<h1'), `${slug}: <h1> count`).toBe(1)
      expect(html, `${slug}: the tagline slot`).toContain('max-width:22ch')
      expect(text, `${slug}: friend/foe`).toContain('Friend')
      expect(count(html, 'transition:width 300ms'), `${slug}: level bars`).toBe(1)
      // The climb caption under the bar, once silently dropped.
      expect(text, `${slug}: the climb caption`).toContain(
        translate('common:profile.ptsToNext', { score: 1880, threshold: 2000 }),
      )

      // ② About and ③ Badges.
      expect(text, `${slug}: About`).toContain(translate('common:profile.aboutHeading'))
      expect(text, `${slug}: the bio`).toContain('A short bio,')
      expect(text, `${slug}: Badges`).toContain(translate('common:profile.badgesHeading'))
      expect(text, `${slug}: a badge`).toContain('Sock Puppet')

      // ⑤ Praxis is the phone's opening segment and the laptop's first gallery.
      expect(text, `${slug}: the praxis gallery`).toContain('A quiet finding')
    })
  },
)

describe('the laptop folds both galleries — #2958, untouched', () => {
  it.each(SLUGS)('%s hangs a disclosure in each gallery heading', (slug) => {
    const html = page(slug)
    for (const section of PROFILE_SECTIONS.ids) {
      const bodyId = sectionBodyId(PROFILE_SECTIONS, section)
      expect(html, `${slug}: no ${bodyId} panel`).toContain(`id="${bodyId}"`)
      expect(
        html.match(/<button[^>]*>/g)?.find((tag) => tag.includes(`aria-controls="${bodyId}"`)),
        `${slug}: ${section} heading draws no disclosure`,
      ).toBeDefined()
    }
    expect(html.replace(/<[^>]*>/g, ' '), `${slug}: the task row`).toContain('Plant a tree')
    // No segmented switch on a laptop.
    expect(count(html, 'aria-pressed'), `${slug}: a laptop segmented switch`).toBe(0)
  })
})

describe('the phone toggles instead, on all nine', () => {
  beforeEach(() => {
    mocks.formFactor = 'mobile'
  })

  it.each(SLUGS)('%s draws one segmented Praxis/Tasks switch', (slug) => {
    const html = page(slug)
    const text = html.replace(/<[^>]*>/g, ' ')

    expect(text, `${slug}: the Praxis tab`).toContain(TAB_PRAXIS)
    expect(text, `${slug}: the Tasks tab`).toContain(TAB_TASKS)
    // Opening state: Praxis on, Tasks off.
    expect(count(html, 'aria-pressed="true"'), `${slug}: pressed halves`).toBe(1)
    expect(count(html, 'aria-pressed="false"'), `${slug}: unpressed halves`).toBe(1)
  })

  it.each(SLUGS)('%s puts the badge board ABOVE the switch', (slug) => {
    // A gallery is unbounded. DOM order, which is what a screen reader meets.
    const html = page(slug)
    expect(
      html.indexOf(translate('common:profile.badgesHeading')),
      `${slug}: no badge board`,
    ).toBeGreaterThan(-1)
    expect(
      html.indexOf(translate('common:profile.badgesHeading')),
      `${slug}: badges below the switch`,
    ).toBeLessThan(html.indexOf('aria-pressed'))
  })

  it.each(SLUGS)('%s folds nothing on a phone — one gallery is up at a time', (slug) => {
    expect(page(slug), `${slug}: a half-built disclosure`).not.toContain(
      PROFILE_SECTIONS.bodyIdPrefix,
    )
  })
})

/**
 * A themed slug falling through to `DefaultProfileBody` wears its own hue, not
 * the unaffiliated spectrum (ADR-0039, #749). No such slug exists today, so the
 * body is also rendered directly with a themed slug.
 */
describe('a themed faction falling through wears its hue, not the spectrum', () => {
  const THEMED_WITHOUT_A_ROW = FACTION_MANIFESTS.map((manifest) => manifest.slug)
    .filter((slug) => isKnownFaction(slug))
    .filter((slug) => !(slug in surfaceMap('profileBody')))

  /** A themed slug to stand in for one, from the registry — never a literal. */
  const THEMED = FACTION_MANIFESTS.map((manifest) => manifest.slug).filter((slug) =>
    isKnownFaction(slug),
  )[0]

  /** Empty galleries on purpose: cards draw spectra of their own, so with none
   *  every `.spectrum-rule` here is the profile kit's. */
  const fallThrough = (slug: string): string =>
    renderToStaticMarkup(
      <MemoryRouter>
        <DefaultProfileBody
          character={character(slug)}
          submissions={[]}
          proposedTasks={[]}
          progression={{
            nextLevel: 8,
            currentThreshold: 1500,
            nextThreshold: 2000,
            pointsIntoLevel: 380,
            levelSpan: 500,
            progressPercent: 76,
          }}
          identityActions={null}
        />
      </MemoryRouter>,
    )

  it('has a themed slug to stand one up with', () => {
    expect(THEMED, 'the registry lists no themed faction at all').toBeTruthy()
    expect(isKnownFaction(THEMED)).toBe(true)
    expect(isKnownFaction('na'), 'the sentinel is not a faction').toBe(false)
  })

  it.each(['desktop', 'mobile'] as const)('draws no spectrum rule at %s width', (formFactor) => {
    mocks.formFactor = formFactor
    const html = fallThrough(THEMED)
    expect(html, "na's ramp on a themed faction").not.toContain('spectrum-rule')
    expect(html, "the faction's own hue").toContain(`var(--faction-${THEMED})`)
  })

  it.each(['desktop', 'mobile'] as const)(
    'keeps the ramp for the sentinel at %s width',
    (formFactor) => {
      mocks.formFactor = formFactor
      expect(fallThrough('na'), 'the unaffiliated ramp').toContain('spectrum-rule')
    },
  )

  it.each(THEMED_WITHOUT_A_ROW)('%s reaches the same answer through the dispatcher', (slug) => {
    // Empty today, deliberately not skipped.
    expect(fallThrough(slug)).not.toContain('spectrum-rule')
  })
})

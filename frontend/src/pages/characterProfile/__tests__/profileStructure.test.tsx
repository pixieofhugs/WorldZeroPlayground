/**
 * The seam: `FactionProfileBody` × every slug the registry dispatches × BOTH
 * form factors — one profile shape, whichever renderer draws it (#2996).
 *
 * WHAT WENT RED HERE. The profile was drawn by three renderers and the phone
 * showed two answers to "how do I see this player's work": six kits stacked two
 * folding galleries, while na and WOW each owned a second phone skin that put
 * one gallery at a time behind a segmented switch. A reader could not tell from
 * any one file which shape a slug got, and #2958 had already had to land the
 * same feature twice in one commit to keep them level. The owner's ruling is
 * that all nine take the segmented toggle on a phone and all nine fold on a
 * laptop, so the two shapes become one and this file is where that is stated.
 *
 * THE SLUG LIST IS DERIVED, NEVER TYPED. `surfaceMap('profileBody')` is the
 * registry every dispatch already reads; a typed list cannot notice a tenth kit
 * (#2815) and a hand-written `SITES` array is the failure #2955 is open for. So
 * a faction that registers a profile body joins this walk by registering it.
 *
 * WHAT THIS CAN AND CANNOT SEE. `renderToStaticMarkup` in node (SPEC-testing):
 * no DOM, no effects, and NO PRESS. The toggle's default segment is all that
 * renders, so what is asserted is that the control is drawn, wired and in the
 * state it opens in — pressing it is an eyeball test and is stated outstanding
 * on the PR. Nothing here proves a pixel either: the phone rendering is the
 * laptop's restacked, and whether that reads at 375px is a screenshot question.
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

// Loaded after the mock, so every archetype picks it up.
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
    // A registry read that silently returned {} would make every loop below a
    // vacuous pass — the shape #2815 and #2955 are both about.
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

      // ① identity: the outline's one <h1>, the tagline slot's own measure, the
      //    friend/foe control, and exactly one level bar. WOW's phone stack used
      //    to trade the bar for a tally of deeds, which is the section set
      //    differing by renderer rather than by dress.
      expect(count(html, '<h1'), `${slug}: <h1> count`).toBe(1)
      expect(html, `${slug}: the tagline slot`).toContain('max-width:22ch')
      expect(text, `${slug}: friend/foe`).toContain('Friend')
      expect(count(html, 'transition:width 300ms'), `${slug}: level bars`).toBe(1)
      // …and the caption UNDER that bar, which says where the band sits on the
      // era's whole curve. It is the one readout the delegation silently
      // dropped: na drew it in both retired branches, `ProfileSkin` had no slot
      // for it, and every test in the repo stayed green — `profile.ptsToNext`
      // was left resolving to nothing but a comment.
      expect(text, `${slug}: the climb caption`).toContain(
        translate('common:profile.ptsToNext', { score: 1880, threshold: 2000 }),
      )

      // ② About and ③ Badges, on every renderer at both widths.
      expect(text, `${slug}: About`).toContain(translate('common:profile.aboutHeading'))
      expect(text, `${slug}: the bio`).toContain('A short bio,')
      expect(text, `${slug}: Badges`).toContain(translate('common:profile.badgesHeading'))
      expect(text, `${slug}: a badge`).toContain('Sock Puppet')

      // ⑤ Praxis is on screen at both widths — it is the phone toggle's opening
      //    segment as well as the laptop's first gallery.
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
    // Both galleries are on the page, one under each heading.
    expect(html.replace(/<[^>]*>/g, ' '), `${slug}: the task row`).toContain('Plant a tree')
    // …and no segmented toggle: a fold and a switch answering the same question
    // is the two-mechanism state the ruling collapses.
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
    // Two halves of one control, in the state it opens in: Praxis on, Tasks
    // off. The press itself is unreachable in this harness.
    expect(count(html, 'aria-pressed="true"'), `${slug}: pressed halves`).toBe(1)
    expect(count(html, 'aria-pressed="false"'), `${slug}: unpressed halves`).toBe(1)
  })

  it.each(SLUGS)('%s puts the badge board ABOVE the switch', (slug) => {
    // Both retired phone renderings did, and for the reason the laptop's
    // right-hand rail encodes: a board of marks is a fixed few rows, where a
    // gallery is unbounded. Below the switch it lands after a scroll as long as
    // the player's praxis count. Asserted on DOM ORDER, which is what a screen
    // reader meets — a CSS `order` would have passed a visual check and left
    // the reading sequence wrong.
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
    // The reasoning #2958's own test recorded for the two kits that already
    // shipped the switch: with one gallery on screen there is no section
    // heading for a disclosure to live in, so a fold would be a second
    // mechanism answering the question the switch answers.
    expect(page(slug), `${slug}: a half-built disclosure`).not.toContain(
      PROFILE_SECTIONS.bodyIdPrefix,
    )
  })
})

/**
 * THE FALL-THROUGH BODY IS NOT na's ALONE (ADR-0039, #749).
 *
 * `DefaultProfileBody` is what a faction with no `profileBody` row in its
 * manifest lands on, and the spectrum is the UNAFFILIATED identity — so a
 * THEMED slug reaching it must wear its own solid hue, never na's rainbow. That
 * seam was phone-only before #2996 (the retired laptop branch painted the ramp
 * for everyone) and the collapse nearly took the wrong half's answer with it.
 *
 * The subject is derived, never typed: any registered slug that is themed
 * (`isKnownFaction`) and has no profile row. Today there are none — all nine
 * register one — so that walk alone would be vacuous, and the second case is
 * what stops it being: the body is rendered DIRECTLY with a themed slug, which
 * is exactly the markup a deleted manifest row would produce.
 */
describe('a themed faction falling through wears its hue, not the spectrum', () => {
  const THEMED_WITHOUT_A_ROW = FACTION_MANIFESTS.map((manifest) => manifest.slug)
    .filter((slug) => isKnownFaction(slug))
    .filter((slug) => !(slug in surfaceMap('profileBody')))

  /** A themed slug to stand in for one, from the registry — never a literal. */
  const THEMED = FACTION_MANIFESTS.map((manifest) => manifest.slug).filter((slug) =>
    isKnownFaction(slug),
  )[0]

  /**
   * EMPTY GALLERIES ON PURPOSE. A praxis card and a task card draw spectra of
   * their OWN — the vote divider, the CTA rule — whenever the card's faction
   * resolves to `default`, and those are censused in their own files. With no
   * cards on the page every `.spectrum-rule` in this markup belongs to the
   * profile kit, which is what makes the assertion below discriminate. The
   * three mounts under test all render without content: two section heads, the
   * identity band, the level bar.
   */
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
    // All three of the kit's ramp mounts — the section heads' hairline, the
    // identity band, the level bar's fill — take the hue instead.
    expect(html, "na's ramp on a themed faction").not.toContain('spectrum-rule')
    expect(html, "the faction's own hue").toContain(`var(--faction-${THEMED})`)
  })

  it.each(['desktop', 'mobile'] as const)(
    'keeps the ramp for the sentinel at %s width',
    (formFactor) => {
      // The other half, or the assertion above would pass on a kit that had
      // simply lost its spectrum.
      mocks.formFactor = formFactor
      expect(fallThrough('na'), 'the unaffiliated ramp').toContain('spectrum-rule')
    },
  )

  it.each(THEMED_WITHOUT_A_ROW)('%s reaches the same answer through the dispatcher', (slug) => {
    // Empty today and deliberately not skipped: the day a themed faction drops
    // its row, this walk starts running rather than staying silent.
    expect(fallThrough(slug)).not.toContain('spectrum-rule')
  })
})

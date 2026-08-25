/**
 * The seam: `FactionDetail`'s `factionBody` dispatch × `useFormFactor()` (#1314).
 *
 * ONE registry, walked at BOTH form factors — the shape ADR-0069 landed for the
 * duel seal and called strictly stronger than two lists. It is stronger here for
 * a reason specific to this surface: `mobileFactionPage` and `factionBody` were
 * two registries holding two DIFFERENT content sets, so a per-registry test
 * could pass on both while a phone showed generic chrome in a faction dress. On
 * a phone, every faction read `mobile.topMembers` / `mobile.recentPraxis` and
 * exactly one bespoke key (its eyebrow); the manifesto, the spotlight and the
 * faction's own join flow did not exist there at all.
 *
 * So the load-bearing assertion is `speaks in its own voice`: at BOTH widths the
 * page must contain the faction's own section headings. That is the whole point
 * of the collapse, and it fails on `main` at `mobile` for all seven bespoke
 * factions.
 *
 * The expected strings are RESOLVED THROUGH i18n rather than hardcoded. The
 * catalogs are under concurrent edit (#1863's domain-word sweep), and a test
 * that pins English would go red on a pure copy change while proving nothing
 * extra — what is being asserted is "this faction's key rendered here", not what
 * the key says today.
 *
 * `useFormFactor` is mocked because the harness has no DOM: `renderToStaticMarkup`
 * always takes `useSyncExternalStore`'s server snapshot ('desktop'), so the
 * phone rendering is only reachable through the mock. `useFactionDetail` is
 * mocked because it is effect-driven and effects never run here — the state it
 * returns is the stable contract every body consumes, so handing one in is the
 * same seam the page sees in a browser.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect, vi } from 'vitest'
// Initialize the i18n catalog so faction copy keys resolve to English text.
import '../../../i18n'
import i18next from 'i18next'
import type {
  FactionDetailState,
  Membership,
  MembershipState,
} from '../useFactionDetail'
import type { CharacterOut } from '../../../api/auth'
import { factionName } from '../../../utils/factions'
import { aPraxisCard } from '../../../test/fixtures'

const mocks = vi.hoisted(() => ({
  formFactor: 'desktop' as 'mobile' | 'desktop',
  state: undefined as unknown as FactionDetailState,
}))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

vi.mock('../useFactionDetail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../useFactionDetail')>()),
  useFactionDetail: () => mocks.state,
}))

// Loaded after the mocks, so the page picks them up.
const FactionDetail = (await import('../../FactionDetail')).default

/**
 * A string per faction that only that faction's body draws, unconditionally.
 *
 * This was THREE each — the long-form panel's heading, the roster's and the task
 * section's. #1911 collapsed all three families onto shared keys, so those
 * headings say the same words on every faction now and can no longer tell one
 * body from another. What is left, and what the audit deliberately KEPT in each
 * house's own voice, is the join panel's own name for itself: The Road, THE
 * ROLL, ACCESS, S.N.I.D.E., Those practising, THE MUSTER, the
 * circle. Seven distinct strings, one per body, still drawn at both widths —
 * which is the property this suite exists for.
 */
const OWN_VOICE: Record<string, readonly string[]> = {
  coven: ['coven.join.heading'],
  ephemerists: ['ephemerists.join.heading'],
  everymen: ['everymen.join.heading'],
  singularity: ['singularity.join.heading'],
  // S.N.I.D.E.'s panel is a dispatch, so its heading is the letterhead
  // wordmark. #2299 renamed the KEY (`letterhead` -> `heading`); the memo
  // framing lives in the value and the CSS and did not move.
  snide: ['snide.join.heading'],
  ua: ['ua.join.heading'],
  wow: ['wow.join.heading'],
}

/**
 * Each faction's own Join verb. `albescent` is the fall-through to
 * `DefaultFactionBody`, whose join block is the one lifted out of the retired
 * `DefaultFactionPage` — it keeps that skin's generic interpolated verb, moved to `detail.join.joinButton` by #2651. The other
 * seven are `<slug>.join.joinButton` since #2299 gave them one key path.
 */
const JOIN_BUTTON: Record<string, string> = {
  coven: 'coven.join.joinButton',
  ephemerists: 'ephemerists.join.joinButton',
  everymen: 'everymen.join.joinButton',
  singularity: 'singularity.join.joinButton',
  snide: 'snide.join.joinButton',
  ua: 'ua.join.joinButton',
  wow: 'wow.join.joinButton',
  albescent: 'detail.join.joinButton',
}

/** The factions that dress this surface, plus the one that still falls through. */
const SLUGS = [...Object.keys(OWN_VOICE), 'albescent'] as const
const FORM_FACTORS = ['desktop', 'mobile'] as const

const MEMBER: CharacterOut = {
  id: 7,
  username: 'ada',
  display_name: 'Ada Reed',
  bio: '',
  tagline: '',
  avatar_url: '',
  location: '',
  level: 4,
  score: 120,
  all_time_score: 340,
  faction_slug: 'everymen',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  badges: [],
  invitations: [],
}

const PRAXIS = aPraxisCard({
  task_id: 11,
  task_title: 'Plant a tree',
  task_point_value: 20,
  title: 'My sapling',
  created_by_id: 7,
  created_by_display_name: 'Ada Reed',
  created_at: '2026-01-02T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  score: 24,
  voter_count: 3,
  task_faction_slug: 'everymen',
})

function membership(overrides: Partial<Membership> = {}): Membership {
  return {
    state: 'eligible',
    currentFactionSlug: null,
    join: async () => {},
    joining: false,
    joinError: null,
    ...overrides,
  }
}

function stateFor(slug: string, overrides: Partial<FactionDetailState> = {}): FactionDetailState {
  return {
    slug,
    loading: false,
    faction: { slug, status: 'visible' },
    fetchError: null,
    members: [MEMBER],
    tasks: [],
    recentPraxis: [PRAXIS],
    viewerFactionSlug: null,
    gameFactions: [],
    onSignup: undefined,
    signupMsg: null,
    membership: membership(),
    ...overrides,
  }
}

/** `renderToStaticMarkup` escapes `& < > " '`; undo that so copy matches plainly. */
function decode(value: string): string {
  return value
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function page(
  slug: string,
  formFactor: (typeof FORM_FACTORS)[number],
  overrides: Partial<FactionDetailState> = {},
): { html: string; text: string } {
  mocks.formFactor = formFactor
  mocks.state = stateFor(slug, overrides)
  const element: ReactElement = <FactionDetail slug={slug} />
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: decode(html.replace(/<[^>]*>/g, '')) }
}

/**
 * The catalog's English for a key, decoded the same way the markup is.
 *
 * `t` is typed to the literal key union, and these keys are looked up from a
 * table — the same widening cast `WowFactionBody`'s charter reader uses.
 */
const translate = i18next.t as unknown as (
  key: string,
  options: Record<string, unknown>,
) => string

function copy(key: string, vars: Record<string, string> = {}): string {
  return decode(translate(key, { ns: 'factions', ...vars }))
}

describe('faction detail serves one responsive body at both widths', () => {
  for (const formFactor of FORM_FACTORS) {
    for (const slug of Object.keys(OWN_VOICE)) {
      it(`${slug} speaks in its own voice at ${formFactor}`, () => {
        const { text } = page(slug, formFactor)
        for (const key of OWN_VOICE[slug]) {
          expect(text, `${slug} draws ${key}`).toContain(copy(key))
        }
      })
    }

    for (const slug of SLUGS) {
      it(`${slug} keeps its content slots at ${formFactor}`, () => {
        const { html, text } = page(slug, formFactor)
        expect(text, 'a member').toContain('Ada Reed')
        expect(html, 'linked to their profile').toContain('href="/characters/7"')
        expect(text, 'a recent praxis').toContain('My sapling')
      })

      /**
       * #1817 — the page's outline opens with exactly one `<h1>`, and it names
       * the faction. Carried over from the retired `mobileArchetypeSlots` test;
       * the heading now comes from the hero (or the shared `PageTitle` chrome
       * for the fall-through), so the guard has to sit at the page.
       */
      it(`${slug} opens the outline with one h1 at ${formFactor}`, () => {
        const { html } = page(slug, formFactor)
        expect([...html.matchAll(/<h1\b/g)], 'exactly one page heading').toHaveLength(1)
      })

      /**
       * ADR-0019: joining is invite-earned and irreversible, so the CTA is
       * hidden — not disabled — for anyone who cannot act. This is the assertion
       * that catches Ruling 2's asymmetry: before this change `albescent`
       * (the one faction still falling through to `DefaultFactionBody`) drew no
       * join control on a desktop while its phone twin drew one.
       */
      it(`${slug} offers the join only to an eligible viewer at ${formFactor}`, () => {
        const button = copy(JOIN_BUTTON[slug], { faction: factionName(slug) })

        const eligible = page(slug, formFactor, {
          membership: membership({ state: 'eligible' }),
        })
        expect(eligible.text, 'an eligible viewer gets the CTA').toContain(button)

        for (const state of ['none', 'gate', 'member'] as const) {
          const other = page(slug, formFactor, { membership: membership({ state }) })
          expect(other.text, `no CTA for a "${state}" viewer`).not.toContain(button)
        }
      })

      it(`${slug} tells a burned viewer the era is closed at ${formFactor}`, () => {
        const notice = copy('detail.burned.body', { faction: factionName(slug) })
        const burned = page(slug, formFactor, {
          membership: membership({ state: 'burned' as MembershipState }),
        })
        if (slug === 'ua') {
          // UA is graduation-gated: the hook resolves it to "none" before any
          // status is read (#200/#243), so it must never grow a burned notice.
          expect(burned.text, 'UA never burns').not.toContain(notice)
        } else {
          expect(burned.text, 'the era notice').toContain(notice)
        }
      })
    }
  }
})

/**
 * The two things ADR-0069's rule calls STRUCTURAL rather than cosmetic, so they
 * had to survive the collapse rather than resolve to a desktop value.
 */
describe('the structural survivors', () => {
  it("keeps WOW's 46px touch targets on the muster roll (#895)", () => {
    // A floor, so it is applied at both widths — the laptop row already clears
    // it. Asserted at both so a later "tidy-up" cannot drop it from the phone.
    for (const formFactor of FORM_FACTORS) {
      expect(page('wow', formFactor).html, `${formFactor} roll row`).toContain(
        'min-height:46px',
      )
    }
  })

  it("stacks Singularity's terminal masthead on a phone", () => {
    // The one faction hero laid out as a hard `1fr 240px` grid; every other one
    // wraps. It had never rendered under 768px before this collapse.
    expect(page('singularity', 'desktop').html).toContain('grid-template-columns:1fr 240px')
    expect(page('singularity', 'mobile').html).not.toContain('grid-template-columns:1fr 240px')
  })

  it('pins the fall-through join action above the tab bar on a phone', () => {
    // `MobileStickyBar`'s new home. `albescent` is the one faction reaching
    // `DefaultFactionBody`, which is the bar's only consumer.
    const eligible = { membership: membership({ state: 'eligible' }) }
    expect(page('albescent', 'mobile', eligible).html, 'pinned on a phone').toContain(
      'bottom:var(--tab-bar-clearance)',
    )
    expect(page('albescent', 'desktop', eligible).html, 'inline on a laptop').not.toContain(
      'bottom:var(--tab-bar-clearance)',
    )
  })
})

/**
 * Carried over from the retired `uaMobileDispatch` test, which pinned this on
 * the phone skin only. #788 killed the salon; the guard has to follow UA's
 * surviving body to the width the skin used to own.
 */
describe('UA carries no gold at either width', () => {
  for (const formFactor of FORM_FACTORS) {
    it(`the legacy --ua-* palette and Cinzel stay dead at ${formFactor}`, () => {
      const { html } = page('ua', formFactor)
      expect(html).not.toMatch(/--ua-(gold|gilt|paper|wall|line|ink|sub|muted|orange)/)
      expect(html).not.toMatch(/--font-faction-engraved/)
    })
  }
})

/**
 * The praxis row wraps at TWO on a faction page, not three (#2313).
 *
 * The seam is the flex BASIS each archetype emits on the praxis card's wrapper.
 * Six of the eight hardcoded `1 1 280px` there — a second number beside the one
 * `frameBase` already asks for, and 280 is the card's own MIN-WIDTH, the floor
 * that keeps a phone at one card per row. Used as a basis it says where the row
 * WRAPS, so three of them fitted the ~956px main column.
 *
 * CEILING (`renderToStaticMarkup`, no jsdom, no layout, no computed styles):
 * nothing here can be MEASURED, so this asserts the declaration rather than a
 * box. The arithmetic it stands in for: `--shell-max-width` 1392px less `px-10`
 * a side, with `.wz-faction-grid` at `1fr 322px` and a 34px gap, tops the main
 * column near 956px — under the 1182px three 394px cards need and under the
 * 992px three 320px ones need, so the row wraps at two at every supported width.
 *
 * The NEGATIVE is the load-bearing half: it is what stops a ninth archetype, or
 * a rebase, reintroducing a hardcoded basis on whatever wrapper it writes.
 */
describe('the faction praxis row asks the container where to wrap (#2313)', () => {
  for (const slug of SLUGS) {
    it(`${slug} takes its praxis basis from --praxis-card-basis`, () => {
      const { html } = page(slug, 'desktop')
      expect(html, 'the container decides the basis').toContain(
        'flex:1 1 var(--praxis-card-basis, 394px)',
      )
      expect(html, 'no archetype reinvents the basis as the min-width floor').not.toContain(
        '1 1 280px',
      )
      expect(html, 'the 280px floor stays').toContain('min-width:280px')
    })
  }
})

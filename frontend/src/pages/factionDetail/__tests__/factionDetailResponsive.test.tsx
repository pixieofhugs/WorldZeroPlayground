/**
 * `FactionDetail`'s `factionBody` dispatch × `useFormFactor()` (#1314): one
 * registry walked at both form factors (ADR-0069), so a phone can't fall back to
 * generic chrome. Expected copy is resolved through i18n so copy edits don't break it.
 * `useFormFactor` is mocked because SSR always takes the 'desktop' snapshot;
 * `useFactionDetail` because its effects never run here.
 */
import { readFileSync } from 'node:fs'
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

/** A string only that faction's body draws: the join panel's own heading (#1911). */
const OWN_VOICE: Record<string, readonly string[]> = {
  coven: ['coven.join.heading'],
  ephemerists: ['ephemerists.join.heading'],
  everymen: ['everymen.join.heading'],
  singularity: ['singularity.join.heading'],
  snide: ['snide.join.heading'],
  ua: ['ua.join.heading'],
  wow: ['wow.join.heading'],
}

/** Each faction's Join verb; `albescent` falls through to `DefaultFactionBody`'s generic one. */
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

/** Widened `t`: these keys come from a table, not the literal key union. */
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

      // #1817: the h1 comes from the hero or `PageTitle`, so the guard sits at the page.
      it(`${slug} opens the outline with one h1 at ${formFactor}`, () => {
        const { html } = page(slug, formFactor)
        expect([...html.matchAll(/<h1\b/g)], 'exactly one page heading').toHaveLength(1)
      })

      // ADR-0019: the CTA is hidden, not disabled, for anyone who cannot act.
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
        // UA burns like the rest (ADR-0030, #2660).
        expect(burned.text, 'the era notice').toContain(notice)
      })
    }
  }
})

/**
 * Body of the first `@media` block on `query` containing `needle`, read by brace
 * depth (the file has several blocks on the same query); `null` if none.
 */
function mediaBlockContaining(css: string, query: string, needle: string): string | null {
  for (let from = 0; ; ) {
    const at = css.indexOf(query, from)
    if (at === -1) return null
    const open = css.indexOf('{', at)
    if (open === -1) return null
    let depth = 0
    let end = open
    for (; end < css.length; end++) {
      if (css[end] === '{') depth++
      else if (css[end] === '}' && --depth === 0) break
    }
    const body = css.slice(open + 1, end)
    if (body.includes(needle)) return body
    from = at + query.length
  }
}

describe('the structural survivors', () => {
  it("keeps WOW's 46px touch targets on the muster roll (#895)", () => {
    for (const formFactor of FORM_FACTORS) {
      expect(page('wow', formFactor).html, `${formFactor} roll row`).toContain(
        'min-height:46px',
      )
    }
  })

  it("stacks Singularity's terminal masthead on a phone, in CSS", () => {
    // #2997: the split lives in `.sg-hero-split` CSS, so both renders are identical
    // and the phone stack is asserted in the stylesheet (SSR evaluates no media query).
    for (const formFactor of FORM_FACTORS) {
      expect(page('singularity', formFactor).html, `${formFactor} masthead`).toContain(
        'sg-hero-split',
      )
      expect(
        page('singularity', formFactor).html,
        `${formFactor} masthead must not re-inline the grid`,
      ).not.toContain('grid-template-columns:1fr 240px')
    }

    const css = readFileSync(
      new URL('../../../css/06-faction-chrome-2.css', import.meta.url),
      'utf8',
    )
    // Base rule, then phone override.
    const rules = [...css.matchAll(/\.sg-hero-split\s*\{([^}]*)\}/g)]
    expect(rules, '.sg-hero-split is not declared twice — base and phone').toHaveLength(2)
    expect(rules[0][1], 'the desktop rule lost the readout column').toContain(
      'grid-template-columns: 1fr 240px',
    )

    // Must be INSIDE a 767px block, not merely after one.
    const phoneBlock = mediaBlockContaining(css, '@media (max-width: 767px)', '.sg-hero-split')
    expect(phoneBlock, 'no 767px block contains .sg-hero-split').not.toBeNull()
    expect(phoneBlock!, 'the phone rule does not collapse to one column').toContain(
      'grid-template-columns: 1fr;',
    )
    expect(
      phoneBlock!.indexOf('.sg-hero-split'),
      'the phone rule is not inside the phone block',
    ).toBeGreaterThan(-1)
  })

  it('pins the fall-through join action above the tab bar on a phone', () => {
    // `DefaultFactionBody` (albescent) is `MobileStickyBar`'s only consumer.
    const eligible = { membership: membership({ state: 'eligible' }) }
    expect(page('albescent', 'mobile', eligible).html, 'pinned on a phone').toContain(
      'bottom:var(--tab-bar-clearance)',
    )
    expect(page('albescent', 'desktop', eligible).html, 'inline on a laptop').not.toContain(
      'bottom:var(--tab-bar-clearance)',
    )
  })
})

// #788
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
 * #2313: the praxis wrapper's flex basis comes from `--praxis-card-basis`; 280px
 * is the card's min-width floor, not a basis. No layout here, so this asserts the
 * declaration; the negative stops an archetype reintroducing a hardcoded basis.
 */
describe('the faction praxis row asks the container where to wrap (#2313)', () => {
  for (const slug of SLUGS) {
    it(`${slug} takes its praxis basis from --praxis-card-basis`, () => {
      const { html } = page(slug, 'desktop')
      // The cell never grows (0 1), so the row centres a lone card (#3296).
      expect(html, 'the container decides the basis').toMatch(
        /flex:[01] 1 var\(--praxis-card-basis, 394px\)/,
      )
      expect(html, 'no archetype reinvents the basis as the min-width floor').not.toContain(
        '1 1 280px',
      )
      expect(html, 'the 280px floor stays').toContain('min-width:280px')
    })
  }
})

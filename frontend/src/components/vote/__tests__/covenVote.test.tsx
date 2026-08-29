/**
 * CovenVote (#2020) — THE MOTIF SEAM.
 *
 * The widget drew moon phases on a night plate in both themes. It now draws a
 * SUN in light and the same moon in dark, and the seam under test is that
 * choice: `useTheme()` picks which geometry renders, and nothing else about the
 * widget forks. Three things can go wrong there and only one of them looks
 * broken on screen —
 *
 *   - the dark path changes at all (the moon is out of scope for #2020);
 *   - both plates render and one is hidden with CSS, which puts TEN rating
 *     buttons in the a11y-visible markup where there are five controls;
 *   - a colour arrives as a literal instead of a token, so it has no cascade.
 *
 * The harness is SSR-only (renderToStaticMarkup, no DOM, effects never run), so
 * this is also the reduced-motion reading: every animation is a CSS class gated
 * in index.css, and the markup below is what a stilled plate looks like.
 * `useTheme()` throws outside a `ThemeProvider` by design (#701), so it is
 * mocked rather than wrapped — the theme is an INPUT to this component, and a
 * provider would only hide which value produced which markup.
 *
 * The second describe measures the ink the sun is drawn with. It is not in
 * `factionContrast.test.ts` because that manifest is a (surface, TEXT) contract
 * and nothing on this plate is text; what the plate owes is 1.4.11 on the
 * reached state, and index.css records the walk that buys it.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CurrentUser } from '../../../api/auth'
import { AA_LARGE, contrastRatio, deltaE76, parseColor } from '../../../utils/contrast'
import { readThemes, resolveVar } from '../../../utils/__tests__/cssVars'

const mocks = vi.hoisted(() => ({
  user: null as CurrentUser | null,
  theme: 'light' as 'light' | 'dark',
  castVote: vi.fn(async () => ({}) as unknown),
}))

vi.mock('../../../auth/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user, refetch: async () => {} }),
}))
vi.mock('../../../api/votes', () => ({
  castVote: mocks.castVote,
}))
vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: mocks.theme, toggle: () => {} }),
}))

import CovenVote from '../CovenVote'
import { readIndexCss } from '../../../test/indexCss'

/** No hex may reach the markup — every colour is a token. */
const HEX = /#[0-9a-fA-F]{3,8}\b/

function currentUser(): CurrentUser {
  return {
    account_id: 1,
    email: 'wz_pilgrim@example.com',
    provider: 'google',
    character: {
      id: 9,
      username: 'ada',
      display_name: 'Ada',
      bio: '',
      tagline: '',
      avatar_url: '',
      location: '',
      level: 8,
      score: 100,
      all_time_score: 100,
      faction_slug: 'coven',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
      badges: [],
      invitations: [],
    },
    is_admin: false,
    can_create_additional_character: false,
    can_start_as_albescent: false,
    albescent_revealed: false,
    albescent_glimpsed: false,
    can_propose_task: false,
    can_propose_metatask: false,
    can_apply_metatask: false,
    can_see_retired_tasks: false,
    can_see_pending_tasks: false,
    can_comment: true,
    albescent_level_required: 8,
    second_character_level_required: 5,
    era_name: 'Era 1',
    level_jump_reach: 0,
    level_jump_available: false,
    task_browse_defaults_to_eligible: false,
  }
}

function render(theme: 'light' | 'dark', currentValue?: number): string {
  mocks.theme = theme
  return renderToStaticMarkup(
    <CovenVote praxisId={7} currentValue={currentValue} points={16} totalVotes={4} />,
  )
}

const count = (html: string, pattern: RegExp): number => (html.match(pattern) ?? []).length

describe('CovenVote picks a motif from the theme (#2020)', () => {
  it('draws the sun in light and nothing of the moon', () => {
    mocks.user = currentUser()
    const html = render('light', 5)
    expect(html).toContain('--faction-coven-sun-plate-from')
    expect(html).toContain('--faction-coven-sun-gold')
    expect(html).not.toContain('--faction-coven-moon-')
  })

  it('draws the moon in dark and nothing of the sun', () => {
    mocks.user = currentUser()
    const html = render('dark', 5)
    expect(html).toContain('--faction-coven-moon-plate-from')
    expect(html).toContain('--faction-coven-moon-gold')
    expect(html).not.toContain('--faction-coven-sun-')
  })

  /**
   * The trap the grill named: rendering both plates and hiding one with CSS.
   * `display:none` spares the a11y tree but not the markup, and five rating
   * controls that arrive as ten is the shape no visual check catches.
   */
  it('renders exactly five rating buttons in BOTH themes', () => {
    mocks.user = currentUser()
    for (const theme of ['light', 'dark'] as const) {
      expect(count(render(theme, 3), /<button/g)).toBe(5)
    }
  })

  /**
   * The climb is told in rays: `level * 2 + 2` around a disc that grows with the
   * level, so the five suns carry 4 + 6 + 8 + 10 + 12 = 40 ray strokes whatever
   * is selected. Pinned because it is the one part of the geometry a reader
   * cannot check by eye — miscounting rays still renders a plausible sun.
   */
  it('fans level * 2 + 2 rays per sun, 40 across the plate', () => {
    mocks.user = currentUser()
    expect(count(render('light', 5), /<line/g)).toBe(40)
    expect(count(render('light'), /<line/g)).toBe(40)
    // The moon is a phase path, not a fan — no rays anywhere on the night plate.
    expect(count(render('dark', 5), /<line/g)).toBe(0)
  })

  /**
   * The flourish is the moon's, REUSED — six dust motes across the plate and
   * four sparkles around the rank-5 disc, both driven by classes that already
   * exist inside `@media (prefers-reduced-motion: no-preference)`. A sun with
   * its own keyframes would be the same twinkle declared twice.
   */
  it('reuses the moon dust and sparkle classes on the sun', () => {
    mocks.user = currentUser()
    const html = render('light', 5)
    expect(count(html, /class="coven-moon-dust"/g)).toBe(6)
    expect(count(html, /class="coven-moon-sparkle"/g)).toBe(4)
    // The sun's own tokens fill them; the classes carry motion only.
    expect(html).toContain('--faction-coven-sun-dust')
    // The sparkles belong to a REACHED rank 5 and to nothing else — the dust
    // is plate furniture and stays whatever the viewer picked.
    expect(count(render('light', 4), /class="coven-moon-sparkle"/g)).toBe(0)
    expect(count(render('light'), /class="coven-moon-sparkle"/g)).toBe(0)
    expect(count(render('light', 4), /class="coven-moon-dust"/g)).toBe(6)
  })

  it('lets no colour literal into either plate', () => {
    mocks.user = currentUser()
    expect(render('light', 5)).not.toMatch(HEX)
    expect(render('dark', 5)).not.toMatch(HEX)
  })

  it('still returns the shared login gate for an anonymous viewer', () => {
    mocks.user = null
    const html = render('light')
    expect(html.replace(/<[^>]*>/g, '')).toContain('Log in to vote')
    expect(html).not.toContain('aria-label="Rate')
  })
})

const CSS = readIndexCss()
const THEMES = readThemes(CSS)
const ink = (name: string): string => {
  const value = resolveVar(name, 'light', THEMES)
  if (!value) throw new Error(`${name} is not declared in the light cascade`)
  return value
}
const solid = (name: string) => {
  const colour = parseColor(ink(name))
  if (!colour) throw new Error(`${name} does not resolve to a solid colour: ${ink(name)}`)
  return colour
}

describe('the sun plate is a LIGHT-ONLY family, and its lit inks clear 1.4.11', () => {
  /**
   * The moon family has no dark block because it is a night surface in both
   * cascades. The sun has none for the opposite reason: in dark the component
   * renders the moon, so a `--faction-coven-sun-*` under `[data-theme="dark"]`
   * would be a value nothing can read. index.css says so in a comment; this is
   * the comment with teeth.
   */
  it('declares no sun token in the dark cascade', () => {
    const darkSunTokens = [...THEMES.dark.keys()].filter((name) =>
      name.startsWith('--faction-coven-sun-'),
    )
    expect(darkSunTokens).toEqual([])
  })

  /**
   * Ratios on `-plate-to`, the radial gradient's darker stop and the worst
   * ground for a dark ink. Nothing here is text, so the floor is the non-text
   * 3:1 — what has to survive is "this rating is reached", and a hue swap alone
   * does not survive a reading that cannot see hue.
   */
  it('holds the rays, the limb and the face to 3:1 on the plate foot', () => {
    const foot = solid('--faction-coven-sun-plate-to')
    for (const name of [
      '--faction-coven-sun-gold',
      '--faction-coven-sun-ring-on',
      '--faction-coven-sun-face',
    ]) {
      expect(contrastRatio(solid(name), foot)).toBeGreaterThanOrEqual(AA_LARGE)
    }
    // The rank-5 face and the star are drawn on the disc, not on the plate.
    const disc = solid('--faction-coven-sun-disc-on')
    expect(contrastRatio(solid('--faction-coven-sun-face'), disc)).toBeGreaterThanOrEqual(AA_LARGE)
    expect(contrastRatio(solid('--faction-coven-sun-star'), disc)).toBeGreaterThanOrEqual(AA_LARGE)
  })

  /**
   * #2019's lesson, one issue later on the same faction: AA spends lightness,
   * and a pair separated by lightness alone collapses when it does. The rays
   * and the limb are the pair — the design drew them one hue apart in name only
   * — so the limb walks onto the palette's warmer hue and this is the floor
   * (§3, ΔE 20) that walk was chosen to clear.
   */
  it('keeps the rays and the limb ΔE 20 apart, the axis AA did not spend', () => {
    const distance = deltaE76(
      solid('--faction-coven-sun-gold'),
      solid('--faction-coven-sun-ring-on'),
    )
    expect(distance).toBeGreaterThanOrEqual(20)
  })

  /**
   * The state code itself. Lit vs unlit is the one distinction the plate cannot
   * lose, so it is pinned on BOTH axes — the hue jump a sighted reader sees and
   * the luminance step a monochrome one does.
   */
  it('separates a lit ray from an unlit one by hue AND by luminance', () => {
    const lit = solid('--faction-coven-sun-gold')
    const unlit = solid('--faction-coven-sun-lit-off')
    expect(deltaE76(lit, unlit)).toBeGreaterThanOrEqual(20)
    expect(contrastRatio(lit, unlit)).toBeGreaterThanOrEqual(AA_LARGE)
  })
})

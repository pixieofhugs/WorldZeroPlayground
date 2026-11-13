/**
 * CovenVote (#2020): `useTheme()` picks sun (light) or moon (dark); nothing else
 * forks. SSR markup is also the reduced-motion state. `useTheme` is mocked, not
 * wrapped in a provider (#701): the theme is an input here.
 *
 * Sun inks are checked here, not in `factionContrast.test.ts` (a TEXT contract):
 * the plate owes WCAG 1.4.11 non-text contrast on the reached state.
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
    is_owner: false,
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
    can_vote: true,
    vote_level_required: 1,
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

  /** Guards against rendering both plates and hiding one with CSS. */
  it('renders exactly five rating buttons in BOTH themes', () => {
    mocks.user = currentUser()
    for (const theme of ['light', 'dark'] as const) {
      expect(count(render(theme, 3), /<button/g)).toBe(5)
    }
  })

  /** 4 + 6 + 8 + 10 + 12 = 40; a miscount still renders a plausible sun. */
  it('fans level * 2 + 2 rays per sun, 40 across the plate', () => {
    mocks.user = currentUser()
    expect(count(render('light', 5), /<line/g)).toBe(40)
    expect(count(render('light'), /<line/g)).toBe(40)
    expect(count(render('dark', 5), /<line/g)).toBe(0)
  })

  /** The sun reuses the moon's already-guarded motion classes, not its own keyframes. */
  it('reuses the moon dust and sparkle classes on the sun', () => {
    mocks.user = currentUser()
    const html = render('light', 5)
    expect(count(html, /class="coven-moon-dust"/g)).toBe(6)
    expect(count(html, /class="coven-moon-sparkle"/g)).toBe(4)
    expect(html).toContain('--faction-coven-sun-dust')
    // Sparkles only on a reached rank 5; dust always.
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
  /** In dark the moon renders, so a dark sun token would be unreachable. */
  it('declares no sun token in the dark cascade', () => {
    const darkSunTokens = [...THEMES.dark.keys()].filter((name) =>
      name.startsWith('--faction-coven-sun-'),
    )
    expect(darkSunTokens).toEqual([])
  })

  /** On `-plate-to`, the gradient's worst ground for dark ink; non-text 3:1. */
  it('holds the rays, the limb and the face to 3:1 on the plate foot', () => {
    const foot = solid('--faction-coven-sun-plate-to')
    for (const name of [
      '--faction-coven-sun-gold',
      '--faction-coven-sun-ring-on',
      '--faction-coven-sun-face',
    ]) {
      expect(contrastRatio(solid(name), foot)).toBeGreaterThanOrEqual(AA_LARGE)
    }
    const disc = solid('--faction-coven-sun-disc-on')
    expect(contrastRatio(solid('--faction-coven-sun-face'), disc)).toBeGreaterThanOrEqual(AA_LARGE)
    expect(contrastRatio(solid('--faction-coven-sun-gold'), disc)).toBeGreaterThanOrEqual(AA_LARGE)
  })

  /** #2019: AA spends lightness, so rays and limb must differ by hue (§3, ΔE 20). */
  it('keeps the rays and the limb ΔE 20 apart, the axis AA did not spend', () => {
    const distance = deltaE76(
      solid('--faction-coven-sun-gold'),
      solid('--faction-coven-sun-ring-on'),
    )
    expect(distance).toBeGreaterThanOrEqual(20)
  })

  /** Lit vs unlit must survive both colour and monochrome reading. */
  it('separates a lit ray from an unlit one by hue AND by luminance', () => {
    const lit = solid('--faction-coven-sun-gold')
    const unlit = solid('--faction-coven-sun-lit-off')
    expect(deltaE76(lit, unlit)).toBeGreaterThanOrEqual(20)
    expect(contrastRatio(lit, unlit)).toBeGreaterThanOrEqual(AA_LARGE)
  })
})

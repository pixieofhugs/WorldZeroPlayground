/**
 * `FactionProfileBody` → every archetype: the words drawn at the TOP of the
 * era's curve (#2383), where `nextLevel` is null. Must not print "0 / 0 pts
 * this level" beside "next · lvl 8". Every kit, both form factors.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

import '../../../i18n'
import i18n from '../../../i18n'
import type { CharacterOut } from '../../../api/auth'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

import FactionProfileBody, { type ProfileBodyProps } from '../FactionProfileBody'

/** The eight kits `FactionProfileBody` dispatches to. */
const SLUGS = ['na', 'ua', 'snide', 'wow', 'coven', 'ephemerists', 'everymen', 'singularity']
const FORM_FACTORS = ['desktop', 'mobile'] as const

/** Where a level track is mounted: every kit, both widths (#2996). */
const TRACK_MOUNTS: Record<(typeof FORM_FACTORS)[number], readonly string[]> = {
  desktop: SLUGS,
  mobile: SLUGS,
}

/** Level 8 is the last rung of era 1's curve; `levelTrack` reports this shape. */
const AT_THE_TOP: ProfileBodyProps['progression'] = {
  nextLevel: null,
  currentThreshold: 2000,
  nextThreshold: 0,
  pointsIntoLevel: 0,
  levelSpan: 0,
  progressPercent: 100,
}

const MID_CLIMB: ProfileBodyProps['progression'] = {
  nextLevel: 8,
  currentThreshold: 1500,
  nextThreshold: 2000,
  pointsIntoLevel: 380,
  levelSpan: 500,
  progressPercent: 76,
}

function renderText(
  factionSlug: string,
  progression: ProfileBodyProps['progression'],
  level: number,
): string {
  const character: CharacterOut = {
    id: 7,
    username: 'reza',
    display_name: 'Reza',
    bio: '',
    tagline: '',
    avatar_url: '',
    location: '',
    level,
    score: 2400,
    all_time_score: 2400,
    faction_slug: factionSlug,
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
  }
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <FactionProfileBody
        character={character}
        submissions={[]}
        proposedTasks={[]}
        progression={progression}
        identityActions={null}
      />
    </MemoryRouter>,
  )
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
}

/** Resolved from the catalog so a copy edit moves this suite, not breaks it. */
const TOP_OF_LADDER = i18n.t('common:sidebar.characterCard.topLevel')
const ZERO_BAND = i18n.t('common:profile.ptsThisLevel', { current: 0, span: 0 })
const NEXT_IS_SELF = i18n.t('common:profile.nextLevel', { level: 8 })

describe('at the top of the era ladder, no profile prints a degenerate climb (#2383)', () => {
  it('has words to look for, so the loops below cannot pass by asserting nothing', () => {
    for (const word of [TOP_OF_LADDER, ZERO_BAND, NEXT_IS_SELF]) {
      expect(word.length).toBeGreaterThan(0)
    }
    // The exact strings the bug report showed.
    expect(ZERO_BAND).toContain('0 / 0')
    expect(NEXT_IS_SELF).toContain('8')
  })

  for (const formFactor of FORM_FACTORS) {
    for (const slug of TRACK_MOUNTS[formFactor]) {
      it(`${slug}/${formFactor} says the top of the ladder and nothing about 0 / 0`, () => {
        mocks.formFactor = formFactor
        const text = renderText(slug, AT_THE_TOP, 8)
        expect(text, `${slug}/${formFactor}: top-of-ladder line`).toContain(TOP_OF_LADDER)
        expect(text, `${slug}/${formFactor}: 0 / 0 band`).not.toContain(ZERO_BAND)
        expect(text, `${slug}/${formFactor}: next is itself`).not.toContain(NEXT_IS_SELF)
      })
    }
  }

  // Mid-climb is untouched; a fix that deleted both figures would pass above.
  for (const formFactor of FORM_FACTORS) {
    for (const slug of TRACK_MOUNTS[formFactor]) {
      it(`${slug}/${formFactor} still draws the band and the next rung mid-climb`, () => {
        mocks.formFactor = formFactor
        const text = renderText(slug, MID_CLIMB, 7)
        expect(text, `${slug}/${formFactor}: band`).toContain(
          i18n.t('common:profile.ptsThisLevel', { current: 380, span: 500 }),
        )
        expect(text, `${slug}/${formFactor}: next rung`).toContain(NEXT_IS_SELF)
        expect(text, `${slug}/${formFactor}: no top-of-ladder line`).not.toContain(TOP_OF_LADDER)
      })
    }
  }

  // wow/mobile was once exempt (#901); pin that it no longer is (#2996).
  it('wow/mobile reads the climb like every other profile', () => {
    mocks.formFactor = 'mobile'
    expect(renderText('wow', AT_THE_TOP, 8)).toContain(TOP_OF_LADDER)
    expect(renderText('wow', MID_CLIMB, 7)).toContain(NEXT_IS_SELF)
  })
})

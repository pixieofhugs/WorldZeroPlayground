/**
 * The seam: `FactionProfileBody` → every archetype → the words drawn for a
 * character at the TOP of the era's curve (#2383).
 *
 * `levelTrack` has always got the top right — `nextLevel: null`, a full bar,
 * and a band of width zero because there is no next threshold to subtract.
 * `ProfileProgression.nextLevel` was typed `number`, so `CharacterProfile` had
 * to coerce that `null` away (`track.nextLevel ?? character.level`), and the
 * profile printed the coercion: "0 / 0 pts this level" beside "next · lvl 8"
 * on a level-8 character. The field desk never had the bug — it honours the
 * `null` — so this file asks the profile the question the field desk already
 * answers.
 *
 * All eight kits, both form factors, because the readout has THREE mounts
 * (`DefaultProfileBody`'s two branches and the shared `profileSkin`) and a
 * fix to one of them typechecks perfectly while the other two keep printing
 * 0/0.
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

/**
 * Where a level track is actually mounted: EVERY KIT, BOTH WIDTHS.
 *
 * This was a table with a hole in it — on a phone WOW alone drew no track,
 * because its bespoke pavilion (#901) traded the whole thing for a tally of
 * deeds, and the exclusion had its own test at the bottom of this file so it
 * could not quietly widen. #2996 retired that renderer, so the hole closes and
 * the pinning test with it: WOW's phone reads the same climb as everyone's,
 * which is the shape this file was always asking for.
 */
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

  // The other half: mid-climb is untouched. A fix that simply deleted the two
  // figures would pass every assertion above.
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

  // The exclusion this replaced asserted the opposite — that wow/mobile drew no
  // climb readout at all — and it was true of the pavilion (#901), which had no
  // track to get either state wrong. Retired (#2996), so the assertion is that
  // WOW's phone is now IN the two loops above rather than exempt from them:
  // both states, on the one renderer the other eight already used.
  it('wow/mobile reads the climb like every other profile', () => {
    mocks.formFactor = 'mobile'
    expect(renderText('wow', AT_THE_TOP, 8)).toContain(TOP_OF_LADDER)
    expect(renderText('wow', MID_CLIMB, 7)).toContain(NEXT_IS_SELF)
  })
})

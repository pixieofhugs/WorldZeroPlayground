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
 * Where a level track is actually mounted. Every kit draws one on a laptop; on
 * a phone WOW alone does not — its mobile skin trades the track for a tally of
 * deeds. The exclusion is pinned by its own test at the bottom of this file so
 * it cannot quietly become a hole.
 */
const TRACK_MOUNTS: Record<(typeof FORM_FACTORS)[number], readonly string[]> = {
  desktop: SLUGS,
  mobile: SLUGS.filter((slug) => slug !== 'wow'),
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

  // The one exclusion above, asserted rather than assumed: WOW's phone skin
  // trades the whole track for a tally of deeds, so it has no climb readout to
  // get wrong. If it ever grows one, this fails and the skin joins the loops.
  it('wow/mobile draws no level track at all, in either state', () => {
    mocks.formFactor = 'mobile'
    for (const [track, level] of [
      [AT_THE_TOP, 8],
      [MID_CLIMB, 7],
    ] as const) {
      const text = renderText('wow', track, level)
      expect(text).not.toContain('pts this level')
      expect(text).not.toContain('next · ')
      expect(text).not.toContain(TOP_OF_LADDER)
    }
  })
})

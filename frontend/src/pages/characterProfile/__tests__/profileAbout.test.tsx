/**
 * The seam: `FactionProfileBody` × `character.bio` (#1626) — where a bio is
 * READ, now that the credential card no longer prints it.
 *
 * The card carried the bio as a two-line clamp, which on a 500-character field
 * showed its first sentence and hid the rest. #1626 deleted that slot, so the
 * field would have been editable in Settings and rendered NOWHERE unless the
 * profile picked it up. The ② About block is that pickup, and it has to reach
 * three renderers, not one:
 *
 *   · `DefaultProfileBody` → `DesktopProfile`   (na, albescent, any unskinned)
 *   · `DefaultProfileBody` → the phone stack    (a separate component, not a
 *                                                media query)
 *   · `ProfileSkin`                             (the seven faction kits)
 *
 * All three are `ProfileSkin` now (#2996) and the walk below is unchanged: the
 * counting assertions are about the BIO reaching one block and the card putting
 * it down, which is a question every renderer has to answer whether there are
 * three of them or one.
 *
 * The counting assertions are the load-bearing ones: a bio that appears exactly
 * once proves the About block picked it up AND that the card put it down. Before
 * this issue the same render carried it twice.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import '../../../i18n'
import type { CharacterOut } from '../../../api/auth'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

import FactionProfileBody, { type ProfileBodyProps } from '../FactionProfileBody'

const BIO = 'Keeps a field notebook.\nWalks the same three streets on purpose.'

function makeCharacter(overrides: Partial<CharacterOut> = {}): CharacterOut {
  return {
    id: 7,
    username: 'reza',
    display_name: 'Reza',
    bio: BIO,
    tagline: '',
    avatar_url: '',
    location: '',
    level: 7,
    score: 1880,
    all_time_score: 2400,
    faction_slug: 'na',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
    ...overrides,
  }
}

function renderBody(overrides: Partial<CharacterOut> = {}): string {
  const props: ProfileBodyProps = {
    character: makeCharacter(overrides),
    submissions: [],
    proposedTasks: [],
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

/** How many times the bio's text appears in the render. */
const bioCount = (html: string) => html.split('Keeps a field notebook.').length - 1

beforeEach(() => {
  mocks.formFactor = 'desktop'
})

/** The renderers, at both widths — `[case, slug, form factor]`. */
const BRANCHES: Array<[string, string, 'desktop' | 'mobile']> = [
  ['the na kit', 'na', 'desktop'],
  ['the na kit on a phone', 'na', 'mobile'],
  ['a faction kit through ProfileSkin', 'coven', 'desktop'],
  ['a faction kit on a phone', 'coven', 'mobile'],
  // The FOURTH renderer, missed when #1626 counted three: WOW's phone stack was
  // a bespoke skin (#901) routing through neither `ProfileSkin` nor
  // `DefaultProfileBody`, so a WOW player on a phone could write a bio in
  // Settings and never see it rendered anywhere. It is retired (#2996) and the
  // row stays — the cell it covers is still a cell, and it is the one this file
  // was extended for.
  ['WOW on a phone', 'wow', 'mobile'],
]

describe.each(BRANCHES)('② About on %s', (_case, slug, formFactor) => {
  const render = (bio: string) => {
    mocks.formFactor = formFactor
    return renderBody({ faction_slug: slug, bio })
  }

  it('renders the heading and the bio when there is one', () => {
    const html = render(BIO)
    expect(html, 'the section heading').toMatch(/>About</)
    expect(html, 'the bio itself').toContain('Keeps a field notebook.')
  })

  it('reads the bio exactly once — the card no longer carries it', () => {
    expect(bioCount(render(BIO))).toBe(1)
  })

  it('keeps the line breaks a player typed', () => {
    // Plain text, not markdown (#523 owns rich text): a typed newline survives
    // only because the paragraph is pre-wrap.
    expect(render(BIO)).toContain('white-space:pre-wrap')
  })

  // `CharacterOut.bio` is `string | undefined` on the wire, so "" and a
  // whitespace-only draft are the two blanks a player can actually produce.
  it.each([['empty', ''], ['whitespace only', '   \n '], ['absent', undefined]])(
    'hides the whole block — heading included — when the bio is %s',
    (_kind, bio) => {
      mocks.formFactor = formFactor
      const html = renderBody({ faction_slug: slug, bio })
      expect(html, 'no bio').not.toContain('Keeps a field notebook.')
      expect(html, 'no heading over nothing').not.toMatch(/>About</)
    },
  )
})

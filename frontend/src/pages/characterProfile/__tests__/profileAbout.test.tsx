/**
 * Where a bio is read now the credential card no longer prints it (#1626): the
 * About block. Appearing exactly once proves About picked it up AND the card put
 * it down.
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

const bioCount = (html: string) => html.split('Keeps a field notebook.').length - 1

beforeEach(() => {
  mocks.formFactor = 'desktop'
})

/** `[case, slug, form factor]`. */
const BRANCHES: Array<[string, string, 'desktop' | 'mobile']> = [
  ['the na kit', 'na', 'desktop'],
  ['the na kit on a phone', 'na', 'mobile'],
  ['a faction kit through ProfileSkin', 'coven', 'desktop'],
  ['a faction kit on a phone', 'coven', 'mobile'],
  // WOW's phone once had its own renderer that dropped the bio (#901); retired
  // in #2996, the row stays.
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
    // Plain text (#523 owns rich text); newlines survive via pre-wrap.
    expect(render(BIO)).toContain('white-space:pre-wrap')
  })

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

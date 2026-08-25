/**
 * DefaultComment — the Unaffiliated (`na`) comment sheet (#1195, epic #1192).
 *
 * `default ≡ na ≡ Unaffiliated` is one identity (ADR-0039 / 0046 / 0048), and
 * Albescent renders through this same component (`albescent ≡ na + drift`,
 * ADR-0048). These tests hold the na TELLS and the state slots the Unaffiliated
 * sheet draws; the faction voices have their own guards.
 *
 * Rendered to static markup (no DOM) per the comments-test convention, so
 * `useAuth` resolves to its anonymous default: the viewer owns nothing and can
 * flag nothing, which is the "row · default" reading of every case below.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so the neutral copy keys resolve to English text.
import '../../../i18n'
import type { CommentOut } from '../../../api/comments'
import type { CharacterOut } from '../../../api/auth'
import DefaultComment from '../Comment'

const COMMENT: CommentOut = {
  id: 7,
  praxis_id: 1,
  task_id: null,
  body_text: 'seedlings along the estuary',
  is_edited: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  author: {
    id: 42,
    username: 'ada',
    display_name: 'Adabel',
    avatar_url: '',
    faction_slug: 'na',
  },
  mentions: [],
}

const CHARACTER: CharacterOut = {
  id: 42,
  username: 'ada',
  display_name: 'Adabel',
  avatar_url: '',
  faction_slug: 'na',
  bio: '',
  tagline: '',
  location: '',
  level: 3,
  score: 0,
  all_time_score: 0,
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  badges: [],
  invitations: [],
}

function row(comment: CommentOut): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <DefaultComment mode="row" comment={comment} />
    </MemoryRouter>,
  )
}

function composer(submitting: boolean): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <DefaultComment
        mode="composer"
        character={CHARACTER}
        value=""
        onChange={() => {}}
        onSubmit={() => {}}
        submitting={submitting}
      />
    </MemoryRouter>,
  )
}

describe('DefaultComment — the na tells', () => {
  it('wears the spectrum hairline, not a grey one (factionFill, never factionCssVar)', () => {
    expect(row(COMMENT)).toContain('--faction-default-rainbow')
  })

  it('clips resolved @mentions to the spectrum (#970)', () => {
    const html = row({
      ...COMMENT,
      body_text: 'thank you @bo',
      mentions: [{ character_id: 9, username: 'bo', display_name: 'Bo' }],
    })
    expect(html).toContain('rainbow-ink')
    expect(html).toContain('href="/characters/9"')
  })

  it('leaves an unresolved handle as plain text', () => {
    const html = row({ ...COMMENT, body_text: 'thank you @ghost' })
    expect(html).toContain('@ghost')
    expect(html).not.toContain('rainbow-ink')
  })
})

describe('DefaultComment — row states', () => {
  it('row · default: author identity, body on the content floor, no edited mark', () => {
    const html = row(COMMENT)
    expect(html).toContain('href="/characters/42"')
    expect(html).toContain('Adabel')
    expect(html).toContain('seedlings along the estuary')
    expect(html).toContain('content-text')
    expect(html).not.toContain('edited')
  })

  it('row · edited: the edited mark joins the byline', () => {
    expect(row({ ...COMMENT, is_edited: true })).toContain('edited')
  })

  it('shows no owner row and no flag affordance to a signed-out viewer', () => {
    const html = row(COMMENT)
    expect(html).not.toContain('delete')
    expect(html).not.toContain('Flag')
  })
})

describe('DefaultComment — composer states', () => {
  it('composer · empty: carries the @-mention hint', () => {
    expect(composer(false)).toContain('@ to mention')
  })

  it('states the @ affordance exactly ONCE — the hint slot owns it, the placeholder does not', () => {
    const html = composer(false)
    expect(html).toContain('Say something worth keeping')
    expect(html.match(/to mention/g)).toHaveLength(1)
  })

  it('composer · submitting: marks itself busy and disables the field', () => {
    const html = composer(true)
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('disabled')
  })

  it('composer · empty is NOT busy', () => {
    expect(composer(false)).not.toContain('aria-busy="true"')
  })
})

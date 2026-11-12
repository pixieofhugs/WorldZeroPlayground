/**
 * The Ephemerists' comment voice (#1199). Pins the plate ground (ADR-0055), a body
 * rendered WHOLE (a drop cap once ate a leading `@mention`), and no raw hex.
 * Behaviour spec lives in `defaultComment.test.tsx`.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import type { CommentOut } from '../../../api/comments'
import type { CharacterOut } from '../../../api/auth'
import EphemeristsComment from '../voices/EphemeristsComment'

const COMMENT: CommentOut = {
  id: 7,
  praxis_id: 1,
  task_id: null,
  body_text: 'the river read three cubits at dawn',
  is_edited: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  author: {
    id: 42,
    username: 'ada',
    display_name: 'Adabel',
    avatar_url: '',
    faction_slug: 'ephemerists',
  },
  mentions: [],
}

const CHARACTER: CharacterOut = {
  id: 42,
  username: 'ada',
  display_name: 'Adabel',
  avatar_url: '',
  faction_slug: 'ephemerists',
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

function row(comment: CommentOut = COMMENT): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <EphemeristsComment mode="row" comment={comment} />
    </MemoryRouter>,
  )
}

function composer(submitting: boolean): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <EphemeristsComment
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

describe('EphemeristsComment — row states', () => {
  it('row · default: byline links the author, body sits on the content floor', () => {
    const html = row()
    expect(html).toContain('href="/characters/42"')
    expect(html).toContain('Adabel')
    expect(html).toContain('the river read three cubits at dawn')
    expect(html).toContain('content-text')
  })

  it('row · edited: the faction mark joins the byline', () => {
    expect(row({ ...COMMENT, is_edited: true })).toContain('edited')
    expect(row()).not.toContain('edited')
  })

  it('row · mention: a resolved handle links in the plate link ink', () => {
    const html = row({
      ...COMMENT,
      body_text: 'as @bo recorded',
      mentions: [{ character_id: 9, username: 'bo', display_name: 'Bo' }],
    })
    expect(html).toContain('href="/characters/9"')
    expect(html).toContain('--faction-ephemerists-plate-brass-light')
  })

  it('links a mention that OPENS the note — the drop cap used to eat its @', () => {
    const html = row({
      ...COMMENT,
      body_text: '@molly filed it first',
      mentions: [{ character_id: 11, username: 'molly', display_name: 'Molly' }],
    })
    expect(html).toContain('href="/characters/11"')
    expect(html).toContain('@molly')
  })

  it('shows no owner row and no flag affordance to a signed-out viewer', () => {
    const html = row()
    expect(html).not.toContain('delete')
    expect(html).not.toContain('Flag')
  })
})

describe('EphemeristsComment — composer states', () => {
  it('composer · empty: the shared prompt and the shared @-mention hint', () => {
    const html = composer(false)
    expect(html).toContain(i18n.t('praxis:comments.composerPlaceholder'))
    expect(html).toContain('@ to mention')
    expect(html).not.toContain('aria-busy="true"')
  })

  it('composer · submitting: marks itself busy and disables the field', () => {
    const html = composer(true)
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('disabled')
  })

  it('sets the submit button on the CTA pair, never on brass', () => {
    // `-brass` is a rule colour; the plate module forbids text on it.
    const html = composer(false)
    expect(html).toContain('--faction-ephemerists-plate-cta-bg')
    expect(html).toContain('--faction-ephemerists-plate-cta-ink')
  })

  // #2238: this leaf sets `overflow-wrap: anywhere`; the shared count's `nowrap`
  // must still hold inside it (see composerControls.test.tsx).
  it('cannot break the character count, wrap-anywhere leaf and all (#2238)', () => {
    const html = composer(false)
    expect(html, "the leaf's own wrap rule").toContain('overflow-wrap:anywhere')
    expect(html, 'and a count it cannot reach').toContain('white-space:nowrap')
  })
})

describe('EphemeristsComment — the Valley plate ground', () => {
  it('paints on the plate tokens', () => {
    const html = row()
    for (const token of [
      '--faction-ephemerists-plate-bg',
      '--faction-ephemerists-plate-ink',
      '--faction-ephemerists-plate-ochre',
      '--faction-ephemerists-plate-line',
    ]) {
      expect(html, `carries ${token}`).toContain(token)
    }
  })

  it('carries no illuminated-codex ink of its own (ADR-0055)', () => {
    // Not a blanket `--eph-` ban: the margin avatar is another surface (#11).
    const html = row() + composer(false)
    expect(html).not.toContain('--faction-ephemerists-card-')
  })

  it('names no colour in hex', () => {
    expect(row() + composer(false)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})

/**
 * S.N.I.D.E. comment voice — the intercepted slip (#1198, epic #1192).
 *
 * Rendered to static markup (no DOM) per the comments-test convention, so
 * `useAuth` resolves to its anonymous default — the viewer owns nothing and can
 * flag nothing, which is the "row · default" reading of every case below — and
 * `useFormFactor` falls to `getServerSnapshot`, i.e. desktop.
 *
 * These hold the SNIDE tells and the three inks the move to a paper stock forced
 * down. `defaultComment.test.tsx` holds the na tells; the shared behaviours
 * (`useOwnerEdit`, `useOwnerReveal`, `ComposerControls`, `CommentFlagControl`)
 * have their own suites and are not re-tested here.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so the copy keys resolve to English text.
import '../../../i18n'
import type { CommentOut } from '../../../api/comments'
import type { CharacterOut } from '../../../api/auth'
import SnideComment from '../voices/SnideComment'

const COMMENT: CommentOut = {
  id: 7,
  praxis_id: 1,
  task_id: null,
  body_text: 'the sign was already crooked when we got there',
  is_edited: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  author: {
    id: 42,
    username: 'vex',
    display_name: 'Vexline',
    avatar_url: '',
    faction_slug: 'snide',
  },
  mentions: [],
}

const CHARACTER: CharacterOut = {
  id: 42,
  username: 'vex',
  display_name: 'Vexline',
  avatar_url: '',
  faction_slug: 'snide',
  bio: '',
  tagline: '',
  location: '',
  level: 4,
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
      <SnideComment mode="row" comment={comment} />
    </MemoryRouter>,
  )
}

function composer(submitting: boolean): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <SnideComment
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

describe('SnideComment — the slip tells', () => {
  it('cuts the author name from ransom scraps and links it to the character', () => {
    const html = row()
    expect(html).toContain('href="/characters/42"')
    // Letter-by-letter: the name never appears as one string.
    expect(html).not.toContain('>Vexline<')
    expect(html).toContain('--faction-snide-font-impact')
    expect(html).toContain('--faction-snide-font-black')
  })

  it('tapes the slip down and rasters the stock', () => {
    const html = row()
    expect(html).toContain('snide-tape')
    expect(html).toContain('--faction-snide-slip-grain')
  })

  it('sits on the FLIPPING stock, not the theme-invariant photocopier card', () => {
    // The slots this voice does not write — OwnerControls, CommentFlagControl,
    // the shared editor — paint the app's global inks, which flip. §3 (#1118).
    const html = row()
    expect(html).toContain('--faction-snide-slip-paper')
    expect(html).not.toContain('--faction-snide-card-bg')
  })
})

describe('SnideComment — acid and pink are drawn things, not inks (#1224)', () => {
  it('paints a resolved @mention in the WALKED-DOWN acid, never the poster acid', () => {
    const html = row({
      ...COMMENT,
      body_text: 'ask @bo',
      mentions: [{ character_id: 9, username: 'bo', display_name: 'Bo' }],
    })
    expect(html).toContain('href="/characters/9"')
    expect(html).toContain('--faction-snide-slip-acid-ink')
  })

  it('leaves an unresolved handle as plain text', () => {
    const html = row({ ...COMMENT, body_text: 'ask @ghost' })
    expect(html).toContain('@ghost')
    expect(html).not.toContain('--faction-snide-slip-acid-ink')
  })

  it('scrawls the composer prompt in the walked-down pink', () => {
    const html = composer(false)
    expect(html).toContain('--faction-snide-slip-pink-ink')
    expect(html).not.toContain('color:var(--faction-snide-pink)')
  })

  it('carries no hardcoded colour literal — every pigment is a token', () => {
    const html = row() + composer(false)
    expect(html).not.toContain('#fff')
    expect(html).not.toContain('rgba(255,255,255')
  })
})

describe('SnideComment — row states', () => {
  it('row · default: identity, the typed body on the content floor, no edited mark', () => {
    const html = row()
    expect(html).toContain('the sign was already crooked when we got there')
    expect(html).toContain('content-text')
    // The sheet's body face is Special Elite, and somebody else's prose is not
    // shouted: no forced uppercase on the body slot.
    expect(html).toContain('--faction-snide-font-type')
    expect(html).not.toContain('EDITED')
  })

  it('row · edited: the typed edited mark joins the byline', () => {
    expect(row({ ...COMMENT, is_edited: true })).toContain('EDITED')
  })

  it('shows no owner row and no flag affordance to a signed-out viewer', () => {
    // Nothing to put in the foot means no foot, and so no censor rule over
    // empty space.
    const html = row()
    expect(html).not.toContain('delete')
    expect(html).not.toContain('Flag')
    expect(html).not.toContain('--faction-snide-slip-rule')
  })
})

describe('SnideComment — composer states', () => {
  it('composer · empty: carries the @-mention hint exactly once', () => {
    const html = composer(false)
    expect(html).toContain('@ to mention')
    expect(html.match(/to mention/g)).toHaveLength(1)
  })

  it('composer · submitting: marks the slip busy and disables the field', () => {
    const html = composer(true)
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('disabled')
  })

  it('composer · empty is NOT busy', () => {
    expect(composer(false)).not.toContain('aria-busy="true"')
  })

  it('prints the press ink on the acid submit fill, not the sheet ink', () => {
    // The sheet's ink SWAPS with the theme; pairing it with acid would put
    // paper-white type on acid green under [data-theme="dark"].
    const html = composer(false)
    expect(html).toContain('background:var(--faction-snide-acid)')
    expect(html).toContain('color:var(--faction-snide-ink)')
  })
})

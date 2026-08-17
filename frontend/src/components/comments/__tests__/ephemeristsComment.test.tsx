/**
 * The Ephemerists' comment VOICE (#1199, epic #1192).
 *
 * `defaultComment.test.tsx` beside this file holds the Unaffiliated sheet, which
 * is the copy and behaviour spec. Guarded here is only what this voice owns:
 *
 *  - the plate ground, not the retired illuminated-codex one (ADR-0055);
 *  - **the body is rendered WHOLE.** The old dress lifted the first character out
 *    into a rubric drop cap, so a note opening with a mention lost the mention:
 *    `MentionText` was handed the body minus its `@`. That is the regression this
 *    file exists to pin.
 *  - no raw hex, in a file whose whole job is colour.
 *
 * Static markup only (no DOM), the comments-test convention — so `useAuth`
 * resolves to its anonymous default: the viewer owns nothing and can flag
 * nothing, which is the "row · default" reading of every case below. The owner
 * and editing states are driven by state a static render cannot reach; they are
 * asserted at their seam instead (`OwnerControls.test.tsx`).
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so the neutral copy keys resolve to English text.
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
    // `comments.edited` held the flavour word `emended` until
    // #1863 settled the edited marker on one word for every faction.
    expect(row({ ...COMMENT, is_edited: true })).toContain('edited')
    expect(row()).not.toContain('edited')
  })

  it('row · mention: a resolved handle links in the plate Nile ink', () => {
    const html = row({
      ...COMMENT,
      body_text: 'as @bo recorded',
      mentions: [{ character_id: 9, username: 'bo', display_name: 'Bo' }],
    })
    expect(html).toContain('href="/characters/9"')
    expect(html).toContain('--faction-ephemerists-plate-nile')
  })

  it('links a mention that OPENS the note — the drop cap used to eat its @', () => {
    // The regression. The rubric cap was built as `body[0]` + `body.slice(1)`, so
    // this body reached MentionText as "molly filed it first" with no handle to
    // match, and the '@' was set 34px high in its place.
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
    // The faction prompt line ("inscribe a note in the margin") was one of the
    // four #1911 collapsed onto `comments.composerPlaceholder`; the textarea
    // already showed that sentence, so the line went rather than restating it.
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
    // `-brass` is a rule colour the plate module forbids putting text on.
    const html = composer(false)
    expect(html).toContain('--faction-ephemerists-plate-cta-bg')
    expect(html).toContain('--faction-ephemerists-plate-cta-ink')
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
    // `--faction-ephemerists-card-*` is the codex family this voice used to be
    // painted in, and nothing else on the sheet emits it — so its absence is
    // exactly the metaphor swap.
    //
    // Deliberately NOT a blanket ban on `--eph-`: the avatar in the margin is a
    // DIFFERENT per-faction surface (#11, `EphemeristsAvatar`) and still wears
    // the codex atoms. Migrating it is not this issue's footprint, and asserting
    // it here would pin someone else's file through this test.
    const html = row() + composer(false)
    expect(html).not.toContain('--faction-ephemerists-card-')
  })

  it('names no colour in hex', () => {
    expect(row() + composer(false)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})

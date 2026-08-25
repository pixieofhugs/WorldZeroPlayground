/**
 * WowComment — counsel on the proclamation (#1204, epic #1192).
 *
 * The states the sheet draws, plus the two things this dress must not get wrong:
 * the comment card wears the SAME chrome as WOW's feed card (one sheet drew
 * both), and no muted ink lands on the parchment plate (#1221 measured
 * `--faction-wow-card-muted` at 4.25:1 there — it is a cream-only ink).
 *
 * `renderToStaticMarkup` per the comments-test convention, so `useAuth` resolves
 * to its anonymous default: the viewer owns nothing and can flag nothing, which
 * is the "row · default" reading of every case below. The owner states (yours ·
 * hover, editing) run on `useOwnerEdit` / `useOwnerReveal`, which are pinned in
 * `OwnerControls.test.tsx`; this voice only wires them.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import i18n from '../../../i18n'
import type { CommentOut } from '../../../api/comments'
import type { CharacterOut } from '../../../api/auth'
import WowComment from '../voices/WowComment'

const COMMENT: CommentOut = {
  id: 7,
  praxis_id: 1,
  task_id: null,
  body_text: 'the verge is planted, and the horn was sounded',
  is_edited: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  author: {
    id: 42,
    username: 'ada',
    display_name: 'Adabel',
    avatar_url: '',
    faction_slug: 'wow',
  },
  mentions: [],
}

const CHARACTER: CharacterOut = {
  id: 42,
  username: 'ada',
  display_name: 'Adabel',
  avatar_url: '',
  faction_slug: 'wow',
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
      <WowComment mode="row" comment={comment} />
    </MemoryRouter>,
  )
}

function composer(submitting: boolean): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <WowComment
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

const RIBBON = '--faction-wow-quest-ribbon'

describe('the comment wears the proclamation chrome', () => {
  it('is crowned by the barber ribbon, in a 2px gold frame at radius 9', () => {
    const html = row()
    expect(html).toContain(RIBBON)
    expect(html).toContain('height:6px')
    expect(html).toContain('border-radius:9px')
    expect(html).toContain('2px solid var(--faction-wow-chronicle-gold)')
    // The sheet asks the faction for its `paper` ROLE (#2674) and carries
    // today's token as the fallback, so the cream is the cream it always was.
    expect(html).toContain('background:var(--wow-comment-paper, var(--faction-wow-card-bg))')
  })

  it('letters the name in MedievalSharp and the quiet register in Lora italic', () => {
    const html = row()
    expect(html).toContain('var(--faction-wow-card-font)')
    expect(html).toContain('var(--faction-wow-body-font)')
    expect(html).toContain('font-style:italic')
  })

  it('never lays a muted mark on the parchment plate (#1221)', () => {
    // The plate is legible under `-card-text` (13:1) and NOT under `-card-muted`
    // (4.25:1), so a resting row — every mark on which is ink or muted — must not
    // reach for it at all.
    const html = row()
    expect(html).toContain('var(--faction-wow-card-muted)')
    expect(html).not.toContain('--faction-wow-chronicle-panel')
  })

  it('uses the plate only for the composer FIELD, whose ink is card-text', () => {
    expect(composer(false)).toContain('--faction-wow-chronicle-panel')
  })
})

describe('row states', () => {
  it('row · default: author identity, body on the content floor, no edited mark', () => {
    const html = row()
    expect(html).toContain('href="/characters/42"')
    expect(html).toContain('Adabel')
    expect(html).toContain('the verge is planted')
    expect(html).toContain('content-text')
    expect(html).not.toContain(i18n.t('praxis:comments.edited'))
  })

  it('row · with a mention: a resolved handle links to the character', () => {
    const html = row({
      ...COMMENT,
      body_text: 'well fought @bo',
      mentions: [{ character_id: 9, username: 'bo', display_name: 'Bo' }],
    })
    expect(html).toContain('href="/characters/9"')
    expect(html).toContain('@bo')
    // Plum is the mention's ink, not the spectrum: that clip is the na tell.
    expect(html).toContain('var(--faction-wow-card-accent)')
    expect(html).not.toContain('rainbow-ink')
  })

  it('leaves an unresolved handle as plain text', () => {
    const html = row({ ...COMMENT, body_text: 'well fought @ghost' })
    expect(html).toContain('@ghost')
    expect(html).not.toContain('href="/characters/9"')
  })

  it('row · edited: the amended mark joins the byline', () => {
    expect(row({ ...COMMENT, is_edited: true })).toContain(i18n.t('praxis:comments.edited'))
  })

  it('shows no owner row and no flag affordance to a signed-out viewer', () => {
    const html = row()
    expect(html).not.toContain(i18n.t('praxis:comments.delete'))
    expect(html).not.toContain('Flag')
    // No foot means no section rule over empty space either.
    expect(html.split(RIBBON).length - 1, 'the crown only').toBe(1)
  })

  it('draws no reaction pill — nothing in the product can answer one', () => {
    // The kit draws "✦ Huzzah · 12" and #898 shipped the word, but there is no
    // reaction endpoint, column or count. A control that no-ops is forbidden.
    //
    // The word is spelled out because #1909 DELETED `praxis:comments.wow.react`
    // as dead copy: a key kept alive only by a negative assertion is one the
    // next dead-key sweep cannot tell from a live one. The ✦ is carried too, so
    // this cannot pass or fail on `comments.wow.empty`, which says "Huzzah" in
    // a sentence about having no counsel yet.
    expect(row()).not.toContain('✦ Huzzah')
  })
})

describe('composer states', () => {
  it('composer · empty: the prompt, the section rule and the @-mention hint', () => {
    // The prompt was WOW's own gilt line ("Add thy counsel to the chronicle…").
    // #1911 collapsed the four bespoke prompts onto the shared placeholder the
    // textarea already carries, so the sentence is asserted where it now
    // renders — once, in the field — rather than twice on one composer.
    const html = composer(false)
    expect(html).toContain(i18n.t('praxis:comments.composerPlaceholder'))
    expect(html).toContain('@ to mention')
    expect(html.split(RIBBON).length - 1, 'crown + section rule').toBe(2)
  })

  it('states the @ affordance exactly ONCE — the hint owns it, not the placeholder', () => {
    expect(composer(false).match(/to mention/g)).toHaveLength(1)
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

/**
 * THE EPHEMERISTS' COMMENT, NOW A TOKEN SET (#1199 dressed it; #2650 deleted
 * the file that dressed it).
 *
 * The voice turned out to be pure chrome, so it is
 * `--faction-ephemerists-comment-*` in index.css and the shared `Comment`
 * chassis paints it. That MOVES what this file can assert, and it is worth
 * saying where: the render used to name `--faction-ephemerists-plate-*` inline
 * and now names the comment SLOT, with the plate token one alias behind it. So
 * the two halves are checked separately — the render reaches for the right
 * slot, and index.css points that slot at the right plate token. An alias
 * cannot drift from itself; what can drift is a slot re-pointed somewhere new,
 * and that fails here.
 *
 * Guarded, unchanged from #1199:
 *
 *  - the plate ground, not the retired illuminated-codex one (ADR-0055);
 *  - **the body is rendered WHOLE.** The old dress lifted the first character
 *    out into a rubric drop cap, so a note opening with a mention lost the
 *    mention: `MentionText` was handed the body minus its `@`. That regression
 *    outlives the file that caused it — the chassis could reintroduce it for
 *    all nine at once, which is a better reason to keep the case than the one
 *    it was written for.
 *  - no raw hex, on a surface whose whole job is colour.
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
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
// Initialize the i18n catalog so the neutral copy keys resolve to English text.
import '../../../i18n'
import i18n from '../../../i18n'
import type { CommentOut } from '../../../api/comments'
import type { CharacterOut } from '../../../api/auth'
import EphemeristsComment from '../Comment'

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

const CSS = readFileSync(join(process.cwd(), 'src', 'index.css'), 'utf8')

/** The declared value of one `--faction-ephemerists-comment-*` slot. */
function slot(name: string): string {
  const hit = CSS.match(new RegExp(`--faction-ephemerists-comment-${name}\\s*:\\s*([^;]+);`))
  expect(hit, `--faction-ephemerists-comment-${name} is not declared`).not.toBeNull()
  return (hit as RegExpMatchArray)[1].trim()
}

describe('the Ephemerists comment — row states', () => {
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

  it('row · mention: a resolved handle links in the plate link ink', () => {
    const html = row({
      ...COMMENT,
      body_text: 'as @bo recorded',
      mentions: [{ character_id: 9, username: 'bo', display_name: 'Bo' }],
    })
    expect(html).toContain('href="/characters/9"')
    // #2141 deleted the faction's aqua; the link role is the brass highlight,
    // one alias behind the slot — pinned in the ground block below.
    expect(html).toContain('--faction-ephemerists-comment-mention')
  })

  it('does NOT clip the mention to the spectrum — that is na’s tell alone', () => {
    // The chassis is also na's voice, and na paints resolved handles as
    // gradient-clipped spectrum ink. `isKnownFaction` is the seam; a themed
    // slug must never pick it up (#970).
    const html = row({
      ...COMMENT,
      body_text: 'as @bo recorded',
      mentions: [{ character_id: 9, username: 'bo', display_name: 'Bo' }],
    })
    expect(html).not.toContain('rainbow-ink')
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

describe('the Ephemerists comment — composer states', () => {
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

  /**
   * #2238 — the count came apart as `100/5` over `00` on THIS sheet, and the
   * reason is the pairing rather than either half: the marginalia block sets
   * `overflow-wrap: anywhere` so an unbroken word cannot blow the leaf open,
   * and the composer sits inside it and inherits the break opportunities. The
   * shared foot answers it for all nine voices (`composerControls.test.tsx`);
   * what this pins is that the two still meet on the plate — the day someone
   * drops the leaf's `anywhere` this test says the count was never relying on
   * its absence, and the day someone drops the `nowrap` it fails here first.
   *
   * The leaf's half is a TOKEN now, so it is checked as one.
   */
  it('cannot break the character count, wrap-anywhere leaf and all (#2238)', () => {
    expect(slot('composer-wrap'), "the leaf's own wrap rule").toBe('anywhere')
    expect(composer(false), 'and a count it cannot reach').toContain('white-space:nowrap')
  })
})

describe('the Ephemerists comment — the Valley plate ground', () => {
  it('reaches for the comment slots and nothing else', () => {
    const html = row()
    for (const name of ['sheet', 'ink', 'edge', 'body-edge']) {
      expect(html, `carries --faction-ephemerists-comment-${name}`).toContain(
        `--faction-ephemerists-comment-${name}`,
      )
    }
  })

  it('points those slots at the plate, one alias deep', () => {
    // `-ochre` is marginalia's own mark, which the chassis draws as the body
    // block's own left edge rather than as a stretched flex sibling — the same
    // box, and a token instead of a component.
    expect(slot('sheet')).toBe('var(--faction-ephemerists-plate-bg)')
    expect(slot('ink')).toBe('var(--faction-ephemerists-plate-ink)')
    expect(slot('edge')).toBe('1px solid var(--faction-ephemerists-plate-line)')
    expect(slot('body-edge')).toContain('var(--faction-ephemerists-plate-ochre)')
    expect(slot('mention')).toBe('var(--faction-ephemerists-plate-brass-light)')
  })

  it('sets the submit button on the CTA pair, never on brass', () => {
    // `-brass` is a rule colour the plate module forbids putting text on, and
    // `-band` goes near-black in dark while the CTA lifts to brass.
    expect(slot('accent')).toBe('var(--faction-ephemerists-plate-cta-bg)')
    expect(slot('on-accent')).toBe('var(--faction-ephemerists-plate-cta-ink)')
  })

  it('carries no illuminated-codex ink of its own (ADR-0055)', () => {
    // `--faction-ephemerists-card-*` is the codex family this surface used to
    // be painted in. Checked on the RENDER and on the token block, because
    // either one could reintroduce it now.
    const html = row() + composer(false)
    expect(html).not.toContain('--faction-ephemerists-card-')
    for (const [, value] of CSS.matchAll(/--faction-ephemerists-comment-[\w-]+\s*:\s*([^;]+);/g)) {
      expect(value).not.toContain('--faction-ephemerists-card-')
    }
  })

  it('names no colour in hex', () => {
    expect(row() + composer(false)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})

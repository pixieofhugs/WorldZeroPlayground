/**
 * The foot rule on your OWN comment is permanent; only the controls reveal (#2733).
 *
 * THE SEAM: the subtree of the element carrying the reveal gate. `useOwnerReveal`
 * and `ownerRevealStyle` are correct and untouched — the defect was purely what
 * each voice put INSIDE the gate. Every voice wrapped its foot rule and its
 * `edit · delete` cluster in one gated element, so the divider faded out with the
 * controls and your own comment lost its rule whenever the pointer left.
 *
 * The gate's signature in markup is `transition:opacity` (nothing else in these
 * voices installs one), so the assertion is exact: the gated subtree must not
 * contain the voice's rule, and the rule must still be drawn.
 *
 * HARNESS: `renderToStaticMarkup`, the comments-test convention — no DOM, so
 * `useOwnerReveal` takes its static branch (hover assumed capable, `revealed`
 * false). That is precisely the "pointer elsewhere" reading the issue reports,
 * which is why the bug is visible here at all.
 *
 * WHAT THIS CANNOT PROVE: that the rule is *pretty*, or that the fade actually
 * animates. Both still need eyeballing in a browser.
 */
import type { ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CommentOut } from '../../../api/comments'
import type { CommentProps } from '../shared'

// Who is signed in decides all three readings: the author (gated controls), a
// different member (flag row, never gated), and nobody (no foot at all).
const authState = vi.hoisted(() => ({ user: null as unknown }))
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => authState }))

import { DefaultComment } from '../CommentThread'
import AlbescentComment from '../voices/AlbescentComment'
import CovenComment from '../voices/CovenComment'
import EphemeristsComment from '../voices/EphemeristsComment'
import EverymenComment from '../voices/EverymenComment'
import SingularityComment from '../voices/SingularityComment'
import SnideComment from '../voices/SnideComment'
import UaComment from '../voices/UaComment'
import WowComment from '../voices/WowComment'

/** Nine voices, nine bespoke dresses — each names its own rule. */
const VOICES: [string, ComponentType<CommentProps>, RegExp][] = [
  ['na / default', DefaultComment, /border-top:1px solid var\(--faction-default-composer-hair\)/],
  // A pass-through to na's sheet: it inherits the fix and is listed to prove it.
  ['albescent', AlbescentComment, /border-top:1px solid var\(--faction-default-composer-hair\)/],
  ['coven', CovenComment, /class="cvn-braid"/],
  ['ephemerists', EphemeristsComment, /border-top:1px solid/],
  ['everymen', EverymenComment, /border-top:1px solid var\(--faction-everymen-sheet-hair\)/],
  ['singularity', SingularityComment, /border-top:1px dashed/],
  ['snide', SnideComment, /border-top:1px solid var\(--faction-snide-slip-rule\)/],
  ['ua', UaComment, /border-top:1px solid var\(--faction-ua-hair\)/],
  // The crown at the top of the WOW sheet paints the same ribbon, so the rule is
  // named by RibbonRule's own held-back opacity, not by the pigment alone.
  ['wow', WowComment, /height:3px;background:var\(--faction-wow-quest-ribbon\);opacity:0\.75/],
]

const AUTHOR_ID = 42

const COMMENT: CommentOut = {
  id: 7,
  praxis_id: 1,
  task_id: null,
  body_text: 'the rule stays, the controls come and go',
  is_edited: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  author: {
    id: AUTHOR_ID,
    username: 'ada',
    display_name: 'Adabel',
    avatar_url: '',
    faction_slug: 'na',
  },
  mentions: [],
}

function row(Voice: ComponentType<CommentProps>): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Voice mode="row" comment={COMMENT} />
    </MemoryRouter>,
  )
}

afterEach(() => {
  authState.user = null
})

// ── A string walk over the markup (there is no DOM in this harness) ──────────

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
])
// Quoted attribute values are matched whole, so a '>' inside copy or a data URI
// cannot end a tag early.
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g

const GATE = /transition:opacity/

/**
 * The outer HTML of the first element whose attributes match, or null if none
 * does. Its own opening tag is included: on five voices the rule was a
 * `border-top` on the gated element ITSELF, not a child of it.
 */
function subtreeOf(html: string, matches: RegExp): string | null {
  TAG.lastIndex = 0
  let match: RegExpExecArray | null
  let start = -1
  let depth = 0
  while ((match = TAG.exec(html)) !== null) {
    const [full, closing, name, attributes] = match
    const childless =
      VOID_ELEMENTS.has(name.toLowerCase()) || attributes.trimEnd().endsWith('/')
    if (start === -1) {
      if (closing || !matches.test(attributes)) continue
      if (childless) return full
      start = match.index
      depth = 1
      continue
    }
    if (childless) continue
    if (!closing) {
      depth += 1
      continue
    }
    depth -= 1
    if (depth === 0) return html.slice(start, match.index + full.length)
  }
  return null
}

describe('your own comment keeps its foot rule while the controls fade (#2733)', () => {
  it.each(VOICES)('%s: the rule is drawn with the pointer elsewhere', (_name, Voice, RULE) => {
    authState.user = { character: { id: AUTHOR_ID } }
    expect(row(Voice)).toMatch(RULE)
  })

  it.each(VOICES)('%s: the rule is outside the reveal gate', (_name, Voice, RULE) => {
    authState.user = { character: { id: AUTHOR_ID } }
    const html = row(Voice)
    const gated = subtreeOf(html, GATE)
    // The gate must exist — otherwise this passes for the wrong reason.
    expect(gated, 'the owner row is still gated').not.toBeNull()
    expect(gated).toContain('aria-label="edit"')
    expect(gated).not.toMatch(RULE)
  })

  it.each(VOICES)('%s: someone else\'s comment is unchanged — rule, no gate', (_name, Voice, RULE) => {
    authState.user = { character: { id: AUTHOR_ID + 1 } }
    const html = row(Voice)
    expect(html).toMatch(RULE)
    // OwnerControls renders nothing for a non-author, so no gate is installed.
    expect(subtreeOf(html, GATE)).toBeNull()
  })

  it.each(VOICES)('%s: a signed-out viewer still gets no foot at all', (_name, Voice, RULE) => {
    const html = row(Voice)
    expect(html).not.toMatch(RULE)
    expect(html).not.toMatch(GATE)
  })
})

describe('the walker itself', () => {
  it('returns the matched element with its own attributes and its subtree', () => {
    const html = '<div style="a"><span style="transition:opacity"><b>x</b></span><i>y</i></div>'
    expect(subtreeOf(html, GATE)).toBe('<span style="transition:opacity"><b>x</b></span>')
  })

  it('returns null when nothing matches', () => {
    expect(subtreeOf('<div style="a"></div>', GATE)).toBeNull()
  })
})

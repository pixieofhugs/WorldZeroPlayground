/**
 * The foot rule on your OWN comment is permanent; only the controls reveal (#2733).
 * The gate's markup signature is `transition:opacity` (nothing else installs one);
 * the gated subtree must not contain the voice's rule. With no DOM, `useOwnerReveal`
 * starts unrevealed — the "pointer elsewhere" state the bug lives in.
 */
import type { ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CommentOut } from '../../../api/comments'
import type { CommentProps } from '../shared'

const authState = vi.hoisted(() => ({ user: null as unknown }))
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => authState }))

import { surfaceMap } from '../../../factions'

// Typed on purpose (reading it from the component would be a tautology); the
// population comes off the registry (#2815), so a new kit with no row fails.
const FOOT_RULE: Record<string, RegExp> = {
  na: /border-top:1px solid var\(--faction-default-composer-hair\)/,
  // Pass-through to na's sheet.
  albescent: /border-top:1px solid var\(--faction-default-composer-hair\)/,
  coven: /class="cvn-braid"/,
  ephemerists: /border-top:1px solid/,
  everymen: /border-top:1px solid var\(--faction-everymen-sheet-hair\)/,
  singularity: /border-top:1px dashed/,
  snide: /border-top:1px solid var\(--faction-snide-note-rule\)/,
  ua: /border-top:1px solid var\(--faction-ua-hair\)/,
  // The crown paints the same ribbon; RibbonRule's opacity tells them apart.
  wow: /height:3px;background:var\(--faction-wow-quest-ribbon\);opacity:0\.75/,
}

const VOICES: [string, ComponentType<CommentProps>, RegExp][] = Object.entries(
  surfaceMap('comment'),
).map(([slug, Voice]) => [slug, Voice, FOOT_RULE[slug]])

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

// A string walk over the markup (no DOM in this harness)

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
])
// Quoted attribute values matched whole, so a '>' inside one cannot end a tag.
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g

const GATE = /transition:opacity/

/** Outer HTML of the first matching element, own tag included (the rule can sit on it). */
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
  it.each(VOICES)('%s: has a declared foot rule at all', (slug, _Voice, RULE) => {
    expect(RULE, `${slug} is a registered voice with no rule in FOOT_RULE`).toBeInstanceOf(RegExp)
  })

  it.each(VOICES)('%s: the rule is drawn with the pointer elsewhere', (_name, Voice, RULE) => {
    authState.user = { character: { id: AUTHOR_ID } }
    expect(row(Voice)).toMatch(RULE)
  })

  it.each(VOICES)('%s: the rule is outside the reveal gate', (_name, Voice, RULE) => {
    authState.user = { character: { id: AUTHOR_ID } }
    const html = row(Voice)
    const gated = subtreeOf(html, GATE)
    expect(gated, 'the owner row is still gated').not.toBeNull()
    expect(gated).toContain('aria-label="edit"')
    expect(gated).not.toMatch(RULE)
  })

  it.each(VOICES)('%s: someone else\'s comment is unchanged — rule, no gate', (_name, Voice, RULE) => {
    authState.user = { character: { id: AUTHOR_ID + 1 } }
    const html = row(Voice)
    expect(html).toMatch(RULE)
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

/**
 * The @mention popover must not be clipped by the card it is composed in (#1255).
 *
 * THE SEAM: the ancestor chain of the composer's `<textarea>`. The listbox is an
 * absolutely positioned child of the textarea's own wrapper (`shared.tsx`), so
 * ANY ancestor carrying `overflow: hidden` cuts it off — `z-index` cannot save
 * it. Four of the eight voices shipped exactly that: the na sheet, the Coven
 * slip, the Singularity pane and the WOW sheet each clipped a full-bleed
 * decoration to their own corner and took the popover with it.
 *
 * WHAT THIS CANNOT PROVE: the harness is `renderToStaticMarkup` — no DOM, no
 * layout, no effects — so `useMentionAutocomplete`'s open state can never be
 * driven here and the listbox itself is never in the markup. This pins the
 * structural PRECONDITION (no clipping ancestor, popover still in the
 * composer's own DOM order) and not visibility. That the dropdown actually
 * appears still needs eyeballing in a browser.
 *
 * It runs over every voice rather than the four that were broken: the report
 * that opened #1255 named one surface and four were affected, because these
 * cards copy idioms from each other. A voice added later is covered by adding
 * one line to VOICES.
 */
import type { ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import type { CharacterOut } from '../../../api/auth'
import type { CommentProps } from '../shared'
import DefaultComment from '../Comment'
import EverymenComment from '../voices/EverymenComment'
import SingularityComment from '../voices/SingularityComment'
import SnideComment from '../voices/SnideComment'
import UaComment from '../voices/UaComment'
import WowComment from '../voices/WowComment'

const VOICES: [string, ComponentType<CommentProps>][] = [
  ['na / default', DefaultComment],
  // Two slugs with no voice of their own since #2650 — the chassis paints
  // them off `--faction-<key>-comment-*`, and the listbox has to clear the
  // sheet on their grounds exactly as it does on a bespoke one.
  ['coven', DefaultComment],
  ['ephemerists', DefaultComment],
  ['everymen', EverymenComment],
  ['singularity', SingularityComment],
  ['snide', SnideComment],
  ['ua', UaComment],
  ['wow', WowComment],
]

function character(slug: string): CharacterOut {
  return {
    id: 42,
    username: 'ada',
    display_name: 'Adabel',
    avatar_url: '',
    faction_slug: slug,
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
}

function composer(Voice: ComponentType<CommentProps>, slug: string): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Voice
        mode="composer"
        character={character(slug)}
        value=""
        onChange={() => {}}
        onSubmit={() => {}}
        submitting={false}
      />
    </MemoryRouter>,
  )
}

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
])
// Quoted attribute values are matched whole, so a '>' inside copy or a data URI
// cannot end a tag early.
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g

/**
 * The attribute strings of every open element enclosing the first `<tagName>`,
 * outermost first. A string walk rather than a DOM walk because there is no DOM
 * in this harness; it is enough to tell an ANCESTOR of the textarea from a
 * sibling that merely opened earlier (Everymen's byline, which truncates the
 * author name with its own `overflow: hidden` and is not in the chain).
 */
function ancestorAttributes(html: string, tagName: string): string[] {
  TAG.lastIndex = 0
  const stack: string[] = []
  let match: RegExpExecArray | null
  while ((match = TAG.exec(html)) !== null) {
    const [, closing, name, attributes] = match
    if (closing) {
      stack.pop()
      continue
    }
    if (name === tagName) return [...stack]
    if (VOID_ELEMENTS.has(name.toLowerCase()) || attributes.trimEnd().endsWith('/')) continue
    stack.push(attributes)
  }
  throw new Error(`no <${tagName}> in the rendered markup`)
}

const CLIPS = /overflow(-[xy])?\s*:\s*(hidden|clip|auto|scroll)/

describe('the @mention popover is not clipped by the card it composes in (#1255)', () => {
  it.each(VOICES)('%s: no clipping ancestor above the composer field', (_name, Voice) => {
    const chain = ancestorAttributes(composer(Voice, 'na'), 'textarea')
    expect(chain.filter((attributes) => CLIPS.test(attributes))).toEqual([])
  })

  it.each(VOICES)('%s: the listbox stays in the composer\'s own DOM order', (_name, Voice) => {
    const html = composer(Voice, 'na')
    // aria-controls is a same-document ID reference the composer owns. The fix
    // deliberately did NOT portal the listbox out — a portal would move the
    // popover away from the field and leave this relationship to be maintained
    // by hand — so the anchor it is positioned against must still be the
    // textarea's immediate parent.
    expect(html).toContain('aria-controls="mention-listbox"')
    const chain = ancestorAttributes(html, 'textarea')
    expect(chain[chain.length - 1]).toMatch(/position\s*:\s*relative/)
  })
})

describe('the walker itself', () => {
  it('reads an enclosing element as an ancestor and a closed sibling as not', () => {
    const html = '<div style="overflow:hidden"><span style="overflow:hidden"></span><textarea></textarea></div>'
    expect(ancestorAttributes(html, 'textarea')).toEqual([' style="overflow:hidden"'])
  })

  it('does not mistake a void element for an open ancestor', () => {
    expect(ancestorAttributes('<div><img src="a"><textarea></textarea></div>', 'textarea')).toHaveLength(1)
  })
})

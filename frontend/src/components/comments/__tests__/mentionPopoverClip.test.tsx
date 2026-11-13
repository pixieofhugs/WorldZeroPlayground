/**
 * The @mention popover must not be clipped by its card (#1255). The listbox is an
 * absolute child of the textarea's wrapper (`shared.tsx`), so ANY ancestor with
 * `overflow: hidden` cuts it off. Pins only that precondition (no DOM, so the open
 * listbox is never rendered). VOICES comes off the registry (#2815).
 */
import type { ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import '../../../i18n'
import type { CharacterOut } from '../../../api/auth'
import type { CommentProps } from '../shared'
import { surfaceMap } from '../../../factions'

const VOICES: [string, ComponentType<CommentProps>][] = Object.entries(surfaceMap('comment'))

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
// Quoted attribute values matched whole, so a '>' inside one cannot end a tag.
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g

/** Attributes of every open element enclosing the first `<tagName>`, outermost first. */
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
    // Deliberately not portalled: the anchor must stay the textarea's parent.
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

/** Comment author affordance (#456). The empty-draft guard is tested on `ComposerControls`. */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CommentOut } from '../../../api/comments'
import {
  CommentEditor,
  OwnerControls,
  isCommentOwner,
  ownerRevealStyle,
  useOwnerReveal,
  type OwnerEdit,
  type OwnerReveal,
} from '../OwnerControls'

// `vi.hoisted`, not `beforeEach`: openapi-fetch binds `globalThis.fetch` at import
// time, so a later stub is never consulted and real requests escape (#1400).
const wire = vi.hoisted(() => {
  const sent: Request[] = []
  globalThis.fetch = (async (input: Request) => {
    sent.push(input)
    return new Response(null, { status: 204 })
  }) as unknown as typeof globalThis.fetch
  return { sent }
})

import { deleteComment } from '../../../api/comments'

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
    display_name: 'Ada',
    avatar_url: '',
    faction_slug: 'ua',
  },
  mentions: [],
}

function makeOwner(overrides: Partial<OwnerEdit> = {}): OwnerEdit {
  return {
    isOwner: true,
    editing: false,
    confirming: false,
    draft: COMMENT.body_text,
    setDraft: () => {},
    saving: false,
    withdrawing: false,
    error: null,
    startEdit: () => {},
    cancelEdit: () => {},
    save: () => {},
    startConfirm: () => {},
    cancelConfirm: () => {},
    confirmWithdraw: () => {},
    ...overrides,
  }
}

describe('isCommentOwner', () => {
  it('is true only when the viewer character owns the comment', () => {
    expect(isCommentOwner(COMMENT, 42)).toBe(true)
    expect(isCommentOwner(COMMENT, 99)).toBe(false)
    expect(isCommentOwner(COMMENT, null)).toBe(false)
    expect(isCommentOwner(COMMENT, undefined)).toBe(false)
  })
})

describe('OwnerControls', () => {
  it('renders edit + delete for the author (resting)', () => {
    const html = renderToStaticMarkup(<OwnerControls owner={makeOwner()} />)
    expect(html).toContain('edit')
    expect(html).toContain('delete')
  })

  it('renders nothing for a non-author', () => {
    const html = renderToStaticMarkup(<OwnerControls owner={makeOwner({ isOwner: false })} />)
    expect(html).toBe('')
  })

  it('renders nothing while editing (the inline editor owns Save/Cancel)', () => {
    const html = renderToStaticMarkup(<OwnerControls owner={makeOwner({ editing: true })} />)
    expect(html).toBe('')
  })

  it('shows the neutral withdraw confirm strip when confirming', () => {
    const html = renderToStaticMarkup(<OwnerControls owner={makeOwner({ confirming: true })} />)
    expect(html).toContain('Withdraw this comment?')
    expect(html).toContain('Withdraw')
    expect(html).toContain('Keep')
  })
})

// Hover / focus gate (#1195)

function makeReveal(revealed: boolean): OwnerReveal {
  return {
    revealed,
    containerProps: {
      onMouseEnter: () => {},
      onMouseLeave: () => {},
      onFocus: () => {},
      onBlur: () => {},
    },
  }
}

describe('ownerRevealStyle', () => {
  it('gates with OPACITY only — never display/visibility, which would drop the row out of the tab order', () => {
    expect(ownerRevealStyle(false).opacity).toBe(0)
    expect(ownerRevealStyle(true).opacity).toBe(1)
    expect(ownerRevealStyle(false).display).toBeUndefined()
    expect(ownerRevealStyle(false).visibility).toBeUndefined()
  })
})

describe('OwnerControls hover gate', () => {
  it('keeps edit + delete MOUNTED while hidden, so Tab can still reach (and reveal) them', () => {
    const html = renderToStaticMarkup(
      <OwnerControls owner={makeOwner()} reveal={makeReveal(false)} />,
    )
    expect(html).toContain('edit')
    expect(html).toContain('delete')
    expect(html).toContain('opacity:0')
  })

  it('shows the row at full strength once revealed', () => {
    const html = renderToStaticMarkup(
      <OwnerControls owner={makeOwner()} reveal={makeReveal(true)} />,
    )
    expect(html).toContain('opacity:1')
  })

  it('pins the withdraw-confirm strip open even when unrevealed', () => {
    const html = renderToStaticMarkup(
      <OwnerControls owner={makeOwner({ confirming: true })} reveal={makeReveal(false)} />,
    )
    expect(html).toContain('Withdraw this comment?')
    expect(html).toContain('opacity:1')
  })

  it('is ungated when no reveal is passed — the seven faction voices are untouched by #1195', () => {
    const html = renderToStaticMarkup(<OwnerControls owner={makeOwner()} />)
    expect(html).not.toContain('opacity')
  })
})

describe('useOwnerReveal', () => {
  it('exposes the pointer AND focus sources of the reveal', () => {
    const captured: OwnerReveal[] = []
    function Probe() {
      captured.push(useOwnerReveal())
      return null
    }
    renderToStaticMarkup(<Probe />)
    expect(Object.keys(captured[0].containerProps).sort()).toEqual([
      'onBlur',
      'onFocus',
      'onMouseEnter',
      'onMouseLeave',
    ])
    // No `window`: hover is assumed, so the row starts hidden (safe: opacity-only gate).
    expect(captured[0].revealed).toBe(false)
  })
})

describe('CommentEditor', () => {
  it('seeds the composer with the current body and shows Save', () => {
    const html = renderToStaticMarkup(
      <CommentEditor owner={makeOwner({ editing: true })} accent="var(--color-accent-primary)" onAccent="var(--faction-default-on-accent)" />,
    )
    expect(html).toContain('seedlings along the estuary')
    expect(html).toContain('Save')
    expect(html).toContain('Cancel')
  })
})

describe('deleteComment', () => {
  it('issues DELETE /comments/{id}', async () => {
    await deleteComment(7)

    const request = wire.sent.at(-1)!
    expect(request.method).toBe('DELETE')
    expect(new URL(request.url).pathname).toBe('/comments/7')
  })
})

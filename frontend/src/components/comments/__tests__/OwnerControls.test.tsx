/**
 * Comment author affordance (#456).
 *
 * The stateful toggle/confirm/edit machinery lives once in `useOwnerEdit`; these
 * tests exercise the pure decisions (owner check, empty-draft guard), the neutral
 * `<OwnerControls>` affordance in each of its resting/confirm states, the seeded
 * `<CommentEditor>`, and the new `deleteComment` client. Rendered to static markup
 * (no DOM) per the comments-test convention; `useAuth` resolves to its anonymous
 * default so ComposerControls' mention hook renders without a provider.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
// Initialize the i18n catalog so the neutral copy keys resolve to English text.
import '../../../i18n'
import type { CommentOut } from '../../../api/comments'
import {
  CommentEditor,
  OwnerControls,
  editSaveDisabled,
  isCommentOwner,
  type OwnerEdit,
} from '../OwnerControls'

// Mock the axios instance so the comments client can be exercised without a network.
vi.mock('../../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn().mockResolvedValue({}) },
}))
import api from '../../../api/axios'
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
    avatar_url: null,
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

// ── Pure decisions ────────────────────────────────────────────────────────────

describe('isCommentOwner', () => {
  it('is true only when the viewer character owns the comment', () => {
    expect(isCommentOwner(COMMENT, 42)).toBe(true)
    expect(isCommentOwner(COMMENT, 99)).toBe(false)
    expect(isCommentOwner(COMMENT, null)).toBe(false)
    expect(isCommentOwner(COMMENT, undefined)).toBe(false)
  })
})

describe('editSaveDisabled', () => {
  it('disables save on an empty/whitespace draft or while saving', () => {
    expect(editSaveDisabled('', false)).toBe(true)
    expect(editSaveDisabled('   ', false)).toBe(true)
    expect(editSaveDisabled('hello', true)).toBe(true)
    expect(editSaveDisabled('hello', false)).toBe(false)
  })
})

// ── OwnerControls affordance ────────────────────────────────────────────────────

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

// ── CommentEditor (seeded reuse of ComposerControls) ────────────────────────────

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

// ── deleteComment client ────────────────────────────────────────────────────────

describe('deleteComment', () => {
  it('issues DELETE /comments/{id}', async () => {
    await deleteComment(7)
    expect(vi.mocked(api.delete)).toHaveBeenCalledWith('/comments/7')
  })
})

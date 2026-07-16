/**
 * Comment flag control (#575). Exercises the pure viewer-eligibility decision,
 * the `flagComment` client body shape, and the neutral affordance's presence:
 * a flag button for other people's comments, nothing on the viewer's own.
 * Rendered to static markup (no DOM), per the comments-test convention.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../../i18n'
import type { CommentOut } from '../../../api/comments'

// Mock axios so the comments client exercises without a network.
vi.mock('../../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn().mockResolvedValue({ data: {} }), patch: vi.fn(), delete: vi.fn() },
}))
// Control the signed-in viewer for the render cases.
const authState = vi.hoisted(() => ({ user: null as unknown }))
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => authState }))

import api from '../../../api/axios'
import { flagComment } from '../../../api/comments'
import { CommentFlagControl, canFlagComment } from '../FlagControl'

const COMMENT: CommentOut = {
  id: 7,
  praxis_id: 1,
  task_id: null,
  body_text: 'hi',
  is_edited: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  author: { id: 42, username: 'ada', display_name: 'Ada', avatar_url: null, faction_slug: 'ua' },
  mentions: [],
}

describe('canFlagComment — viewer eligibility (#575)', () => {
  it('is false when signed out', () => {
    expect(canFlagComment(COMMENT, null)).toBe(false)
    expect(canFlagComment(COMMENT, undefined)).toBe(false)
  })
  it("is false on the viewer's own comment", () => {
    expect(canFlagComment(COMMENT, 42)).toBe(false)
  })
  it("is true on someone else's comment", () => {
    expect(canFlagComment(COMMENT, 99)).toBe(true)
  })
})

describe('flagComment — client body (#575)', () => {
  it('POSTs the reason + reason_detail to the comment flag route', async () => {
    await flagComment(7, 'spam', 'context')
    expect(api.post).toHaveBeenCalledWith('/comments/7/flag', {
      reason: 'spam',
      reason_detail: 'context',
    })
  })
})

describe('CommentFlagControl — affordance presence (#575)', () => {
  it("renders a flag control on someone else's comment", () => {
    authState.user = { character: { id: 99 } }
    const html = renderToStaticMarkup(<CommentFlagControl comment={COMMENT} />)
    expect(html).toContain('Flag')
  })
  it("renders nothing on the viewer's own comment", () => {
    authState.user = { character: { id: 42 } }
    const html = renderToStaticMarkup(<CommentFlagControl comment={COMMENT} />)
    expect(html).toBe('')
  })
})

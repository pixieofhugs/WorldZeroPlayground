/**
 * Comment flag control (#575). Exercises the pure viewer-eligibility decision,
 * the `flagComment` client body shape, and the neutral affordance's presence:
 * a flag button for other people's comments, nothing on the viewer's own.
 * Rendered to static markup (no DOM), per the comments-test convention.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi, afterEach } from 'vitest'
import '../../../i18n'
import type { CommentOut } from '../../../api/comments'

/**
 * Stub the wire so the comments client exercises without a network (#1400).
 *
 * `vi.hoisted`, NOT `beforeEach`: `openapi-fetch` binds `globalThis.fetch` when
 * the client is CREATED, which happens at `api/client`'s top level — i.e. during
 * this file's imports. A later `vi.stubGlobal('fetch', …)` is simply never
 * consulted, and the failure is not a failure: the suite issues REAL requests to
 * whatever is listening on localhost:8000 and asserts against its answers.
 *
 * This stub cannot go inert the way the `api/axios` module mock it replaces did.
 * Every assertion below reads the request out of `wire.sent`, which only this
 * stub writes to — so a request that escapes to the network leaves `sent` empty
 * and the test throws rather than quietly passing.
 */
const wire = vi.hoisted(() => {
  const sent: Request[] = []
  // What the next request is answered with. Mutable so one test can make the
  // route refuse; `afterEach` puts it back.
  const reply = { status: 200, body: '{}' }
  globalThis.fetch = (async (input: Request) => {
    sent.push(input)
    return new Response(reply.body, {
      status: reply.status,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof globalThis.fetch
  return { sent, reply }
})

afterEach(() => {
  wire.reply.status = 200
  wire.reply.body = '{}'
})

// Control the signed-in viewer for the render cases.
const authState = vi.hoisted(() => ({ user: null as unknown }))
vi.mock('../../../auth/AuthContext', () => ({ useAuth: () => authState }))

import { flagComment } from '../../../api/comments'
import { extractError } from '../../../utils/errors'
import { CommentFlagControl, canFlagComment } from '../FlagControl'

const COMMENT: CommentOut = {
  id: 7,
  praxis_id: 1,
  task_id: null,
  body_text: 'hi',
  is_edited: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  author: { id: 42, username: 'ada', display_name: 'Ada', avatar_url: '', faction_slug: 'ua' },
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

    const request = wire.sent.at(-1)!
    expect(request.method).toBe('POST')
    expect(new URL(request.url).pathname).toBe('/comments/7/flag')
    expect(await request.json()).toEqual({ reason: 'spam', reason_detail: 'context' })
  })

  // `reason_detail` only persists server-side with reason='other', but the field
  // is always sent — an absent detail is an explicit null, not a missing key.
  it('sends an explicit null detail when none is given', async () => {
    await flagComment(7, 'spam')

    expect(await wire.sent.at(-1)!.json()).toEqual({ reason: 'spam', reason_detail: null })
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

/**
 * #2138 — "Flagging comments doesn't seem to work".
 *
 * The report was a screenshot of "Couldn't flag this. Please try again." The
 * write was never broken: the viewer was under `era.flag_level_required`, the
 * route said so in a coded 403, and the control threw the reason away.
 *
 * This pins the contract the fix leans on, end to end over the real client:
 * the route's coded body survives into an `ApiError`, and the catalog answers
 * the `context: 'comment'` sibling rather than the bare key or the fallback.
 * It cannot cover the last inch — that `CommentFlagControl.submit` calls
 * `extractError` at all — because submitting needs a click and these tests
 * render to static markup with no DOM.
 */
describe('a refused flag keeps the backend reason (#2138)', () => {
  it('renders the level refusal, not the generic retry line', async () => {
    wire.reply.status = 403
    wire.reply.body = JSON.stringify({
      detail: {
        code: 'FLAG_LEVEL_TOO_LOW',
        message: 'Must be level 4 or above to flag a comment.',
        params: { level: 4, context: 'comment' },
      },
    })

    const err = await flagComment(7, 'spam').catch((e: unknown) => e)

    expect(extractError(err, "Couldn't flag this. Please try again.")).toBe(
      'Must be level 4 or above to flag a comment.',
    )
  })
})

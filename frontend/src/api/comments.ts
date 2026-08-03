import { apiGet, apiPost, apiPatch, apiDelete } from './client'
import type { components } from './generated/schema'
import type { FlagReason } from '../utils/flagReasons'

/** A resolved @mention — the frontend linkifies these handles in the body. */
export type CommentMention = components['schemas']['CommentMentionOut']

/**
 * Public author identity — drives the actor-scoped theming (author's faction).
 *
 * `avatar_url` and `faction_slug` are `string`, never null: both columns are
 * `nullable=False, server_default=""` / `"na"` on `Character`, and
 * `schemas/comment.py` declares them `str`, so a null could not survive
 * serialization. The hand-written mirror this replaced said `string | null` and
 * was simply wrong about the wire (#1400). An absent avatar is `""`; an
 * unaffiliated author is `"na"`.
 */
export type CommentAuthor = components['schemas']['CommentAuthor']

/**
 * `praxis_id` and `task_id` are nullable, not optional: exactly one is set
 * (a `num_nonnulls(...) = 1` CHECK in migration 0005), and FastAPI serializes
 * both keys regardless. Read them in order without a tie-break.
 */
export type CommentOut = components['schemas']['CommentOut']

export type CommentTarget = 'praxes' | 'tasks'

// The praxis and task threads are two routes, not one path built from a
// variable: `/praxes/{praxis_id}/comments` and `/tasks/{task_id}/comments` are
// separate keys in the schema, with differently-named slots. The branch is what
// makes the target a checked choice instead of a string that happens to resolve.
export async function listComments(
  target: CommentTarget,
  id: number,
): Promise<CommentOut[]> {
  const { data } =
    target === 'praxes'
      ? await apiGet('/praxes/{praxis_id}/comments', { params: { path: { praxis_id: id } } })
      : await apiGet('/tasks/{task_id}/comments', { params: { path: { task_id: id } } })
  return data
}

export async function createComment(
  target: CommentTarget,
  id: number,
  body_text: string,
): Promise<CommentOut> {
  const { data } =
    target === 'praxes'
      ? await apiPost('/praxes/{praxis_id}/comments', {
          params: { path: { praxis_id: id } },
          body: { body_text },
        })
      : await apiPost('/tasks/{task_id}/comments', {
          params: { path: { task_id: id } },
          body: { body_text },
        })
  return data
}

export async function editComment(
  commentId: number,
  body_text: string,
): Promise<CommentOut> {
  const { data } = await apiPatch('/comments/{comment_id}', {
    params: { path: { comment_id: commentId } },
    body: { body_text },
  })
  return data
}

/** Author-only soft-delete → the comment is withdrawn (204, no body). */
export async function deleteComment(commentId: number): Promise<void> {
  await apiDelete('/comments/{comment_id}', { params: { path: { comment_id: commentId } } })
}

/**
 * Flag a comment for moderator review (#575). Same FlagIn body (ADR-0037) as the
 * praxis flag route; `reasonDetail` only persists server-side with reason='other'.
 * The backend 403s self-flags, so the UI hides this on the viewer's own comments.
 */
export async function flagComment(
  commentId: number,
  reason: FlagReason,
  reasonDetail?: string,
): Promise<void> {
  await apiPost('/comments/{comment_id}/flag', {
    params: { path: { comment_id: commentId } },
    body: { reason, reason_detail: reasonDetail || null },
  })
}

import { apiGet, apiPost, apiPatch, apiDelete } from './client'
import type { FlagReason } from '../utils/flagReasons'

/** A resolved @mention — the frontend linkifies these handles in the body. */
export interface CommentMention {
  character_id: number
  username: string
  display_name: string
}

/** Public author identity — drives the actor-scoped theming (author's faction). */
export interface CommentAuthor {
  id: number
  username: string
  display_name: string
  avatar_url: string | null
  faction_slug: string | null
}

/**
 * ponytail (#1400): `praxis_id` / `task_id` stay REQUIRED here where the
 * generated schema marks them optional, so the three reads below narrow with a
 * cast rather than this interface widening to match.
 *
 * The schema is the imprecise one. Their Pydantic fields are `int | None = None`,
 * and openapi-typescript reads "has a default" as "may be absent" — but FastAPI
 * serializes the key regardless, so it is always on the wire as `number | null`.
 * Widening to `?` would hand every reader a `| undefined` that never arrives.
 *
 * Upgrade path: the alias slice of #1400 replaces this interface with
 * `components['schemas']['CommentOut']` outright; that is where the optionality
 * gets reconciled once, for every module, instead of per-field here.
 */
export interface CommentOut {
  id: number
  praxis_id: number | null
  task_id: number | null
  body_text: string
  is_edited: boolean
  created_at: string
  updated_at: string
  author: CommentAuthor
  mentions: CommentMention[]
}

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
  return data as CommentOut[]
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
  return data as CommentOut
}

export async function editComment(
  commentId: number,
  body_text: string,
): Promise<CommentOut> {
  const { data } = await apiPatch('/comments/{comment_id}', {
    params: { path: { comment_id: commentId } },
    body: { body_text },
  })
  return data as CommentOut
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

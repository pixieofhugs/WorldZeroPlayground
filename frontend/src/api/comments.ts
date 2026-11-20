import { apiGet, apiPost, apiPatch, apiDelete } from './client'
import type { components } from './generated/schema'
import type { FlagReason } from '../utils/flagReasons'

/** The frontend linkifies these handles in the body. */
export type CommentMention = components['schemas']['CommentMentionOut']

/** `avatar_url`/`faction_slug` never null: absent is `""`, unaffiliated `"na"`. */
export type CommentAuthor = components['schemas']['CommentAuthor']

/** `praxis_id` / `task_id`: exactly one set (DB CHECK), both keys always serialized. */
export type CommentOut = components['schemas']['CommentOut']

export type CommentTarget = 'praxes' | 'tasks'

// Two schema routes with differently named slots; the branch keeps the target type-checked.
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

/** Author-only soft-delete (204). */
export async function deleteComment(commentId: number): Promise<void> {
  await apiDelete('/comments/{comment_id}', { params: { path: { comment_id: commentId } } })
}

/**
 * Same FlagIn body as praxes (ADR-0037, #575). Self-flags 403, so the UI hides
 * this on the viewer's own comments.
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

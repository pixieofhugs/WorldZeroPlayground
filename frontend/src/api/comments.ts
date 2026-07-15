import api from './axios'

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

export async function listComments(
  target: CommentTarget,
  id: number,
): Promise<CommentOut[]> {
  const { data } = await api.get<CommentOut[]>(`/${target}/${id}/comments`)
  return data
}

export async function createComment(
  target: CommentTarget,
  id: number,
  body_text: string,
): Promise<CommentOut> {
  const { data } = await api.post<CommentOut>(`/${target}/${id}/comments`, {
    body_text,
  })
  return data
}

export async function editComment(
  commentId: number,
  body_text: string,
): Promise<CommentOut> {
  const { data } = await api.patch<CommentOut>(`/comments/${commentId}`, {
    body_text,
  })
  return data
}

/** Author-only soft-delete → the comment is withdrawn (204, no body). */
export async function deleteComment(commentId: number): Promise<void> {
  await api.delete(`/comments/${commentId}`)
}

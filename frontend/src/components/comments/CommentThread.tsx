import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { CharacterOut } from '../../api/auth'
import {
  type CommentOut,
  type CommentTarget,
  createComment,
  listComments,
} from '../../api/comments'
import { useAuth } from '../../auth/AuthContext'
import FactionAvatar from '../avatar/FactionAvatar'
import { pickVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'
import { factionCssVar } from '../../utils/factions'
import { formatCommentTime } from '../../utils/commentTime'
import {
  type CommentProps,
  authorToCharacter,
  ComposerControls,
  MentionText,
} from './shared'
import { CommentEditor, OwnerControls, useOwnerEdit } from './OwnerControls'
import { CommentFlagControl } from './FlagControl'

/**
 * Neutral fallback voice — invariant slots themed only by the faction CSS vars +
 * FactionAvatar + the timestamp dialect. Any unregistered faction renders this.
 */
export function DefaultComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
        <FactionAvatar character={character} size="sm" />
        <div style={{ flex: 1 }}>
          <ComposerControls
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            submitting={submitting}
            accent={factionCssVar(character.faction_slug, 'card-accent')}
          />
        </div>
      </div>
    )
  }
  const { comment, onEdited, onWithdrawn } = props
  const slug = comment.author.faction_slug
  const accent = factionCssVar(slug, 'card-accent')
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  return (
    <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
      <FactionAvatar character={authorToCharacter(comment.author)} size="sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <Link
            to={`/characters/${comment.author.id}`}
            style={{ fontWeight: 600, color: accent, textDecoration: 'none' }}
          >
            {comment.author.display_name}
          </Link>
          <span style={{ fontSize: 'var(--text-md)', color: 'var(--color-text-tertiary)' }}>
            {formatCommentTime(slug, comment.created_at)}
            {comment.is_edited ? ` · ${t('comments.edited')}` : ''}
          </span>
          <OwnerControls owner={owner} />
          <CommentFlagControl comment={comment} />
        </div>
        <div style={{ marginTop: 'var(--space-xs)', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
          {owner.editing ? (
            <CommentEditor owner={owner} accent={accent} />
          ) : (
            <MentionText body={comment.body_text} mentions={comment.mentions} accent={accent} />
          )}
        </div>
      </div>
    </div>
  )
}

function CommentRow({
  comment,
  onEdited,
  onWithdrawn,
}: {
  comment: CommentOut
  onEdited: (updated: CommentOut) => void
  onWithdrawn: (id: number) => void
}) {
  const Variant = pickVariant(surfaceMap('comment'), comment.author.faction_slug, DefaultComment)
  return (
    <Variant mode="row" comment={comment} onEdited={onEdited} onWithdrawn={onWithdrawn} />
  )
}

function CommentComposer({
  character,
  onPost,
}: {
  character: CharacterOut
  onPost: (body: string) => Promise<void>
}) {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const Variant = pickVariant(surfaceMap('comment'), character.faction_slug, DefaultComment)
  const submit = async () => {
    const body = value.trim()
    if (!body || submitting) return
    setSubmitting(true)
    try {
      await onPost(body)
      setValue('')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <Variant
      mode="composer"
      character={character}
      value={value}
      onChange={setValue}
      onSubmit={submit}
      submitting={submitting}
    />
  )
}

/**
 * Neutral, multi-faction container (ADR-0006): comment rows (each themed to its
 * own author) plus one composer (themed to the current character). Never
 * blanket-themes — a thread has no single faction owner.
 */
export default function CommentThread({
  target,
  targetId,
}: {
  target: CommentTarget
  targetId: number
}) {
  const { t } = useTranslation('praxis')
  const { user } = useAuth()
  const [comments, setComments] = useState<CommentOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    listComments(target, targetId)
      .then((rows) => {
        if (active) {
          setComments(rows)
          setError(null)
        }
      })
      .catch(() => {
        if (active) setError(t('comments.loadError'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [target, targetId])

  const handlePost = async (body: string) => {
    const created = await createComment(target, targetId, body)
    setComments((prev) => [...prev, created])
  }

  const character = user?.character ?? null

  return (
    <section style={{ marginTop: 'var(--space-xl)' }}>
      <h3 className="eyebrow" style={{ marginBottom: 'var(--space-md)' }}>
        {t('comments.heading', { count: comments.length })}
      </h3>
      {loading && (
        <p className="font-body content-text" style={{ color: 'var(--color-text-tertiary)' }}>
          {t('comments.loading')}
        </p>
      )}
      {error && (
        <p className="font-body content-text" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {comments.map((comment) => (
          <CommentRow
            key={comment.id}
            comment={comment}
            onEdited={(updated) =>
              setComments((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
            }
            onWithdrawn={(id) => setComments((prev) => prev.filter((row) => row.id !== id))}
          />
        ))}
      </div>
      {/* Hide the composer below comment level (repo convention: hide, don't disable). */}
      {character && user?.can_comment && (
        <div style={{ marginTop: 'var(--space-xl)' }}>
          <CommentComposer character={character} onPost={handlePost} />
        </div>
      )}
    </section>
  )
}

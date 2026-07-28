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
import { factionCssVar, factionFill } from '../../utils/factions'
import { formatCommentTime } from '../../utils/commentTime'
import {
  type CommentProps,
  authorToCharacter,
  ComposerControls,
  MentionText,
} from './shared'
import { CommentEditor, OwnerControls, useOwnerEdit } from './OwnerControls'
import { CommentFlagControl, canFlagComment } from './FlagControl'

/**
 * Neutral fallback voice — invariant slots themed only by the faction CSS vars +
 * FactionAvatar + the timestamp dialect. Any unregistered faction renders this,
 * which is also the na / Unaffiliated identity (ADR-0039): so the row wears the
 * spectrum-band na tells — a rainbow hairline across the bubble top and
 * gradient-clipped @mentions (#970), reached via factionFill/`--faction-default-rainbow`
 * (NOT factionCssVar, which is neutral grey for na).
 */
export function DefaultComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  const { user } = useAuth()
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
            onAccent={factionCssVar(character.faction_slug, 'on-accent')}
          />
        </div>
      </div>
    )
  }
  const { comment, onEdited, onWithdrawn } = props
  const slug = comment.author.faction_slug
  const accent = factionCssVar(slug, 'card-accent')
  const onAccent = factionCssVar(slug, 'on-accent')
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  // A quiet control row lives at the bubble foot (design intent) — but only when
  // there is something to show: the author's edit/withdraw or a flag affordance.
  // Hidden while editing, since the inline editor owns Save/Cancel then.
  const showControls =
    !owner.editing && (owner.isOwner || canFlagComment(comment, user?.character?.id))
  return (
    <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
      <FactionAvatar character={authorToCharacter(comment.author)} size="sm" />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          background: factionCssVar(slug, 'card-bg'),
          border: `1px solid ${factionCssVar(slug, 'border')}`,
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 4px 14px -10px rgba(0,0,0,0.4)',
        }}
      >
        {/* spectrum hairline — the na tell; a rainbow for default/na, a solid
            hue would never appear here because only default slugs reach this
            voice. Reached via factionFill (rainbow), not factionCssVar (grey). */}
        <div style={{ height: 3, ...factionFill(slug, 'bar') }} />
        <div style={{ padding: 'var(--space-md) var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
            <Link
              to={`/characters/${comment.author.id}`}
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontWeight: 700,
                color: factionCssVar(slug, 'card-text'),
                textDecoration: 'none',
              }}
            >
              {comment.author.display_name}
            </Link>
            <span style={{ fontSize: 'var(--text-md)', color: factionCssVar(slug, 'card-muted') }}>
              {formatCommentTime(slug, comment.created_at)}
              {comment.is_edited ? ` · ${t('comments.edited')}` : ''}
            </span>
          </div>
          <div style={{ marginTop: 'var(--space-xs)', color: factionCssVar(slug, 'card-text'), lineHeight: 1.5 }}>
            {owner.editing ? (
              <CommentEditor owner={owner} accent={accent} onAccent={onAccent} />
            ) : (
              <MentionText body={comment.body_text} mentions={comment.mentions} accent={accent} rainbow />
            )}
          </div>
          {showControls && (
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                flexWrap: 'wrap',
                gap: 'var(--space-md)',
                marginTop: 'var(--space-sm)',
                paddingTop: 'var(--space-sm)',
                borderTop: `1px solid ${factionCssVar(slug, 'border')}`,
              }}
            >
              <OwnerControls owner={owner} />
              <CommentFlagControl comment={comment} />
            </div>
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
  showHeading = true,
}: {
  target: CommentTarget
  targetId: number
  /**
   * Draw the thread's own `{n} comments` heading. Default true — every surface
   * that mounts the thread bare still gets one. Task-detail archetypes dress
   * their own section head (#1030) and pass false, or the page carries two
   * headings for one list.
   */
  showHeading?: boolean
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
      {showHeading && (
        <h3 className="eyebrow" style={{ marginBottom: 'var(--space-md)' }}>
          {t('comments.heading', { count: comments.length })}
        </h3>
      )}
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

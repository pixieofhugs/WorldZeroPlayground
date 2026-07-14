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
import { factionCssVar } from '../../utils/factions'
import { formatCommentTime } from '../../utils/commentTime'
import {
  type CommentComponent,
  type CommentProps,
  authorToCharacter,
  ComposerControls,
  MentionText,
} from './shared'
import UAComment from './voices/UAComment'
import EverymenComment from './voices/EverymenComment'
import WowComment from './voices/WowComment'
import SnideComment from './voices/SnideComment'
import EphemeristsComment from './voices/EphemeristsComment'
import SingularityComment from './voices/SingularityComment'
import AlbescentComment from './voices/AlbescentComment'

/**
 * Neutral fallback voice — invariant slots themed only by the faction CSS vars +
 * FactionAvatar + the timestamp dialect. Any unregistered faction renders this.
 */
export function DefaultComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    return (
      <div style={{ display: 'flex', gap: 10 }}>
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
  const { comment } = props
  const slug = comment.author.faction_slug
  const accent = factionCssVar(slug, 'card-accent')
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <FactionAvatar character={authorToCharacter(comment.author)} size="sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <Link
            to={`/characters/${comment.author.id}`}
            style={{ fontWeight: 600, color: accent, textDecoration: 'none' }}
          >
            {comment.author.display_name}
          </Link>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            {formatCommentTime(slug, comment.created_at)}
            {comment.is_edited ? ` · ${t('comments.edited')}` : ''}
          </span>
        </div>
        <div style={{ marginTop: 2, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
          <MentionText body={comment.body_text} mentions={comment.mentions} accent={accent} />
        </div>
      </div>
    </div>
  )
}

/** Seven faction comment archetypes (ADR-0018). Albescent is explicit, so it
 *  beats the albescent→ua alias for comments while still aliasing elsewhere. */
export const COMMENT_COMPONENTS: Record<string, CommentComponent> = {
  ua: UAComment,
  everymen: EverymenComment,
  wow: WowComment,
  snide: SnideComment,
  ephemerists: EphemeristsComment,
  singularity: SingularityComment,
  albescent: AlbescentComment,
}

function CommentRow({ comment }: { comment: CommentOut }) {
  const Variant = pickVariant(COMMENT_COMPONENTS, comment.author.faction_slug, DefaultComment)
  return <Variant mode="row" comment={comment} />
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
  const Variant = pickVariant(COMMENT_COMPONENTS, character.faction_slug, DefaultComment)
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
    <section style={{ marginTop: 24 }}>
      <h3 className="eyebrow" style={{ marginBottom: 12 }}>
        {t('comments.heading', { count: comments.length })}
      </h3>
      {loading && (
        <p className="font-body" style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          {t('comments.loading')}
        </p>
      )}
      {error && (
        <p className="font-body" style={{ fontSize: 12, color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {comments.map((comment) => (
          <CommentRow key={comment.id} comment={comment} />
        ))}
      </div>
      {/* Hide the composer below comment level (repo convention: hide, don't disable). */}
      {character && user?.can_comment && (
        <div style={{ marginTop: 20 }}>
          <CommentComposer character={character} onPost={handlePost} />
        </div>
      )}
    </section>
  )
}

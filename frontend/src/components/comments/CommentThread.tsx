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
import {
  CommentEditor,
  OwnerControls,
  useOwnerEdit,
  useOwnerReveal,
  ownerRevealStyle,
} from './OwnerControls'
import { CommentFlagControl, canFlagComment } from './FlagControl'

/**
 * THE SPECTRUM BUBBLE — the comment voice of the UNAFFILIATED (`na`) identity,
 * and the fallback for any slug with no voice of its own. `default ≡ na ≡
 * Unaffiliated` is one identity (ADR-0039 / 0046 / 0048): this IS the
 * unaffiliated kit, not a generic neutral. Albescent renders through it too and
 * stays that way — `albescent ≡ na + drift` (ADR-0048), its card carries the
 * difference — so nothing here may narrow to `na`.
 *
 * The na tells, and only these: a spectrum hairline across the top of every
 * sheet, and gradient-clipped @mentions (#970). Both reached through
 * `factionFill` / `--faction-default-rainbow`, NEVER `factionCssVar`, which is
 * neutral grey for na. Everything else is the quiet cream sheet the rest of the
 * na kit uses — Lora italic for the name, Courier Prime for every label,
 * `.content-text` for the body, because a comment IS content (§4 role floor).
 *
 * Six states, one component (ADR-0056 / 0058 / 0063 — no mobile twin):
 *   row · default | row · mention + edited | row · yours (hover) |
 *   row · editing | composer · empty | composer · submitting
 *
 * The owner's edit/withdraw row is the only behavioural change (#1195): it now
 * reveals on hover OR keyboard focus, and never gates at all on a device that
 * cannot hover. See `useOwnerReveal`.
 */

/** Label-tier caption voice, shared by every small mark on the sheet. */
const CAPTION = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-base)',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
} as const

/**
 * The sheet both modes sit on: avatar in the margin, a cream card carrying the
 * spectrum hairline. One shape for a row and for the composer, so the thread
 * reads as one stack rather than a list plus a form.
 */
function Sheet({
  slug,
  avatar,
  children,
  containerProps,
}: {
  slug: string | null | undefined
  avatar: React.ReactNode
  children: React.ReactNode
  containerProps?: React.ComponentPropsWithoutRef<'div'>
}) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
      {avatar}
      <div
        {...containerProps}
        style={{
          flex: 1,
          minWidth: 0,
          background: factionCssVar(slug, 'card-bg'),
          border: `1px solid ${factionCssVar(slug, 'border')}`,
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: '0 4px 14px -10px rgba(0,0,0,0.4)',
        }}
      >
        {/* The spectrum hairline — the na tell. A rainbow for default/na via
            factionFill; a themed slug would land here only if it registered no
            voice, and then it gets its own solid hue, not a borrowed one. */}
        <div style={{ height: 3, ...factionFill(slug, 'bar') }} />
        <div style={{ padding: 'var(--space-md) var(--space-lg)' }}>{children}</div>
      </div>
    </div>
  )
}

export function DefaultComment(props: CommentProps) {
  const { t } = useTranslation('praxis')
  const { user } = useAuth()
  const reveal = useOwnerReveal()
  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    const slug = character.faction_slug
    return (
      <Sheet slug={slug} avatar={<FactionAvatar character={character} size="sm" />}>
        {/* `.content-text` rides the wrapper on purpose: the ONE slot inside
            without a size of its own is the textarea (`font: inherit`), and a
            comment draft is content-tier text (§4). Every other slot — count,
            hint, Cancel, Post — names its own size. */}
        <div className="content-text" aria-busy={submitting}>
          <ComposerControls
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            submitting={submitting}
            accent={factionCssVar(slug, 'card-accent')}
            onAccent={factionCssVar(slug, 'on-accent')}
            // The field tier, not the sheet: an input reads as inset rather
            // than painted on. Default-only tokens, and only default-keyed
            // slugs reach this voice (every themed faction has one of its own).
            bg="var(--faction-default-composer-field)"
            text={factionCssVar(slug, 'card-text')}
            hint={
              <span style={{ ...CAPTION, color: factionCssVar(slug, 'card-muted') }}>
                {t('comments.na.mentionHint')}
              </span>
            }
          />
        </div>
      </Sheet>
    )
  }
  const { comment, onEdited, onWithdrawn } = props
  const slug = comment.author.faction_slug
  const accent = factionCssVar(slug, 'card-accent')
  const onAccent = factionCssVar(slug, 'on-accent')
  const owner = useOwnerEdit({ comment, onEdited, onWithdrawn })
  const canFlag = canFlagComment(comment, user?.character?.id)
  // A quiet control row lives at the sheet's foot — but only when there is
  // something to show: the author's edit/withdraw or a flag affordance. Hidden
  // while editing, since the inline editor owns Save/Cancel then.
  const showControls = !owner.editing && (owner.isOwner || canFlag)
  // On your OWN comment the foot holds nothing but the gated owner row, so the
  // rule above it fades with the row — a hairline over empty space is a state
  // the sheet never draws. A flaggable (someone else's) comment keeps its foot.
  const footGate = owner.isOwner && !canFlag ? ownerRevealStyle(reveal.revealed) : null
  return (
    <Sheet
      slug={slug}
      avatar={<FactionAvatar character={authorToCharacter(comment.author)} size="sm" />}
      containerProps={reveal.containerProps}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--space-sm)',
          flexWrap: 'wrap',
        }}
      >
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
        <span style={{ ...CAPTION, color: factionCssVar(slug, 'card-muted') }}>
          {formatCommentTime(slug, comment.created_at)}
        </span>
        {comment.is_edited && (
          <span style={{ ...CAPTION, color: factionCssVar(slug, 'card-muted') }}>
            <span aria-hidden="true">· </span>
            {t('comments.edited')}
          </span>
        )}
      </div>
      {/* The body is user-authored free text — the content floor, in both the
          resting and the editing state (the editor's textarea inherits it). */}
      <div
        className="content-text"
        style={{
          marginTop: 'var(--space-sm)',
          fontFamily: 'var(--font-body)',
          color: factionCssVar(slug, 'card-text'),
          lineHeight: 1.55,
          overflowWrap: 'anywhere',
        }}
      >
        {owner.editing ? (
          <CommentEditor
            owner={owner}
            accent={accent}
            onAccent={onAccent}
            bg="var(--faction-default-composer-field)"
            text={factionCssVar(slug, 'card-text')}
          />
        ) : (
          <MentionText
            body={comment.body_text}
            mentions={comment.mentions}
            accent={accent}
            rainbow
          />
        )}
      </div>
      {showControls && (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: 'var(--space-md)',
            marginTop: 'var(--space-md)',
            paddingTop: 'var(--space-sm)',
            // A divider INSIDE the sheet is quieter than the sheet's own edge.
            borderTop: '1px solid var(--faction-default-composer-hair)',
            ...footGate,
          }}
        >
          <OwnerControls owner={owner} reveal={reveal} />
          <CommentFlagControl comment={comment} />
        </div>
      )}
    </Sheet>
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

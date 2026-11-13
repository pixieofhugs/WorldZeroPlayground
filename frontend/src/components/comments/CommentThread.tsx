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
import { resolveVariant } from '../../utils/factionDispatch'
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
} from './OwnerControls'
import { CommentFlagControl, canFlagComment } from './FlagControl'

/**
 * The spectrum bubble: the comment voice of the unaffiliated (`na`) identity
 * and the fallback for any slug without one (ADR-0039 / 0046 / 0048).
 * Albescent (`na + drift`) renders through it too, so nothing may narrow to `na`.
 *
 * The na tells, and only these: a spectrum hairline across the top of each
 * sheet, and gradient-clipped @mentions (#970) — via `factionFill` /
 * `--faction-default-rainbow`, never `factionCssVar` (neutral grey for na).
 * A revealed Albescent viewer swaps the cap for a ring via the `edge` slot
 * (#2732, ADR-0088 §3); `AlbescentComment` owns that gate.
 *
 * Six states, one component (ADR-0056 / 0058 / 0063, no mobile twin). The
 * owner row reveals on hover or focus (#1195, see `useOwnerReveal`).
 */

/** Label-tier caption voice, shared by every small mark on the sheet. */
const CAPTION = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-base)',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
} as const

/** The hairline rounds to the same arc. */
const SHEET_RADIUS = 10

/** One sheet shape for row and composer, so the thread reads as one stack. */
function Sheet({
  slug,
  avatar,
  children,
  containerProps,
  edge,
}: {
  slug: string | null | undefined
  avatar: React.ReactNode
  children: React.ReactNode
  containerProps?: React.ComponentPropsWithoutRef<'div'>
  /**
   * The suppression slot (#2732, ADR-0088 §3): fill it and the top cap gives
   * way to whatever this draws; undefined renders the original bytes. A slot,
   * not a boolean, so this never learns a faction name; not a wrapper, because
   * the cap is inline and slug-computed.
   *
   * Contract: an `inset: 0`, absolutely positioned, `pointer-events: none`
   * overlay. `border-radius: inherit` resolves to `SHEET_RADIUS`.
   */
  edge?: React.ReactNode
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
          borderRadius: SHEET_RADIUS,
          // Only with an edge mounted: an unfilled slot must not change na's
          // style bytes.
          ...(edge ? { position: 'relative' as const } : null),
          // No `overflow: hidden` (#1255): it would clip the composer's
          // @mention listbox. The hairline rounds its own ends.
          boxShadow: '0 4px 14px -10px var(--color-cast-shadow)',
        }}
      >
        {/* The na hairline; carries the top corners itself (a background clips
            to its own radius). One carrier per object: `edge ?? cap` (#2732). */}
        {edge ?? (
          <div
            style={{
              height: 3,
              borderRadius: `${SHEET_RADIUS}px ${SHEET_RADIUS}px 0 0`,
              ...factionFill(slug, 'bar'),
            }}
          />
        )}
        <div style={{ padding: 'var(--space-md) var(--space-lg)' }}>{children}</div>
      </div>
    </div>
  )
}

/**
 * `edge` is the one prop beyond the archetype contract (#2732). The dispatcher
 * never passes it; only a voice rendering `DefaultComment` by hand can.
 */
export function DefaultComment(props: CommentProps & { edge?: React.ReactNode }) {
  const { edge } = props
  const { t } = useTranslation('praxis')
  const { user } = useAuth()
  const reveal = useOwnerReveal()
  if (props.mode === 'composer') {
    const { character, value, onChange, onSubmit, submitting } = props
    const slug = character.faction_slug
    return (
      <Sheet slug={slug} avatar={<FactionAvatar character={character} size="sm" />} edge={edge}>
        {/* `.content-text` on the wrapper: only the textarea (`font: inherit`)
            lacks its own size, and a draft is content-tier (§4). */}
        <div className="content-text" aria-busy={submitting}>
          <ComposerControls
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            submitting={submitting}
            accent={factionCssVar(slug, 'card-accent')}
            onAccent={factionCssVar(slug, 'on-accent')}
            // Field tier, inset not painted. Only default-keyed slugs reach here.
            bg="var(--faction-default-composer-field)"
            text={factionCssVar(slug, 'card-text')}
            // Overrides ComposerControls' neutral hint styling.
            hint={
              <span style={{ ...CAPTION, color: factionCssVar(slug, 'card-muted') }}>
                {t('comments.mentionHint')}
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
  // Hidden while editing: the inline editor owns Save/Cancel.
  const showControls = !owner.editing && (owner.isOwner || canFlag)
  // The foot rule is never gated (#2733); `<OwnerControls reveal>` gates
  // itself so it can stay pinned through the withdraw confirm.
  return (
    <Sheet
      slug={slug}
      avatar={<FactionAvatar character={authorToCharacter(comment.author)} size="sm" />}
      containerProps={reveal.containerProps}
      edge={edge}
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
          {formatCommentTime(comment.created_at)}
        </span>
        {comment.is_edited && (
          <span style={{ ...CAPTION, color: factionCssVar(slug, 'card-muted') }}>
            <span aria-hidden="true">· </span>
            {t('comments.edited')}
          </span>
        )}
      </div>
      {/* User-authored: content floor, editing included. */}
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
            // Quieter than the sheet's own edge.
            borderTop: '1px solid var(--faction-default-composer-hair)',
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
  const Variant = resolveVariant(surfaceMap('comment'), comment.author.faction_slug)
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
  const Variant = resolveVariant(surfaceMap('comment'), character.faction_slug)
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
  seed,
}: {
  target: CommentTarget
  targetId: number
  /**
   * Draw the `{n} comments` heading. Task-detail archetypes dress their own
   * (#1030) and pass false.
   */
  showHeading?: boolean
  /**
   * Rows the page already fetched for `targetId` (#1281), so comments don't
   * wait a round trip behind the page's own data. SEEDS local state (the
   * optimistic append survives). `[]` is an answer; only `undefined`/`null`
   * means "unasked" and the thread fetches itself.
   */
  seed?: CommentOut[] | null
}) {
  const { t } = useTranslation(['praxis', 'common'])
  const { user } = useAuth()
  const [comments, setComments] = useState<CommentOut[]>(seed ?? [])
  const [loading, setLoading] = useState(seed == null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // A seed arrives in the same render as its `targetId`, so the closure is
    // trustworthy on target changes too.
    if (seed) {
      setComments(seed)
      setError(null)
      setLoading(false)
      return
    }
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
        <h3 className="label-heading" style={{ marginBottom: 'var(--space-md)' }}>
          {t('comments.heading', { count: comments.length })}
        </h3>
      )}
      {loading && (
        <p className="font-body content-text" style={{ color: 'var(--color-text-tertiary)' }}>
          {t('common:loading')}
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

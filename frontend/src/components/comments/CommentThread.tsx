import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CharacterOut } from '../../api/auth'
import {
  type CommentOut,
  type CommentTarget,
  createComment,
  listComments,
} from '../../api/comments'
import { useAuth } from '../../auth/AuthContext'
import { resolveVariant } from '../../utils/factionDispatch'
import { surfaceMap } from '../../factions'

/**
 * THE SPECTRUM BUBBLE MOVED, AND IT TOOK ITS PIXELS AS TOKENS (#2650).
 *
 * na's comment voice used to be declared here as `DefaultComment`, ~140 lines
 * of chrome written inline. It is `components/comments/Comment.tsx` now — the
 * SHARED chassis, which resolves every slot off `--faction-<key>-comment-*` and
 * paints nothing of its own. Nothing about what na renders changed: its set is
 * a transcription, alias for alias, of what stood here.
 *
 * The two na tells are intact and only one of them is a token. The spectrum
 * hairline is `--faction-default-comment-crown`, verbatim
 * `factionFill(slug, 'bar')`. The gradient-clipped @mentions are NOT a token
 * and cannot be — `MentionText` takes an ink STRING and a `background-clip`
 * fill is not a colour — so the chassis carries that one as a predicate. See
 * its docblock.
 */

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
   * Draw the thread's own `{n} comments` heading. Default true — every surface
   * that mounts the thread bare still gets one. Task-detail archetypes dress
   * their own section head (#1030) and pass false, or the page carries two
   * headings for one list.
   */
  showHeading?: boolean
  /**
   * Rows the mounting page already fetched, for `targetId` (#1281). Both detail
   * pages gate this thread behind their own data — a hidden praxis and a
   * non-active task render none — so the thread's own effect could not start
   * until that data had landed, putting comments a whole round trip behind
   * everything else on the two most-linked pages in the app. The page hooks now
   * carry `listComments` in the `Promise.all` they already run off the route
   * param and hand the result down here.
   *
   * It SEEDS the local state rather than replacing it: `comments` stays this
   * component's own after mount, so `handlePost`'s optimistic append survives.
   * Omit it (every bare mount) and the thread fetches for itself, unchanged.
   * `[]` is an answer, not an absence — only `undefined`/`null` means "unasked".
   */
  seed?: CommentOut[] | null
}) {
  const { t } = useTranslation(['praxis', 'common'])
  const { user } = useAuth()
  const [comments, setComments] = useState<CommentOut[]>(seed ?? [])
  const [loading, setLoading] = useState(seed == null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // A seed always arrives in the same render as the `targetId` it belongs to
    // — both pages read `targetId` off the entity the batch resolved, so they
    // move together — which is why this effect can trust the current closure
    // and take the seed on a target CHANGE too, not only on first mount.
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

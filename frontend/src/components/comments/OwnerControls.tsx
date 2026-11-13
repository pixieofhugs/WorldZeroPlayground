/**
 * Comment author affordance (#456, extends ADR-0018): one neutral edit/withdraw
 * control for every faction voice. The state machine (`useOwnerEdit`) and the
 * hover/focus gate (`useOwnerReveal`, #1195) live here once; voices opt in.
 */
import { type CSSProperties, type FocusEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type CommentOut, deleteComment, editComment } from '../../api/comments'
import { useAuth } from '../../auth/AuthContext'
import { ComposerControls, MAX_COMMENT_BODY } from './shared'

/** Re-exported for callers that read the cap from here; lives in `shared.tsx` (#1205). */
export { MAX_COMMENT_BODY }

/** Author-only: the affordance shows solely for the viewer's own comment. */
export function isCommentOwner(
  comment: CommentOut,
  characterId: number | null | undefined,
): boolean {
  return characterId != null && characterId === comment.author.id
}

/* The save gate is `ComposerControls`' own `disabled` (#1524); don't re-derive it. */

type OwnerMode = 'idle' | 'editing' | 'confirm'

export interface OwnerEdit {
  isOwner: boolean
  editing: boolean
  confirming: boolean
  draft: string
  setDraft: (value: string) => void
  saving: boolean
  withdrawing: boolean
  error: string | null
  startEdit: () => void
  cancelEdit: () => void
  save: () => void
  startConfirm: () => void
  cancelConfirm: () => void
  confirmWithdraw: () => void
}

export function useOwnerEdit({
  comment,
  onEdited,
  onWithdrawn,
}: {
  comment: CommentOut
  onEdited?: (updated: CommentOut) => void
  onWithdrawn?: (id: number) => void
}): OwnerEdit {
  const { t } = useTranslation('praxis')
  const { user } = useAuth()
  const isOwner = isCommentOwner(comment, user?.character?.id)

  const [mode, setMode] = useState<OwnerMode>('idle')
  const [draft, setDraft] = useState(comment.body_text)
  const [saving, setSaving] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startEdit = () => {
    setDraft(comment.body_text)
    setError(null)
    setMode('editing')
  }
  const cancelEdit = () => {
    setError(null)
    setMode('idle')
  }
  const save = () => {
    const body = draft.trim()
    if (!body || saving) return
    setSaving(true)
    setError(null)
    editComment(comment.id, body)
      .then((updated) => {
        onEdited?.(updated)
        setMode('idle')
      })
      .catch(() => setError(t('comments.editError')))
      .finally(() => setSaving(false))
  }

  const startConfirm = () => {
    setError(null)
    setMode('confirm')
  }
  const cancelConfirm = () => {
    setError(null)
    setMode('idle')
  }
  const confirmWithdraw = () => {
    if (withdrawing) return
    setWithdrawing(true)
    setError(null)
    deleteComment(comment.id)
      .then(() => onWithdrawn?.(comment.id))
      .catch(() => {
        setError(t('comments.withdrawError'))
        setWithdrawing(false)
      })
  }

  return {
    isOwner,
    editing: mode === 'editing',
    confirming: mode === 'confirm',
    draft,
    setDraft,
    saving,
    withdrawing,
    error,
    startEdit,
    cancelEdit,
    save,
    startConfirm,
    cancelConfirm,
    confirmWithdraw,
  }
}

/** A device that cannot hover always shows the owner row. */
const HOVER_CAPABLE_QUERY = '(hover: hover)'

function detectHoverCapable(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    // Static render: assume a pointer. The gate is opacity-only, so the
    // controls stay in the markup either way.
    return true
  }
  return window.matchMedia(HOVER_CAPABLE_QUERY).matches
}

/**
 * Spread `containerProps` on the comment's outermost element and pass the
 * whole object to `<OwnerControls reveal={…}>`.
 */
export interface OwnerReveal {
  revealed: boolean
  containerProps: {
    onMouseEnter: () => void
    onMouseLeave: () => void
    onFocus: () => void
    onBlur: (event: FocusEvent<HTMLElement>) => void
  }
}

/**
 * Progressive reveal for the author's row (#1195). Three routes, so it is never
 * mouse-only: pointer enter/leave; bubbling focus/blur on the same root
 * (`:focus-within` without CSS — the buttons stay mounted, so Tab reaches
 * them); and no gate at all without hover capability. `<OwnerControls>` pins
 * the withdraw-confirm open itself.
 */
export function useOwnerReveal(): OwnerReveal {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hoverCapable, setHoverCapable] = useState(detectHoverCapable)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      setHoverCapable(false)
      return
    }
    const query = window.matchMedia(HOVER_CAPABLE_QUERY)
    const sync = () => setHoverCapable(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  return {
    revealed: !hoverCapable || hovered || focused,
    containerProps: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      onFocus: () => setFocused(true),
      onBlur: (event: FocusEvent<HTMLElement>) => {
        // Only focus leaving the card counts, so Tab between buttons doesn't flicker.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false)
        }
      },
    },
  }
}

/** Opacity, never unmounting: a removed control is unreachable by keyboard. */
export function ownerRevealStyle(revealed: boolean): CSSProperties {
  return { opacity: revealed ? 1 : 0, transition: 'opacity 120ms ease-out' }
}

/* No `color`: `.label-caption` paints `--label-ink`, which a faction frame
   may repoint (#1307). */
const linkStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
} as const

/**
 * Edit · delete for the meta cluster; self-hides for non-authors and while
 * editing. Pass `reveal` to hover-gate it; omit it and the row is always shown.
 */
export function OwnerControls({
  owner,
  reveal,
}: {
  owner: OwnerEdit
  reveal?: OwnerReveal
}) {
  const { t } = useTranslation('praxis')
  if (!owner.isOwner || owner.editing) return null

  // The confirm strip pins itself open: a pointer wandering off must not swallow it.
  const gate = reveal == null ? null : ownerRevealStyle(reveal.revealed || owner.confirming)

  if (owner.confirming) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 'var(--space-sm)',
          fontSize: 'var(--text-content)',
          ...gate,
        }}
      >
        <span style={{ color: 'var(--color-text-tertiary)' }}>
          {t('comments.confirmWithdraw')}
        </span>
        <button
          onClick={owner.confirmWithdraw}
          disabled={owner.withdrawing}
          className="font-body label-caption hover:underline"
          style={{ ...linkStyle, color: 'var(--color-danger)' }}
        >
          {t('comments.withdraw')}
        </button>
        <span aria-hidden="true" style={{ color: 'var(--color-text-tertiary)' }}>
          ·
        </span>
        <button
          onClick={owner.cancelConfirm}
          className="font-body label-caption hover:underline"
          style={linkStyle}
        >
          {t('comments.keep')}
        </button>
        {owner.error && (
          <span style={{ color: 'var(--color-danger)', width: '100%' }}>{owner.error}</span>
        )}
      </span>
    )
  }

  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'baseline', gap: 'var(--space-sm)', ...gate }}
    >
      <button
        onClick={owner.startEdit}
        aria-label={t('comments.edit')}
        className="font-body label-caption hover:underline"
        style={linkStyle}
      >
        {t('comments.edit')}
      </button>
      <span aria-hidden="true" style={{ color: 'var(--color-text-tertiary)' }}>
        ·
      </span>
      <button
        onClick={owner.startConfirm}
        aria-label={t('comments.delete')}
        className="font-body label-caption hover:underline"
        style={linkStyle}
      >
        {t('comments.delete')}
      </button>
    </span>
  )
}

/**
 * The resting body's replacement while editing: the voice's own
 * ComposerControls with Save/Cancel. The cap is ComposerControls' default (#1205).
 */
export function CommentEditor({
  owner,
  accent,
  onAccent,
  bg,
  text,
}: {
  owner: OwnerEdit
  accent: string
  /** AA ink for the Save button, painted in `accent` (#924). See ComposerControls. */
  onAccent: string
  bg?: string
  text?: string
}) {
  const { t } = useTranslation('praxis')
  return (
    <div>
      <ComposerControls
        value={owner.draft}
        onChange={owner.setDraft}
        onSubmit={owner.save}
        submitting={owner.saving}
        accent={accent}
        onAccent={onAccent}
        bg={bg}
        text={text}
        submitLabel={t('comments.save')}
        onCancel={owner.cancelEdit}
      />
      {owner.error && (
        <p style={{ fontSize: 'var(--text-content)', color: 'var(--color-danger)', marginTop: 'var(--space-xs)' }}>{owner.error}</p>
      )}
    </div>
  )
}

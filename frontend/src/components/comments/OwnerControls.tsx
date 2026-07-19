/**
 * Comment author affordance (#456, extends ADR-0018).
 *
 * One NEUTRAL edit/withdraw control, identical across every faction voice — no
 * per-voice ornament. All the toggle / confirm / edit-state logic lives ONCE
 * here (in `useOwnerEdit`); each voice opts in by calling the hook and dropping
 * `<OwnerControls>` in its meta cluster + swapping its body slot for
 * `<CommentEditor>` while editing. No voice re-implements the state machine.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type CommentOut, deleteComment, editComment } from '../../api/comments'
import { useAuth } from '../../auth/AuthContext'
import { ComposerControls } from './shared'

/** The real body cap the backend enforces (NOT the 500 of the composer draft). */
export const MAX_COMMENT_BODY = 2000

// ── Pure decisions (unit-testable without a DOM) ─────────────────────────────

/** Author-only: the affordance shows solely for the viewer's own comment. */
export function isCommentOwner(
  comment: CommentOut,
  characterId: number | null | undefined,
): boolean {
  return characterId != null && characterId === comment.author.id
}

/** Save is inert on an empty (whitespace-only) draft or while a save is inflight. */
export function editSaveDisabled(draft: string, saving: boolean): boolean {
  return saving || draft.trim().length === 0
}

// ── Shared state machine ─────────────────────────────────────────────────────

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

// ── Meta-cluster affordance (edit · delete / withdraw-confirm) ────────────────

const linkStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  color: 'var(--color-text-tertiary)',
} as const

/**
 * Neutral text affordance for the meta cluster — mirrors the praxis owner "edit"
 * link (tertiary `.eyebrow`). Self-hides for non-authors and while editing (the
 * inline editor owns Save/Cancel then).
 */
export function OwnerControls({ owner }: { owner: OwnerEdit }) {
  const { t } = useTranslation('praxis')
  if (!owner.isOwner || owner.editing) return null

  if (owner.confirming) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 'var(--space-sm)',
          fontSize: 'var(--text-content)',
        }}
      >
        <span style={{ color: 'var(--color-text-tertiary)' }}>
          {t('comments.confirmWithdraw')}
        </span>
        <button
          onClick={owner.confirmWithdraw}
          disabled={owner.withdrawing}
          className="font-body eyebrow hover:underline"
          style={{ ...linkStyle, color: 'var(--color-danger)' }}
        >
          {t('comments.withdraw')}
        </button>
        <span aria-hidden="true" style={{ color: 'var(--color-text-tertiary)' }}>
          ·
        </span>
        <button
          onClick={owner.cancelConfirm}
          className="font-body eyebrow hover:underline"
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
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 'var(--space-sm)' }}>
      <button
        onClick={owner.startEdit}
        aria-label={t('comments.edit')}
        className="font-body eyebrow hover:underline"
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
        className="font-body eyebrow hover:underline"
        style={linkStyle}
      >
        {t('comments.delete')}
      </button>
    </span>
  )
}

// ── Body-slot editor (reuses the voice's ComposerControls) ────────────────────

/**
 * Drop-in replacement for the resting body while editing — the SAME
 * ComposerControls the voice uses to compose, seeded with the current body,
 * capped at MAX_COMMENT_BODY, with Save/Cancel. Each voice passes its own
 * accent/bg/text so the editor keeps the voice's skin.
 */
export function CommentEditor({
  owner,
  accent,
  bg,
  text,
}: {
  owner: OwnerEdit
  accent: string
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
        bg={bg}
        text={text}
        maxLength={MAX_COMMENT_BODY}
        submitLabel={t('comments.save')}
        onCancel={owner.cancelEdit}
      />
      {owner.error && (
        <p style={{ fontSize: 'var(--text-content)', color: 'var(--color-danger)', marginTop: 'var(--space-xs)' }}>{owner.error}</p>
      )}
    </div>
  )
}

/**
 * Comment author affordance (#456, extends ADR-0018).
 *
 * One NEUTRAL edit/withdraw control, identical across every faction voice — no
 * per-voice ornament. All the toggle / confirm / edit-state logic lives ONCE
 * here (in `useOwnerEdit`); each voice opts in by calling the hook and dropping
 * `<OwnerControls>` in its meta cluster + swapping its body slot for
 * `<CommentEditor>` while editing. No voice re-implements the state machine.
 *
 * #1195 adds the second shared behaviour beside it: `useOwnerReveal`, the
 * hover/focus gate the row now sits behind. Same deal — the gate lives here
 * once, a voice opts in with two lines, and nobody re-implements it either.
 */
import { type CSSProperties, type FocusEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type CommentOut, deleteComment, editComment } from '../../api/comments'
import { useAuth } from '../../auth/AuthContext'
import { ComposerControls, MAX_COMMENT_BODY } from './shared'

/**
 * Re-exported for the callers that already read the cap from here.
 *
 * It used to be declared in this file at 2000, described as "the real body cap
 * the backend enforces (NOT the 500 of the composer draft)". Both halves of that
 * were wrong: the composer had no cap at all, and 500 -- the number on every
 * design sheet -- is now the one cap for composer, editor and API alike (#1205).
 * It lives in `shared.tsx` beside the control that defaults to it.
 */
export { MAX_COMMENT_BODY }

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

// ── Hover / focus reveal of the owner row (#1195) ─────────────────────────────

/**
 * Does the viewer's primary input hover at all? A touch-only device answers no,
 * and there the owner row is ALWAYS shown — a hover-gate with no hover is a
 * control that does not exist.
 */
const HOVER_CAPABLE_QUERY = '(hover: hover)'

function detectHoverCapable(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    // Static render (the comment tests render to markup, no DOM). Assume a
    // pointer: the gate is opacity-only, so the controls are still in the
    // markup and still focusable either way.
    return true
  }
  return window.matchMedia(HOVER_CAPABLE_QUERY).matches
}

/**
 * The reveal state + the handlers that drive it. Spread `containerProps` on the
 * comment's OUTERMOST element (the card/bubble root) and hand the whole object
 * to `<OwnerControls reveal={…}>`.
 */
export interface OwnerReveal {
  /** True when the owner row should be visible. */
  revealed: boolean
  /** Spread onto the card root — the pointer + focus sources of the reveal. */
  containerProps: {
    onMouseEnter: () => void
    onMouseLeave: () => void
    onFocus: () => void
    onBlur: (event: FocusEvent<HTMLElement>) => void
  }
}

/**
 * Progressive reveal for the author's edit/withdraw row (#1195, design: the
 * Unaffiliated sheet's "Row · yours (hover)").
 *
 * Three routes to the control, because hover alone would make it mouse-only:
 *   1. pointer — `onMouseEnter` / `onMouseLeave` on the card root;
 *   2. keyboard — `onFocus` / `onBlur` on the same root, which is React's
 *      bubbling focus pair, i.e. `:focus-within` without a stylesheet. The
 *      buttons stay MOUNTED and merely transparent, so Tab reaches them and the
 *      first stop reveals the row;
 *   3. touch — a device that reports no hover capability never gates at all.
 *
 * Lives here, once, so the eight faction voices wire two lines (this hook + the
 * spread) instead of re-implementing a gate each. `revealed` deliberately does
 * NOT know about the withdraw-confirm strip; `<OwnerControls>` pins that open
 * itself, so a voice cannot forget to.
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
        // Only a focus leaving the card counts — moving between the row's own
        // buttons must not flicker it away mid-Tab.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false)
        }
      },
    },
  }
}

/**
 * The gate itself: OPACITY, never `display`/`visibility`/unmounting. A removed
 * control is unreachable by keyboard, which is the whole failure mode this
 * issue exists to avoid.
 */
export function ownerRevealStyle(revealed: boolean): CSSProperties {
  return { opacity: revealed ? 1 : 0, transition: 'opacity 120ms ease-out' }
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
 *
 * Pass `reveal` (from {@link useOwnerReveal}) to hover-gate it: the row then
 * fades in on pointer-hover or keyboard focus anywhere in the card, and is
 * always on for a device that cannot hover. Omit it and the row is always
 * visible — which is what the seven faction voices still do until each one
 * wires the two lines (#1196–#1202).
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

  // The confirm strip pins itself open: it is a question already asked, and a
  // pointer wandering off must not swallow it mid-answer.
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
    <span
      style={{ display: 'inline-flex', alignItems: 'baseline', gap: 'var(--space-sm)', ...gate }}
    >
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
 * ComposerControls the voice uses to compose, seeded with the current body, with
 * Save/Cancel. Each voice passes its own accent/bg/text so the editor keeps the
 * voice's skin.
 *
 * It no longer passes `maxLength`: ComposerControls defaults to MAX_COMMENT_BODY
 * for composing and editing alike (#1205), so the editor cannot drift from the
 * composer's cap.
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

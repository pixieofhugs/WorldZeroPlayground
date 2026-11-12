/**
 * Comment flag control (#575), the sibling of OwnerControls: shown to everyone
 * but the author (the backend 403s self-flags). Templated on PraxisFlagBlock
 * (ADR-0037 reasons). The note is only persisted for reason='other'.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthContext'
import { flagComment, type CommentOut } from '../../api/comments'
import { flagReasonOptions, type FlagReason } from '../../utils/flagReasons'
import { extractError } from '../../utils/errors'

/** Signed in, and not the author. */
export function canFlagComment(
  comment: CommentOut,
  viewerCharacterId: number | null | undefined,
): boolean {
  return viewerCharacterId != null && viewerCharacterId !== comment.author.id
}

export function CommentFlagControl({ comment }: { comment: CommentOut }) {
  const { t } = useTranslation('praxis')
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<FlagReason | null>(null)
  const [detail, setDetail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  if (!canFlagComment(comment, user?.character?.id)) return null

  if (submitted) {
    return (
      <span className="label-caption" style={{ color: 'var(--color-success)' }}>
        {t('detail.flag.flaggedTitle')}
      </span>
    )
  }

  const submit = async () => {
    if (reason === null || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await flagComment(comment.id, reason, detail)
      setSubmitted(true)
    } catch (err) {
      // Surface the backend's player-facing refusal (e.g. FLAG_LEVEL_TOO_LOW),
      // not a "try again" that can never succeed (#2138).
      setError(extractError(err, t('detail.flag.error')))
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setError(null) }}
        className="btn-outline text-[8px] px-2 py-1"
        style={{ borderColor: 'var(--color-danger-ring)', color: 'var(--color-danger)' }}
      >
        {t('detail.flag.flag')}
      </button>
    )
  }

  return (
    <div className="w-full mt-2">
      <div className="flex items-center gap-2 flex-wrap" role="radiogroup" aria-label={t('detail.flag.reasonGroupLabel')}>
        {flagReasonOptions().map(({ value, label }) => (
          <button
            key={value}
            role="radio"
            aria-checked={reason === value}
            onClick={() => { setReason(value); setError(null) }}
            disabled={submitting}
            className="btn-outline text-[9px] px-2 py-1"
            style={
              reason === value
                // Not --color-bg-surface: translucent, 1.04:1 over red (#1169).
                ? { background: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: 'var(--color-on-danger)' }
                : undefined
            }
          >
            {label}
          </button>
        ))}
      </div>
      {reason !== null && (
        <textarea
          className="border-2 border-border bg-card px-3 py-2 font-body content-text focus:outline-none focus:border-ink w-full resize-none mt-2"
          rows={2}
          placeholder={t('detail.flag.notePlaceholder')}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          disabled={submitting}
        />
      )}
      <div className="flex items-center gap-2 mt-2">
        {reason !== null && (
          <button onClick={() => void submit()} disabled={submitting} className="btn-primary text-[9px] px-3 py-1" style={{ background: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: 'var(--color-on-danger)' }}>
            {submitting ? t('detail.flag.submitting') : t('detail.flag.submit')}
          </button>
        )}
        <button onClick={() => { setOpen(false); setReason(null); setDetail(''); setError(null) }} disabled={submitting} className="btn-outline text-[9px] px-3 py-1">
          {t('detail.flag.cancel')}
        </button>
      </div>
      {error && <p className="font-body content-text mt-1" style={{ color: 'var(--color-danger)' }}>{error}</p>}
    </div>
  )
}

/**
 * Comment flag control (#575) — the sibling of OwnerControls: a per-comment
 * action every voice renders next to the byline. OwnerControls shows for the
 * author; this shows for everyone else. Templated on praxisDetail's
 * PraxisFlagBlock (shared reason vocabulary ADR-0037), compact for the inline
 * comment header. A note is available for every reason (mirrors #570); the
 * backend only persists it for reason='other', and 403s self-flags — so this is
 * hidden on the viewer's own comment.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthContext'
import { flagComment, type CommentOut } from '../../api/comments'
import { flagReasonOptions, type FlagReason } from '../../utils/flagReasons'

/** May the viewer flag this comment? Signed in, and not the author. */
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
      <span className="eyebrow" style={{ fontSize: 9, color: 'var(--color-success)' }}>
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
    } catch {
      setError(t('detail.flag.error'))
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setError(null) }}
        className="btn-outline"
        style={{ fontSize: 8, padding: '2px 8px', borderColor: 'rgba(220,38,38,0.4)', color: 'var(--color-danger)' }}
      >
        {t('detail.flag.flag')}
      </button>
    )
  }

  return (
    <div style={{ width: '100%', marginTop: 6 }}>
      <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }} role="radiogroup" aria-label={t('detail.flag.reasonGroupLabel')}>
        {flagReasonOptions().map(({ value, label }) => (
          <button
            key={value}
            role="radio"
            aria-checked={reason === value}
            onClick={() => { setReason(value); setError(null) }}
            disabled={submitting}
            className="btn-outline"
            style={{
              fontSize: 9,
              padding: '3px 8px',
              ...(reason === value
                ? { background: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: 'var(--color-bg-surface)' }
                : {}),
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {reason !== null && (
        <textarea
          className="border-2 border-border bg-card px-3 py-2 font-body text-sm focus:outline-none focus:border-ink w-full resize-none"
          rows={2}
          placeholder={t('detail.flag.notePlaceholder')}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          disabled={submitting}
          style={{ marginTop: 6 }}
        />
      )}
      <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
        {reason !== null && (
          <button onClick={() => void submit()} disabled={submitting} className="btn-primary" style={{ fontSize: 9, padding: '3px 10px', background: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
            {submitting ? t('detail.flag.submitting') : t('detail.flag.submit')}
          </button>
        )}
        <button onClick={() => { setOpen(false); setReason(null); setDetail(''); setError(null) }} disabled={submitting} className="btn-outline" style={{ fontSize: 9, padding: '3px 10px' }}>
          {t('detail.flag.cancel')}
        </button>
      </div>
      {error && <p className="font-body text-xs" style={{ color: 'var(--color-danger)', marginTop: 4 }}>{error}</p>}
    </div>
  )
}

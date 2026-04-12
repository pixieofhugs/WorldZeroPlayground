import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getSubmission, flagSubmission, type SubmissionOut } from '../api/submissions'
import { getVotes, type VoteSummary } from '../api/votes'
import MediaGallery from '../components/MediaGallery'
import { formatTimestamp } from '../utils/dates'
import StarRating from '../components/StarRating'
import { useAuth } from '../auth/AuthContext'
import { extractError } from '../utils/errors'

export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [submission, setSubmission] = useState<SubmissionOut | null>(null)
  const [votes, setVotes] = useState<VoteSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [flagging, setFlagging] = useState(false)
  const [flagError, setFlagError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const sid = parseInt(id, 10)
    Promise.all([getSubmission(sid), getVotes(sid)])
      .then(([s, v]) => { setSubmission(s); setVotes(v) })
      .catch((err) => setFetchError(extractError(err, "Couldn't load this submission.")))
      .finally(() => setLoading(false))
  }, [id])

  const handleFlag = async () => {
    if (!submission) return
    const reason = window.prompt('Reason for flagging:')
    if (!reason) return
    setFlagging(true)
    setFlagError(null)
    try {
      const updated = await flagSubmission(submission.id, reason)
      setSubmission(updated)
    } catch (err) {
      setFlagError(extractError(err, 'Could not flag this submission.'))
    } finally {
      setFlagging(false)
    }
  }

  if (loading) return <div className="page font-body text-muted">Loading...</div>
  if (fetchError) return (
    <div className="page">
      <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
        {fetchError}{' '}
        <button onClick={() => window.location.reload()} className="underline">Try refreshing.</button>
      </p>
    </div>
  )
  if (!submission) return <div className="page font-body text-muted">Not found.</div>

  const canFlag = (user?.character?.level ?? 0) >= 4 && user?.character?.id !== submission.character_id

  return (
    <div className="page max-w-2xl">
      <Link to={`/tasks/${submission.task_id}`} className="font-body text-xs text-muted hover:underline">
        ← back to task
      </Link>

      <div className="card p-5 my-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-3xl font-bold leading-tight">{submission.title}</h1>
          <div className="flex items-center gap-3 shrink-0">
            <Link to={`/characters/${submission.character_id}`} className="font-body text-xs text-muted hover:underline">
              by #{submission.character_id}
            </Link>
            {user?.character?.id === submission.character_id && (
              <Link to={`/submissions/${submission.id}/edit`} className="font-body text-xs hover:underline">
                edit
              </Link>
            )}
          </div>
        </div>

        {submission.body_text && (
          <p className="font-body text-base text-ink mt-4 leading-relaxed whitespace-pre-wrap">
            {submission.body_text}
          </p>
        )}

        {submission.media.length > 0 && (
          <div className="mt-5">
            <MediaGallery media={submission.media} />
          </div>
        )}
      </div>

      {/* Voting */}
      <div className="card p-4 my-4">
        <h2 className="font-display text-xl font-bold mb-3">Rate this Praxis</h2>
        <StarRating
          submissionId={submission.id}
          averageStars={votes?.average_stars}
          totalVotes={votes?.total_votes}
        />
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 font-body text-xs text-muted mt-2">
        <span>Submitted {formatTimestamp(submission.created_at)}</span>
        {submission.is_flagged && (
          <span className="border border-red-400 text-red-600 px-2 py-0.5">flagged</span>
        )}
        {canFlag && !submission.is_flagged && (
          <button onClick={handleFlag} disabled={flagging} className="hover:underline text-muted">
            flag this
          </button>
        )}
      </div>
      {flagError && (
        <p className="font-body text-xs text-red-600 mt-1">{flagError}</p>
      )}
    </div>
  )
}

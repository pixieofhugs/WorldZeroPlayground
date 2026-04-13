import { Link } from 'react-router-dom'
import type { SubmissionOut } from '../api/submissions'

interface Props {
  submission: SubmissionOut
}

export default function SubmissionCard({ submission }: Props) {
  return (
    <div className="card p-4 flex flex-col gap-2 transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-sketch-lg">
      <Link to={`/submissions/${submission.id}`}>
        <h3 className="font-display text-xl font-semibold leading-tight hover:underline">
          {submission.title}
        </h3>
      </Link>

      {submission.body_text && (
        <p className="font-body text-sm text-muted leading-relaxed line-clamp-3">
          {submission.body_text}
        </p>
      )}

      <Link to={`/tasks/${submission.task_id}`} className="font-body text-xs text-muted hover:underline">
        {submission.task_title}
      </Link>

      <div className="flex justify-between items-center pt-2 border-t border-dashed border-border/40 font-body text-xs text-muted mt-auto">
        <Link to={`/characters/${submission.character_id}`} className="hover:underline">
          {submission.character_display_name || `#${submission.character_id}`}
        </Link>
        {submission.score !== null && (
          <span className="font-display text-sm font-bold text-ink">
            ★ {submission.score.toFixed(1)}
          </span>
        )}
      </div>
    </div>
  )
}

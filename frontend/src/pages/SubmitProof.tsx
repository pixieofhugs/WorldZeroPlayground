import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { createSubmission, uploadMedia } from '../api/submissions'
import { getTask, type TaskOut } from '../api/tasks'

export default function SubmitProof() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [task, setTask] = useState<TaskOut | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (id) {
      getTask(parseInt(id, 10)).then(setTask).catch(() => {})
    }
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    setError('')
    try {
      const submission = await createSubmission({ task_id: parseInt(id, 10), title, body_text: body || undefined })
      if (files) {
        for (const file of Array.from(files)) {
          await uploadMedia(submission.id, file)
        }
      }
      navigate(`/submissions/${submission.id}`)
    } catch {
      setError('Could not submit. Check you are signed up for this task.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page max-w-6xl">
      <h1 className="page-heading">Submit Proof</h1>

      {task && (
        <div className="card p-4 mb-4">
          <Link to={`/tasks/${task.id}`} className="font-display text-lg font-bold hover:underline">
            {task.title}
          </Link>
          {task.description && (
            <p className="font-body text-sm text-muted mt-1 leading-relaxed">{task.description}</p>
          )}
          <p className="font-body text-xs text-muted mt-2">
            Level {task.level_required} &middot; {task.point_value} points
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Title */}
        <div className="flex flex-col gap-1">
          <label className="font-body text-sm font-bold">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-2 border-border px-3 py-2 font-body text-sm bg-card shadow-sketch-sm focus:outline-none"
            placeholder="Give your proof a title"
          />
        </div>

        {/* Split pane: editor + preview */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Left: textarea */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="font-body text-sm font-bold">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={16}
              className="border-2 border-border px-3 py-2 font-body text-sm bg-card shadow-sketch-sm focus:outline-none resize-none h-full min-h-64"
              placeholder="Describe what you did... (supports **markdown**)"
            />
          </div>

          {/* Right: preview */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="font-body text-sm font-bold text-muted">Preview</label>
            <div className="border-2 border-border px-4 py-3 bg-card shadow-sketch-sm min-h-64 overflow-auto font-body text-sm markdown-preview">
              {body.trim() ? (
                <ReactMarkdown>{body}</ReactMarkdown>
              ) : (
                <p className="text-muted italic">Preview will appear here...</p>
              )}
            </div>
          </div>
        </div>

        {/* Media */}
        <div className="flex flex-col gap-1">
          <label className="font-body text-sm font-bold">Media</label>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*"
            onChange={(e) => setFiles(e.target.files)}
            className="font-body text-sm"
          />
        </div>

        {error && <p className="font-body text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Submitting...' : 'Submit Proof'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-outline">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

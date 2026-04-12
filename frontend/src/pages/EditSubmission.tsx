import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import {
  getSubmission,
  editSubmission,
  uploadMedia,
  deleteMedia,
  type MediaItemOut,
} from '../api/submissions'
import { useAuth } from '../auth/AuthContext'
import { extractError } from '../utils/errors'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export default function EditSubmission() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [taskId, setTaskId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [media, setMedia] = useState<MediaItemOut[]>([])
  const [newFiles, setNewFiles] = useState<FileList | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    getSubmission(parseInt(id, 10))
      .then((submission) => {
        if (user?.character?.id !== submission.character_id) {
          navigate(`/submissions/${id}`, { replace: true })
          return
        }
        setTaskId(submission.task_id)
        setTitle(submission.title)
        setBody(submission.body_text ?? '')
        setMedia(submission.media)
      })
      .catch(() => setError("Couldn't load this submission."))
      .finally(() => setLoading(false))
  }, [id, user])

  const handleRemoveMedia = async (mediaItem: MediaItemOut) => {
    if (!id) return
    try {
      await deleteMedia(parseInt(id, 10), mediaItem.id)
      setMedia((previous) => previous.filter((item) => item.id !== mediaItem.id))
    } catch (err) {
      setError(extractError(err, 'Could not remove media item.'))
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!id || !title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    setError('')
    try {
      const submissionId = parseInt(id, 10)
      await editSubmission(submissionId, { task_id: taskId!, title, body_text: body || undefined })
      if (newFiles) {
        for (const file of Array.from(newFiles)) {
          const uploaded = await uploadMedia(submissionId, file)
          setMedia((previous) => [...previous, uploaded])
        }
      }
      navigate(`/submissions/${id}`)
    } catch (err) {
      setError(extractError(err, 'Could not save changes.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="page font-body text-muted">Loading...</div>

  return (
    <div className="page max-w-6xl">
      <h1 className="page-heading">Edit Praxis</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Title */}
        <div className="flex flex-col gap-1">
          <label className="font-body text-sm font-bold">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-2 border-border px-3 py-2 font-body text-sm bg-card shadow-sketch-sm focus:outline-none"
          />
        </div>

        {/* Split pane: editor + preview */}
        <div className="flex flex-col md:flex-row gap-4">
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

        {/* Existing media */}
        {media.length > 0 && (
          <div className="flex flex-col gap-2">
            <label className="font-body text-sm font-bold">Attached Media</label>
            <div className="flex flex-col gap-3">
              {media.map((item) => {
                const src = `${BASE_URL}/media/${item.file_path}`
                const filename = item.file_path.split('/').pop() ?? item.file_path
                return (
                  <div key={item.id} className="flex items-center gap-3 border-2 border-border p-2 bg-card shadow-sketch-sm">
                    {item.type === 'image' && (
                      <img src={src} alt="" className="h-16 w-16 object-cover border border-border shrink-0" />
                    )}
                    {item.type === 'video' && (
                      <video src={src} className="h-16 w-16 object-cover border border-border shrink-0" />
                    )}
                    {item.type === 'audio' && (
                      <div className="h-16 w-16 flex items-center justify-center border border-border shrink-0 bg-muted/10 font-body text-xs text-muted">
                        audio
                      </div>
                    )}
                    <span className="font-body text-xs text-ink flex-1 truncate">{filename}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(item)}
                      className="font-body text-xs text-red-600 hover:underline shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Add new media */}
        <div className="flex flex-col gap-1">
          <label className="font-body text-sm font-bold">Add Media</label>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*"
            onChange={(e) => setNewFiles(e.target.files)}
            className="font-body text-sm"
          />
        </div>

        {error && <p className="font-body text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => navigate(`/submissions/${id}`)} className="btn-outline">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

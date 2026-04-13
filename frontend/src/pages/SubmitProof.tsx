import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { createSubmission, uploadMedia } from '../api/submissions'
import { getTask, type TaskOut } from '../api/tasks'
import LevelPill from '../components/ui/LevelPill'
import { useTheme } from '../hooks/useTheme'
import { factionColor, factionName } from '../utils/factions'

const RAINBOW_COLORS = ['#fbbf24', '#be185d', '#4f46e5', '#0e7490', '#16a34a', '#f97316', '#fbbf24', '#be185d']

export default function SubmitProof() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [task, setTask] = useState<TaskOut | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (id) getTask(parseInt(id, 10)).then(setTask).catch(() => {})
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    setError('')
    try {
      const submission = await createSubmission({ task_id: parseInt(id, 10), title, body_text: body || undefined })
      for (const file of files) {
        await uploadMedia(submission.id, file)
      }
      navigate(`/submissions/${submission.id}`)
    } catch {
      setError('Could not submit. Check you are signed up for this task.')
    } finally {
      setSaving(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const color = factionColor(task?.primary_faction_slug)
  const fname = factionName(task?.primary_faction_slug)
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0

  return (
    <div className="py-8" style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* ── Breadcrumb (§18.1) ── */}
      <nav className="font-body mb-4" style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--color-text-tertiary)' }}>
        <Link to="/tasks" style={{ color: 'inherit', textDecoration: 'none' }}>Tasks</Link>
        {task && (
          <>
            {' › '}
            <Link to={`/tasks/${task.id}`} style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}>{task.title}</Link>
          </>
        )}
        {' › '}
        <span style={{ color: 'var(--color-text-primary)' }}>Submit Proof</span>
      </nav>

      {/* ── Task Context Header (§18.2) ── */}
      {task && (
        <div
          className="sidebar-card mb-5"
          style={{ borderLeft: `4px solid ${color}`, padding: '12px 16px' }}
        >
          <span className="eyebrow" style={{ marginBottom: 4, display: 'block' }}>Proving completion of</span>
          <Link
            to={`/tasks/${task.id}`}
            className="font-display italic"
            style={{ fontSize: 18, color, textDecoration: 'none', display: 'block', marginBottom: 6 }}
          >
            {task.title}
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)',
                background: color, color: 'white',
                fontFamily: "'Courier Prime', monospace",
                fontSize: 8, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.07em', padding: '2px 10px',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              {fname}
            </span>
            <span className="eyebrow">{task.point_value} pts</span>
            <LevelPill level={task.level_required} />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        {/* ── Section 1: Proof Title (§18.3) ── */}
        <div
          className="sidebar-card"
          style={{ padding: '16px 18px', borderRadius: 12 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span className="eyebrow">Title</span>
            <span className="font-body" style={{ fontSize: 8, fontStyle: 'italic', color: 'var(--color-text-tertiary)' }}>required</span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What did you do?"
            style={{
              width: '100%',
              fontFamily: "'Lora', serif", fontStyle: 'italic', fontSize: 24,
              color: 'var(--color-text-primary)',
              background: 'transparent', border: 'none',
              borderBottom: `2px solid ${title ? color : (dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)')}`,
              outline: 'none', paddingBottom: 6,
              transition: 'border-color 150ms',
            }}
            onFocus={(e) => { e.currentTarget.style.borderBottomColor = color }}
            onBlur={(e) => { if (!title) e.currentTarget.style.borderBottomColor = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }}
          />
          {/* Rainbow underline — visible when title has text */}
          {title && (
            <div style={{ display: 'flex', height: 3, marginTop: 4, opacity: 0.6 }}>
              {RAINBOW_COLORS.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
            </div>
          )}
        </div>

        {/* ── Section 2: The Proof — Rich Text (§18.3) ── */}
        <div
          className="sidebar-card"
          style={{ padding: '16px 18px', borderRadius: 12 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span className="eyebrow">The proof</span>
            <span className="font-body" style={{ fontSize: 8, fontStyle: 'italic', color: 'var(--color-text-tertiary)' }}>supports markdown</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="Describe what you did..."
              style={{
                width: '100%',
                fontFamily: "'Lora', serif", fontSize: 14, color: dark ? '#e8dcc8' : '#2a1e10',
                lineHeight: 1.75, minHeight: 180,
                background: 'transparent', border: 'none', outline: 'none',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="eyebrow">{wordCount} words · no limit</span>
            </div>
          </div>

          {/* Preview */}
          {body.trim() && (
            <div style={{ borderTop: '1px dashed var(--color-border)', marginTop: 10, paddingTop: 10 }}>
              <span className="eyebrow" style={{ marginBottom: 6, display: 'block' }}>Preview</span>
              <div className="markdown-preview font-display" style={{ fontSize: 14, lineHeight: 1.75, color: dark ? '#e8dcc8' : '#2a1e10' }}>
                <ReactMarkdown>{body}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* ── Section 3: Media (§18.3) ── */}
        <div
          className="sidebar-card"
          style={{ padding: '16px 18px', borderRadius: 12 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span className="eyebrow">Media</span>
            <span className="font-body" style={{ fontSize: 8, fontStyle: 'italic', color: 'var(--color-text-tertiary)' }}>photos, video, audio</span>
          </div>

          {/* Uploaded files grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem', marginBottom: 8 }}>
            {files.map((file, index) => (
              <div
                key={index}
                style={{
                  aspectRatio: '4/3', borderRadius: 6,
                  border: '1.5px solid var(--color-border)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  background: 'var(--color-bg-surface-alt)',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {/* Main badge on first file */}
                {index === 0 && (
                  <span style={{
                    position: 'absolute', top: 4, left: 4,
                    background: color, color: 'white',
                    fontSize: 7, textTransform: 'uppercase',
                    padding: '1px 5px', borderRadius: 2,
                    fontFamily: "'Courier Prime', monospace",
                  }}>
                    Main
                  </span>
                )}
                <span className="font-body truncate" style={{ fontSize: 8, color: 'var(--color-text-tertiary)', padding: '0 6px', maxWidth: '100%' }}>
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="eyebrow"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-tertiary)', marginTop: 2,
                  }}
                >
                  remove
                </button>
              </div>
            ))}

            {/* Upload zone */}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                aspectRatio: '4/3', borderRadius: 6,
                border: '2px dashed var(--color-border-strong)',
                background: 'transparent', cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 4,
                transition: 'border-color 120ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = color }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '' }}
            >
              <span style={{ fontSize: 18, color: 'var(--color-text-tertiary)' }}>+</span>
              <span className="eyebrow" style={{ fontSize: 7 }}>Add files</span>
            </button>
          </div>

          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <span className="eyebrow">Images, video, audio · max 50mb per file</span>
        </div>

        {/* ── Error ── */}
        {error && (
          <p className="font-body" style={{ fontSize: 10, color: '#dc2626' }}>{error}</p>
        )}

        {/* ── Submit Row (§18.4) ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: color, color: 'white',
              fontFamily: "'Courier Prime', monospace",
              fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.15em', padding: '10px 24px',
              border: 'none', cursor: saving ? 'wait' : 'pointer',
              position: 'relative', opacity: saving ? 0.6 : 1,
            }}
          >
            <span style={{ position: 'absolute', inset: 3, border: '1px dashed rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
            {saving ? 'Publishing...' : 'Publish proof'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-outline"
            style={{ fontSize: 10, padding: '8px 16px' }}
          >
            Cancel
          </button>
          <span className="font-body" style={{ fontSize: 8, color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>
            Once published, others can vote on your proof. You can edit it after publishing.
          </span>
        </div>
      </form>

      {/* ── Tips Panel (§18.5) ── */}
      <div className="sidebar-card mt-6" style={{ padding: '14px 16px' }}>
        <p className="eyebrow mb-2">What makes a good proof post</p>
        <ul className="font-body" style={{ fontSize: 9, color: '#4a3f30', lineHeight: 1.6, paddingLeft: 14, listStyleType: 'disc' }}>
          <li>Write in first person. We want to feel like we were there.</li>
          <li>Specificity beats spectacle. A real moment with one pigeon beats a zoo photo.</li>
          <li>Photos and video help, but they don't replace the writing.</li>
          <li>Tell us what changed. Did something unexpected happen?</li>
          <li>Voters reward weirdness, honesty, and genuine effort over polish.</li>
        </ul>
      </div>
    </div>
  )
}

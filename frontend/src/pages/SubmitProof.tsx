import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { createPraxis, uploadMedia } from '../api/praxis'
import { createCollaboration, inviteMember } from '../api/collaborations'
import { getTask, dropTask, type TaskOut } from '../api/tasks'
import { listCharacters, type CharacterOut } from '../api/characters'
import LevelPill from '../components/ui/LevelPill'
import { useAuth } from '../auth/AuthContext'
import { useTheme } from '../hooks/useTheme'
import { factionColor, factionName } from '../utils/factions'

const RAINBOW_COLORS = ['#fbbf24', '#be185d', '#4f46e5', '#0e7490', '#16a34a', '#f97316', '#fbbf24', '#be185d']

type CollabMode = 'solo' | 'collab' | 'duel'

interface InvitedPartner {
  id: number
  name: string
  faction_slug: string | null
}

interface LocationState {
  mode?: string
  partners?: InvitedPartner[]
}

export default function SubmitProof() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, refetch } = useAuth()
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [task, setTask] = useState<TaskOut | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Collab/duel state — initialize from location state if navigated from TaskDetail
  const locationState = location.state as LocationState | null
  const [selectedMode, setSelectedMode] = useState<CollabMode>(
    (locationState?.mode as CollabMode) ?? 'solo'
  )
  const [invitedPartners, setInvitedPartners] = useState<InvitedPartner[]>(
    locationState?.partners ?? []
  )
  const [inviteQuery, setInviteQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CharacterOut[]>([])
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    if (id) getTask(parseInt(id, 10)).then(setTask).catch(() => {})
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    setSaving(true)
    setError('')
    try {
      if (selectedMode !== 'solo') {
        // Collaboration or duel: create a Collaboration, send invites, redirect to collab page
        const mode = selectedMode === 'duel' ? 'duel' : 'collaboration'
        const collab = await createCollaboration(parseInt(id, 10), mode)
        // Send invites to all selected partners
        for (const partner of invitedPartners) {
          try {
            await inviteMember(collab.id, partner.id)
          } catch { /* best-effort */ }
        }
        void refetch()
        navigate(`/collaborations/${collab.id}`)
      } else {
        // Solo submission: create praxis as before
        if (!title.trim()) { setError('Title is required.'); setSaving(false); return }
        const praxis = await createPraxis({
          task_id: parseInt(id, 10),
          title,
          body_text: body || undefined,
        })
        for (const file of files) {
          await uploadMedia(praxis.id, file)
        }
        void refetch()
        navigate(`/praxes/${praxis.id}`)
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Could not submit. Check you are signed up for this task.')
    } finally {
      setSaving(false)
    }
  }

  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const incoming = Array.from(e.target.files)
    const tooLarge = incoming.filter((f) => f.size > MAX_FILE_SIZE)
    if (tooLarge.length > 0) {
      setError(`File${tooLarge.length > 1 ? 's' : ''} too large (50 MB limit): ${tooLarge.map((f) => f.name).join(', ')}`)
    }
    const valid = incoming.filter((f) => f.size <= MAX_FILE_SIZE)
    if (valid.length > 0) setFiles((prev) => [...prev, ...valid])
    e.target.value = ''
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // Partner search
  const handleInviteSearch = useCallback(async (query: string) => {
    setInviteQuery(query)
    if (query.length < 2) { setSearchResults([]); setShowSearch(false); return }
    try {
      const results = await listCharacters({ search: query, limit: 8 })
      const filtered = results.filter((c) =>
        c.id !== user?.character?.id && !invitedPartners.some((p) => p.id === c.id)
      )
      setSearchResults(filtered)
      setShowSearch(filtered.length > 0)
    } catch {
      setSearchResults([])
    }
  }, [user, invitedPartners])

  const addPartner = (character: CharacterOut) => {
    if (selectedMode === 'duel' && invitedPartners.length >= 1) return
    setInvitedPartners((prev) => [...prev, { id: character.id, name: character.display_name, faction_slug: character.faction_slug }])
    setInviteQuery('')
    setShowSearch(false)
    setSearchResults([])
  }

  const removePartner = (characterId: number) => {
    setInvitedPartners((prev) => prev.filter((p) => p.id !== characterId))
  }

  const handleDrop = async () => {
    if (!task || !window.confirm('Drop this task? You can sign up again later.')) return
    try {
      await dropTask(task.id)
      navigate(`/tasks/${task.id}`)
    } catch {
      setError('Could not drop this task.')
    }
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
            {selectedMode !== 'solo' && (
              <span
                style={{
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 8, fontWeight: 700, textTransform: 'uppercase',
                  padding: '2px 8px', borderRadius: 3,
                  background: selectedMode === 'duel' ? '#dc2626' : '#15803d',
                  color: '#fff',
                }}
              >
                {selectedMode === 'duel' ? 'Duel' : 'Collab'}
                {invitedPartners.length > 0 && ` with ${invitedPartners[0].name}`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Mode Selector + Invite ── */}
      <div className="sidebar-card mb-5" style={{ padding: '16px 18px', borderRadius: 12 }}>
        <p className="eyebrow mb-3">How do you want to do this?</p>

        {/* Mode cards */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {([
            { mode: 'solo' as CollabMode, icon: '◎', label: 'Solo', desc: 'Just you. All points are yours.' },
            { mode: 'collab' as CollabMode, icon: '⬡', label: 'Collaboration', desc: 'Invite others. Everyone earns full points.' },
            { mode: 'duel' as CollabMode, icon: '⚔', label: 'Duel', desc: 'Challenge one player. Winner takes the points.' },
          ]).map(({ mode, icon, label, desc }) => {
            const active = selectedMode === mode
            return (
              <button
                key={mode}
                type="button"
                onClick={() => { setSelectedMode(mode); if (mode === 'solo') setInvitedPartners([]) }}
                style={{
                  flex: 1,
                  position: 'relative',
                  border: `2.5px solid ${active ? (dark ? '#f0e6d0' : '#1a1209') : 'var(--color-border)'}`,
                  borderRadius: 0,
                  background: active ? (dark ? '#f0e6d0' : '#1a1209') : 'var(--color-bg-surface-alt)',
                  color: active ? (dark ? '#13121a' : '#F7F4EE') : 'var(--color-text-primary)',
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.08em', padding: '10px 8px',
                  cursor: 'pointer', textAlign: 'center',
                }}
              >
                {active && <span style={{ position: 'absolute', inset: 2, border: '1px dashed rgba(255,255,255,0.2)', pointerEvents: 'none' }} />}
                <span style={{ display: 'block', fontSize: 18, marginBottom: 4 }}>{icon}</span>
                <span style={{ display: 'block', marginBottom: 2 }}>{label}</span>
                <span style={{ display: 'block', fontSize: 7, fontWeight: 400, opacity: 0.7, textTransform: 'none', letterSpacing: '0.02em' }}>{desc}</span>
              </button>
            )
          })}
        </div>

        {/* Invite input (shown for collab/duel) */}
        {selectedMode !== 'solo' && (
          <div>
            <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Invite</span>
            <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
              <input
                type="text"
                value={inviteQuery}
                onChange={(e) => handleInviteSearch(e.target.value)}
                placeholder="player name or @handle"
                style={{
                  flex: 1,
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 12, padding: '8px 12px',
                  background: dark ? '#1a1209' : '#F7F4EE',
                  color: 'var(--color-text-primary)',
                  border: '2px solid var(--color-border)',
                  outline: 'none',
                }}
                onFocus={() => { if (searchResults.length > 0) setShowSearch(true) }}
                onBlur={() => setTimeout(() => setShowSearch(false), 200)}
              />
              <button
                type="button"
                disabled={!inviteQuery.trim()}
                onClick={() => {
                  if (searchResults.length > 0) {
                    addPartner(searchResults[0])
                  } else {
                    handleInviteSearch(inviteQuery)
                  }
                }}
                style={{
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                  padding: '8px 14px',
                  background: 'var(--color-bg-surface-alt)',
                  border: '2px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                }}
              >
                + Add
              </button>

              {/* Search dropdown */}
              {showSearch && (
                <div
                  style={{
                    position: 'absolute', top: '100%', left: 0, right: 60, zIndex: 10,
                    background: 'var(--color-bg-surface)',
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    maxHeight: 200, overflowY: 'auto',
                  }}
                >
                  {searchResults.map((character) => (
                    <button
                      key={character.id}
                      type="button"
                      onMouseDown={() => addPartner(character)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '8px 12px',
                        background: 'transparent', border: 'none',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div
                        style={{
                          width: 20, height: 20, borderRadius: '50%',
                          background: `linear-gradient(135deg, ${factionColor(character.faction_slug)}, ${factionColor(character.faction_slug)}88)`,
                          flexShrink: 0,
                        }}
                      />
                      <span className="font-body" style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {character.display_name}
                      </span>
                      <span className="eyebrow" style={{ marginLeft: 'auto' }}>
                        {factionName(character.faction_slug)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Invited chips */}
            {invitedPartners.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="eyebrow">Invited:</span>
                {invitedPartners.map((partner) => (
                  <span
                    key={partner.id}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: 'var(--color-bg-surface-alt)',
                      border: '1px solid var(--color-border)',
                      padding: '2px 8px',
                      fontFamily: "'Courier Prime', monospace",
                      fontSize: 9,
                    }}
                  >
                    <span style={{ width: 6, height: 6, background: factionColor(partner.faction_slug), display: 'inline-block' }} />
                    {partner.name}
                    <button
                      type="button"
                      onClick={() => removePartner(partner.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)', fontSize: 10, padding: 0 }}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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
            maxLength={200}
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
          <span className={`eyebrow self-end ${title.length >= 180 ? 'text-red-600' : ''}`} style={{ fontSize: 7, marginTop: 4 }}>{title.length}/200</span>
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
            {saving
              ? (selectedMode !== 'solo' ? 'Creating...' : 'Publishing...')
              : (selectedMode === 'duel' ? 'Start duel' : selectedMode === 'collab' ? 'Start collaboration' : 'Publish proof')
            }
          </button>
          <button
            type="button"
            onClick={handleDrop}
            className="btn-outline"
            style={{ fontSize: 10, padding: '8px 16px' }}
          >
            Drop task
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

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { proposeTask } from '../api/tasks'
import { getFactions, type FactionOut } from '../api/factions'
import PageTitle from '../components/ui/PageTitle'
import FilterLevelNodes from '../components/ui/FilterLevelNodes'
import { useAuth } from '../auth/AuthContext'
import { useTheme } from '../hooks/useTheme'
import { factionColor, factionName, FACTIONS } from '../utils/factions'
import { extractError } from '../utils/errors'

const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5]

const FACTION_DESCRIPTORS: Record<string, string> = {
  ua: 'Unaffiliated', gestalt: 'Collective', analog: 'Document',
  snide: 'Mischief', journeymen: 'Explore', singularity: 'Discover', ua_masters: 'Chronicle',
}

export default function ProposeTask() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [factions, setFactions] = useState<FactionOut[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pointValue, setPointValue] = useState<string>('10')
  const [levelRequired, setLevelRequired] = useState<number | ''>(0)
  const [factionSlug, setFactionSlug] = useState('ua')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    getFactions().then(setFactions).catch(() => {})
  }, [])

  const characterLevel = user?.character?.level ?? 0
  const color = factionColor(factionSlug)
  const fname = factionName(factionSlug)

  if (!user) {
    return (
      <div className="py-8" style={{ maxWidth: 720, margin: '0 auto' }}>
        <PageTitle title="Propose a Task" />
        <p className="font-body text-muted">You need to be logged in to propose a task.</p>
      </div>
    )
  }

  if (characterLevel < 3) {
    return (
      <div className="py-8" style={{ maxWidth: 720, margin: '0 auto' }}>
        <PageTitle title="Propose a Task" />
        <p className="font-body" style={{ color: 'var(--color-text-secondary)' }}>
          You must be level 3 or higher to propose tasks. You are currently level {characterLevel}.
        </p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="py-8" style={{ maxWidth: 720, margin: '0 auto' }}>
        <PageTitle title="Propose a Task" />
        <div className="sidebar-card" style={{ padding: 24, textAlign: 'center' }}>
          <p className="font-display italic" style={{ fontSize: 22, color, marginBottom: 6 }}>Task proposed!</p>
          <p className="font-body" style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>An admin will review it soon.</p>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await proposeTask({
        title,
        description: description || undefined,
        point_value: parseInt(pointValue) || 10,
        level_required: levelRequired === '' ? 0 : levelRequired,
        primary_faction_slug: factionSlug || undefined,
      })
      setSuccess(true)
    } catch (err) {
      setError(extractError(err, 'Could not propose task.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="py-8">
      {/* Breadcrumb */}
      <nav className="font-body mb-4" style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--color-text-tertiary)' }}>
        <Link to="/tasks" style={{ color: 'inherit', textDecoration: 'none' }}>Tasks</Link>
        {' › '}
        <span style={{ color: 'var(--color-text-primary)' }}>Propose a Task</span>
      </nav>

      <PageTitle title="Propose a Task" />

      {/* Two-column: form left, tips right (§20.1) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
        {/* ── Left: Form ── */}
        <div>
          {/* Faction Selector (§20.2) */}
          <div style={{ marginBottom: 16 }}>
            <span className="eyebrow" style={{ display: 'block', marginBottom: 8 }}>Choose a faction for this task</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(factions.length > 0 ? factions : Object.values(FACTIONS)).map((f) => {
                const slug = 'slug' in f ? f.slug : (f as { slug: string }).slug
                const active = factionSlug === slug
                const fc = factionColor(slug)
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => setFactionSlug(slug)}
                    style={{
                      border: `2px solid ${active ? fc : 'var(--color-border)'}`,
                      background: active ? `${fc}15` : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.55)'),
                      borderRadius: 6, padding: '8px 14px',
                      cursor: 'pointer', textAlign: 'center',
                      transition: 'all 120ms',
                      transform: active ? 'translateY(-2px)' : 'none',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)',
                        background: fc, color: 'white',
                        fontFamily: "'Courier Prime', monospace",
                        fontSize: 8, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.07em', padding: '2px 10px',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        marginBottom: 4,
                      }}
                    >
                      {factionName(slug)}
                    </span>
                    <span className="eyebrow" style={{ fontSize: 7 }}>
                      {FACTION_DESCRIPTORS[slug] ?? ''}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Form inside faction-framed card (§20.3) */}
          <form onSubmit={handleSubmit}>
            <div
              className="sidebar-card"
              style={{ borderLeft: `4px solid ${color}`, padding: '18px 20px', marginBottom: 16 }}
            >
              {/* Task Name (§20.4) */}
              <div style={{ marginBottom: 16 }}>
                <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Task name</span>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={submitting}
                  placeholder="What do you want people to do?"
                  style={{
                    width: '100%',
                    fontFamily: "'Courier Prime', monospace", fontSize: 22, fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    background: 'transparent', border: 'none',
                    borderBottom: `2px solid ${title ? color : (dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)')}`,
                    outline: 'none', paddingBottom: 6,
                    transition: 'border-color 150ms',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = color }}
                  onBlur={(e) => { if (!title) e.currentTarget.style.borderBottomColor = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }}
                />
              </div>

              {/* Description (§20.4) */}
              <div style={{ marginBottom: 16 }}>
                <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Description</span>
                <textarea
                  rows={6}
                  maxLength={5000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitting}
                  placeholder="Write the task description here. What exactly should the player do? What counts as completing it?"
                  style={{
                    width: '100%',
                    fontFamily: "'Courier Prime', monospace", fontSize: 13, lineHeight: 1.7,
                    color: 'var(--color-text-primary)',
                    background: 'transparent', border: 'none', outline: 'none',
                    resize: 'vertical', minHeight: 120,
                  }}
                />
              </div>

              {/* Suggested Difficulty (§20.4) */}
              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Base points</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pointValue}
                    onChange={(e) => setPointValue(e.target.value.replace(/[^0-9]/g, ''))}
                    disabled={submitting}
                    placeholder="pts"
                    style={{
                      width: 80,
                      fontFamily: "'Courier Prime', monospace", fontSize: 20, fontWeight: 700,
                      color: 'var(--color-text-primary)',
                      background: 'transparent', border: 'none',
                      borderBottom: `2px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                      outline: 'none', textAlign: 'center',
                    }}
                  />
                  <span className="eyebrow" style={{ display: 'block', marginTop: 4, fontSize: 7 }}>Admin may adjust</span>
                </div>
                <div>
                  <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Minimum level</span>
                  <FilterLevelNodes
                    levels={LEVEL_OPTIONS}
                    value={levelRequired}
                    onChange={setLevelRequired}
                  />
                  <span className="eyebrow" style={{ display: 'block', marginTop: 4, fontSize: 7 }}>Level 0 = anyone can attempt</span>
                </div>
              </div>
            </div>

            {/* Notes to Admin (§20.5) */}
            <div style={{ marginBottom: 16 }}>
              <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Notes to admin (optional)</span>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                placeholder="Why do you want this task to exist? What inspired it?"
                style={{
                  width: '100%',
                  fontFamily: "'Courier Prime', monospace", fontSize: 11,
                  color: 'var(--color-text-primary)',
                  background: 'transparent',
                  border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: 6, padding: '0.6rem 0.7rem',
                  outline: 'none', resize: 'vertical',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = color }}
                onBlur={(e) => { e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
              />
            </div>

            {/* Task Preview Strip (§20.6) */}
            {title && (
              <div
                style={{
                  background: `${color}10`, border: `1.5px solid ${color}30`,
                  borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                }}
              >
                <span className="eyebrow" style={{ color, marginBottom: 4, display: 'block' }}>
                  Task preview — {fname} · Pending
                </span>
                <p className="font-body" style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>
                  {title}
                </p>
                {description && (
                  <p className="font-body" style={{ fontSize: 9, color: 'var(--color-text-secondary)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {description}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <span className="eyebrow">{pointValue || '?'} pts</span>
                  <span className="eyebrow">lvl {levelRequired === '' ? 0 : levelRequired}+</span>
                  <span className="eyebrow" style={{ color }}>Pending review</span>
                </div>
              </div>
            )}

            {error && (
              <p className="font-body" style={{ fontSize: 10, color: '#dc2626', marginBottom: 12 }}>{error}</p>
            )}

            {/* Submit Row (§20.7) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: color, color: 'white',
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.15em', padding: '10px 24px',
                  border: 'none', cursor: submitting ? 'wait' : 'pointer',
                  position: 'relative', opacity: submitting ? 0.6 : 1,
                }}
              >
                <span style={{ position: 'absolute', inset: 3, border: '1px dashed rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                {submitting ? 'Submitting...' : 'Submit proposal'}
              </button>
              <button type="button" onClick={() => navigate(-1)} className="btn-outline" style={{ fontSize: 10, padding: '8px 16px' }}>
                Cancel
              </button>
              <span className="font-body" style={{ fontSize: 8, color: 'var(--color-text-tertiary)', marginLeft: 'auto' }}>
                Your proposal goes to admin for review.
              </span>
            </div>
          </form>
        </div>

        {/* ── Right: Tips Column (§20.8) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="sidebar-card" style={{ padding: '14px 16px' }}>
            <p className="eyebrow mb-2">What makes a good task</p>
            <ul className="font-body" style={{ fontSize: 9, color: '#4a3f30', lineHeight: 1.6, paddingLeft: 14, listStyleType: 'disc' }}>
              <li>It should be doable by someone with no money and no special skills.</li>
              <li>The proof post should be interesting to read even if you didn't do the task.</li>
              <li>It should have a clear pass/fail.</li>
              <li>It should feel like it belongs to its faction.</li>
              <li>If anyone could do it anywhere, it's probably right.</li>
            </ul>
          </div>

          <div className="sidebar-card" style={{ padding: '14px 16px' }}>
            <p className="eyebrow mb-2">What happens next</p>
            <p className="font-body" style={{ fontSize: 9, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Your proposal goes to admin review. If approved, it enters the pending task list.
              Admins typically review proposals within 1-2 weeks.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

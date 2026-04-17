import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { proposeTask } from '../api/tasks'
import { proposeMetatask } from '../api/metaTasks'
import { getFactions, type FactionOut } from '../api/factions'
import PageTitle from '../components/ui/PageTitle'
import FilterLevelNodes from '../components/ui/FilterLevelNodes'
import { useAuth } from '../auth/AuthContext'
import { factionCssVar, factionName, getAllFactions } from '../utils/factions'
import { extractError } from '../utils/errors'

const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8]

const FACTION_DESCRIPTORS: Record<string, string> = {
  ua: 'Unaffiliated', gestalt: 'Collective', analog: 'Document',
  snide: 'Mischief', journeymen: 'Explore', singularity: 'Discover', ua_masters: 'Chronicle',
}

export default function ProposeTask() {
  const { user } = useAuth()
  const navigate = useNavigate()
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
  const [isMetaTask, setIsMetaTask] = useState(false)
  const [metaBonusValue, setMetaBonusValue] = useState('10')

  useEffect(() => {
    getFactions().then(setFactions).catch(() => {})
  }, [])

  const characterLevel = user?.character?.level ?? 0
  const color = factionCssVar(factionSlug)
  const fname = factionName(factionSlug)

  if (!user) {
    return (
      <div className="py-8" style={{ maxWidth: 720, margin: '0 auto' }}>
        <PageTitle title="Propose a Task" />
        <p className="font-body text-muted">You need to be logged in to propose a task.</p>
      </div>
    )
  }

  if (!user?.is_admin && characterLevel < 3) {
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
          {isMetaTask ? (
            <>
              <p className="font-display italic" style={{ fontSize: 22, color, marginBottom: 6 }}>Meta task proposed!</p>
              <p className="font-body" style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>
                An admin will review it. Once activated, {factionName(factionSlug)} players can apply it to their praxes for a points bonus.
              </p>
            </>
          ) : (
            <>
              <p className="font-display italic" style={{ fontSize: 22, color, marginBottom: 6 }}>Task proposed!</p>
              <p className="font-body" style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>An admin will review it soon.</p>
            </>
          )}
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (title.length > 200) { setError('Task name must be 200 characters or fewer.'); return }
    if (description.length > 5000) { setError('Description must be 5000 characters or fewer.'); return }
    // Metatask proposals require level 6 (admin bypass). Standard proposals
    // only require the page-level gate of 3. Check here so the error surfaces
    // inline before hitting the wire.
    if (isMetaTask && !user?.is_admin && characterLevel < 6) {
      setError(`Meta tasks require level 6 or higher. You are level ${characterLevel}.`)
      return
    }
    if (isMetaTask && (!factionSlug || factionSlug === 'na' || factionSlug === 'ua')) {
      setError('Meta tasks must belong to a specific faction.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      if (isMetaTask) {
        await proposeMetatask({
          title,
          description,
          metatask_faction_slug: factionSlug,
          point_value: parseInt(metaBonusValue) || 10,
          level_required: levelRequired === '' ? 0 : levelRequired,
        })
      } else {
        await proposeTask({
          title,
          description: description || undefined,
          point_value: parseInt(pointValue) || 10,
          level_required: levelRequired === '' ? 0 : levelRequired,
          primary_faction_slug: factionSlug || undefined,
        })
      }
      setSuccess(true)
    } catch (err) {
      setError(extractError(err, isMetaTask ? 'Could not create meta task.' : 'Could not propose task.'))
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
              {(factions.length > 0 ? factions : getAllFactions()).map((f) => {
                const slug = 'slug' in f ? f.slug : (f as { slug: string }).slug
                const active = factionSlug === slug
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => setFactionSlug(slug)}
                    style={{
                      border: `2px solid ${active ? factionCssVar(slug, 'border') : 'var(--color-border)'}`,
                      background: active ? factionCssVar(slug, 'light') : 'var(--color-bg-surface)',
                      borderRadius: 6, padding: '8px 14px',
                      cursor: 'pointer', textAlign: 'center',
                      transition: 'all 120ms',
                      transform: active ? 'translateY(-2px)' : 'none',
                    }}
                  >
                    <span
                      className="pennant-shape"
                      style={{
                        display: 'block',
                        background: factionCssVar(slug), color: 'white',
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
                    borderBottom: `2px solid ${title ? color : 'var(--color-border-strong)'}`,
                    outline: 'none', paddingBottom: 6,
                    transition: 'border-color 150ms',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = color }}
                  onBlur={(e) => { if (!title) e.currentTarget.style.borderBottomColor = 'var(--color-border-strong)' }}
                />
                <span className={`eyebrow self-end ${title.length >= 180 ? 'text-red-600' : ''}`} style={{ fontSize: 7, marginTop: 4 }}>{title.length}/200</span>
                {title.length >= 200 && (
                  <span className="font-body" style={{ fontSize: 10, color: '#dc2626', display: 'block', marginTop: 2 }}>Task name must be 200 characters or fewer.</span>
                )}
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
                <span className={`eyebrow self-end ${description.length >= 4500 ? 'text-red-600' : ''}`} style={{ fontSize: 7, marginTop: 4 }}>{description.length}/5000</span>
                {description.length >= 5000 && (
                  <span className="font-body" style={{ fontSize: 10, color: '#dc2626', display: 'block', marginTop: 2 }}>Description must be 5000 characters or fewer.</span>
                )}
              </div>

              {/* Suggested Difficulty (§20.4) */}
              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 12 }}>
                {!isMetaTask && (
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
                        borderBottom: '2px solid var(--color-border-strong)',
                        outline: 'none', textAlign: 'center',
                      }}
                    />
                    <span className="eyebrow" style={{ display: 'block', marginTop: 4, fontSize: 7 }}>Admin may adjust</span>
                  </div>
                )}
                {isMetaTask && (
                  <div>
                    <span className="eyebrow" style={{ display: 'block', marginBottom: 6 }}>Bonus points</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={metaBonusValue}
                      onChange={(e) => setMetaBonusValue(e.target.value.replace(/[^0-9]/g, ''))}
                      disabled={submitting}
                      placeholder="pts"
                      style={{
                        width: 80,
                        fontFamily: "'Courier Prime', monospace", fontSize: 20, fontWeight: 700,
                        color: 'var(--color-text-primary)',
                        background: 'transparent', border: 'none',
                        borderBottom: `2px solid ${color}`,
                        outline: 'none', textAlign: 'center',
                      }}
                    />
                    <span className="eyebrow" style={{ display: 'block', marginTop: 4, fontSize: 7 }}>Flat bonus added to score</span>
                  </div>
                )}
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

              {/* Meta Task Toggle — level 6+ or admin only */}
              {(characterLevel >= 6 || user?.is_admin) && (
                <div style={{
                  borderTop: '1px dashed var(--color-border)',
                  paddingTop: 12, marginTop: 4,
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isMetaTask}
                      onChange={(e) => setIsMetaTask(e.target.checked)}
                      style={{ accentColor: color, width: 14, height: 14, cursor: 'pointer' }}
                    />
                    <span className="font-body" style={{ fontSize: 11, color: 'var(--color-text-primary)', fontWeight: isMetaTask ? 700 : 400 }}>
                      Create as meta task
                    </span>
                    <span className="eyebrow" style={{ fontSize: 7, color: 'var(--color-text-tertiary)' }}>
                      applies as a bonus to all {factionSlug !== 'na' ? factionName(factionSlug) : ''} submissions
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Notes to Admin (§20.5) — hidden for meta tasks */}
            {!isMetaTask && (
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
                    border: '1px solid var(--color-border)',
                    borderRadius: 6, padding: '0.6rem 0.7rem',
                    outline: 'none', resize: 'vertical',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = color }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
                />
              </div>
            )}

            {/* Task / Meta Task Preview Strip (§20.6) */}
            {title && (
              <div
                style={{
                  background: factionCssVar(factionSlug, 'light'), border: `1.5px solid ${factionCssVar(factionSlug, 'border')}`,
                  borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                }}
              >
                <span className="eyebrow" style={{ color, marginBottom: 4, display: 'block' }}>
                  {isMetaTask ? `Meta task preview — ${fname}` : `Task preview — ${fname} · Pending`}
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
                  {isMetaTask
                    ? <span className="eyebrow" style={{ color: 'var(--color-success)' }}>+{metaBonusValue || '?'} bonus pts</span>
                    : <span className="eyebrow">{pointValue || '?'} pts</span>
                  }
                  <span className="eyebrow">lvl {levelRequired === '' ? 0 : levelRequired}+</span>
                  {!isMetaTask && <span className="eyebrow" style={{ color }}>Pending review</span>}
                </div>
              </div>
            )}

            {error && (
              <p className="font-body" style={{ fontSize: 10, color: 'var(--color-danger)', marginBottom: 12 }}>{error}</p>
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
                {submitting ? 'Submitting...' : isMetaTask ? 'Propose meta task' : 'Submit proposal'}
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
            <ul className="font-body" style={{ fontSize: 9, color: 'var(--color-text-primary)', lineHeight: 1.6, paddingLeft: 14, listStyleType: 'disc' }}>
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

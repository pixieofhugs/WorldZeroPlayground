import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { proposeTask } from '../api/tasks'
import { getFactions, type FactionOut } from '../api/factions'
import { useAuth } from '../auth/AuthContext'
import { extractError } from '../utils/errors'

const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5]

export default function ProposeTask() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [factions, setFactions] = useState<FactionOut[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pointValue, setPointValue] = useState(10)
  const [levelRequired, setLevelRequired] = useState(0)
  const [factionSlug, setFactionSlug] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    getFactions().then(setFactions).catch(() => {})
  }, [])

  const characterLevel = user?.character?.level ?? 0

  if (!user) {
    return (
      <div className="py-8 max-w-2xl">
        <h1 className="page-heading">Propose a Task</h1>
        <p className="font-body text-muted">You need to be logged in to propose a task.</p>
      </div>
    )
  }

  if (characterLevel < 3) {
    return (
      <div className="py-8 max-w-2xl">
        <h1 className="page-heading">Propose a Task</h1>
        <p className="font-body text-muted">
          You must be level 3 or higher to propose tasks. You are currently level {characterLevel}.
        </p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="py-8 max-w-2xl">
        <h1 className="page-heading">Propose a Task</h1>
        <div className="card p-6 text-center">
          <p className="font-display text-2xl font-bold mb-2">Task proposed!</p>
          <p className="font-body text-muted">An admin will review it soon.</p>
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
        point_value: pointValue,
        level_required: levelRequired,
        primary_faction_slug: factionSlug || undefined,
      })
      setSuccess(true)
    } catch (err) {
      setError(extractError(err, 'Could not propose task.'))
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'w-full border-2 border-border bg-card font-body text-sm px-3 py-2 focus:outline-none focus:shadow-sketch-sm disabled:opacity-50'

  return (
    <div className="py-8 max-w-2xl">
      <h1 className="page-heading">Propose a Task</h1>
      <p className="font-body text-muted mb-6">
        Suggest a new task for the community. An admin will review and approve it.
      </p>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="font-body text-sm block mb-1" htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
            className={inputClass}
          />
        </div>

        <div>
          <label className="font-body text-sm block mb-1" htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={4}
            maxLength={5000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            className={`${inputClass} resize-y`}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-body text-sm block mb-1" htmlFor="pointValue">Suggested Points</label>
            <input
              id="pointValue"
              type="number"
              min={1}
              max={1000}
              required
              value={pointValue}
              onChange={(e) => setPointValue(Number(e.target.value))}
              disabled={submitting}
              className={inputClass}
            />
          </div>

          <div>
            <label className="font-body text-sm block mb-1" htmlFor="levelRequired">Level Required</label>
            <select
              id="levelRequired"
              value={levelRequired}
              onChange={(e) => setLevelRequired(Number(e.target.value))}
              disabled={submitting}
              className={inputClass}
            >
              {LEVEL_OPTIONS.map((l) => (
                <option key={l} value={l}>Level {l}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="font-body text-sm block mb-1" htmlFor="faction">Faction (optional)</label>
          <select
            id="faction"
            value={factionSlug}
            onChange={(e) => setFactionSlug(e.target.value)}
            disabled={submitting}
            className={inputClass}
          >
            <option value="">Any faction</option>
            {factions.map((f) => (
              <option key={f.slug} value={f.slug}>{f.name}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">{error}</p>
        )}

        <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
          {submitting ? 'Submitting…' : 'Propose Task'}
        </button>
      </form>
    </div>
  )
}

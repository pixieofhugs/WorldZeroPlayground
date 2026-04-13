import { useEffect, useState } from 'react'
import { getPendingTasks, approveTask, retireTask, getFlaggedSubmissions, deleteSubmission, getMessages } from '../api/admin'
import type { PendingTaskOut, ContactMessageOut } from '../api/admin'
import { getFactions, updateFaction } from '../api/factions'
import type { FactionOut } from '../api/factions'
import type { SubmissionOut } from '../api/submissions'
import { formatTimestamp } from '../utils/dates'
import { extractError } from '../utils/errors'
import PageTitle from '../components/ui/PageTitle'

export default function Admin() {
  const [pending, setPending] = useState<PendingTaskOut[]>([])
  const [flagged, setFlagged] = useState<SubmissionOut[]>([])
  const [factions, setFactions] = useState<FactionOut[]>([])
  const [messages, setMessages] = useState<ContactMessageOut[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

  // Faction inline edit state: slug → { name, description } | null (null = not editing)
  const [factionEdits, setFactionEdits] = useState<Record<string, { name: string; description: string } | null>>({})
  const [factionSaving, setFactionSaving] = useState<string | null>(null)
  const [factionError, setFactionError] = useState<string | null>(null)

  const refresh = () => {
    setFetchError(null)
    Promise.all([getPendingTasks(), getFlaggedSubmissions(), getFactions(), getMessages()])
      .then(([p, f, fa, m]) => { setPending(p); setFlagged(f); setFactions(fa); setMessages(m) })
      .catch((err) => setFetchError(extractError(err, "Couldn't load admin data.")))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const handleApprove = async (id: number) => {
    setActionError(null)
    try {
      await approveTask(id)
      refresh()
    } catch (err) {
      setActionError(extractError(err, 'Could not approve this task.'))
    }
  }

  const handleRetire = async (id: number) => {
    setActionError(null)
    try {
      await retireTask(id)
      refresh()
    } catch (err) {
      setActionError(extractError(err, 'Could not retire this task.'))
    }
  }

  const handleDelete = async (id: number) => {
    setActionError(null)
    try {
      await deleteSubmission(id)
      setDeleteTarget(null)
      refresh()
    } catch (err) {
      setDeleteTarget(null)
      setActionError(extractError(err, 'Could not delete this submission.'))
    }
  }

  const startEditFaction = (f: FactionOut) => {
    setFactionEdits((prev) => ({
      ...prev,
      [f.slug]: { name: f.name, description: f.description ?? '' },
    }))
    setFactionError(null)
  }

  const cancelEditFaction = (slug: string) => {
    setFactionEdits((prev) => ({ ...prev, [slug]: null }))
  }

  const saveFaction = async (slug: string) => {
    const edit = factionEdits[slug]
    if (!edit) return
    setFactionSaving(slug)
    setFactionError(null)
    try {
      const updated = await updateFaction(slug, {
        name: edit.name,
        description: edit.description || null,
      })
      setFactions((prev) => prev.map((f) => (f.slug === slug ? updated : f)))
      setFactionEdits((prev) => ({ ...prev, [slug]: null }))
    } catch (err) {
      setFactionError(extractError(err, 'Could not save faction.'))
    } finally {
      setFactionSaving(null)
    }
  }

  if (loading) return <div className="py-8 font-body text-muted">Loading...</div>

  return (
    <div className="py-8">
      <PageTitle title="Admin" />

      {fetchError && (
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2 mb-4">
          {fetchError}{' '}
          <button onClick={refresh} className="underline">Try again.</button>
        </p>
      )}

      {actionError && (
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2 mb-4">
          {actionError}
        </p>
      )}

      {/* Pending tasks */}
      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-3 border-b-2 border-border pb-1">
          Pending Tasks <span className="text-muted text-lg">({pending.length})</span>
        </h2>
        {pending.length === 0 ? (
          <p className="font-body text-sm text-muted">No pending tasks.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((t) => (
              <div key={t.id} className="card px-4 py-3 flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-display text-lg font-bold">{t.title}</p>
                  <p className="font-body text-xs text-muted">
                    {t.point_value} pts · lvl {t.level_required}+ · {t.primary_faction_slug ?? 'unaffiliated'}
                    {t.created_by_name && ` · by ${t.created_by_name}`}
                  </p>
                </div>
                <button onClick={() => void handleApprove(t.id)} className="btn-primary text-xs">approve</button>
                <button onClick={() => void handleRetire(t.id)} className="btn-outline text-xs">retire</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Factions */}
      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-3 border-b-2 border-border pb-1">
          Factions
        </h2>
        {factionError && (
          <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2 mb-3">{factionError}</p>
        )}
        <div className="flex flex-col gap-3">
          {factions.map((f) => {
            const edit = factionEdits[f.slug]
            const saving = factionSaving === f.slug
            return (
              <div key={f.slug} className="card px-4 py-3">
                {edit ? (
                  <div className="flex flex-col gap-2">
                    <input
                      className="border-2 border-border bg-card px-3 py-1 font-body text-sm focus:outline-none focus:border-ink"
                      value={edit.name}
                      onChange={(e) => setFactionEdits((prev) => ({ ...prev, [f.slug]: { ...edit, name: e.target.value } }))}
                      placeholder="Name"
                    />
                    <textarea
                      className="border-2 border-border bg-card px-3 py-1 font-body text-sm focus:outline-none focus:border-ink resize-none"
                      rows={3}
                      value={edit.description}
                      onChange={(e) => setFactionEdits((prev) => ({ ...prev, [f.slug]: { ...edit, description: e.target.value } }))}
                      placeholder="Description"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => void saveFaction(f.slug)}
                        disabled={saving}
                        className="btn-primary text-xs"
                      >
                        {saving ? 'saving...' : 'save'}
                      </button>
                      <button onClick={() => cancelEditFaction(f.slug)} className="btn-outline text-xs">cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <p className="font-display text-lg font-bold">{f.name}</p>
                      <p className="font-body text-xs text-muted">{f.slug}</p>
                      {f.description && (
                        <p className="font-body text-sm text-ink mt-1">{f.description}</p>
                      )}
                    </div>
                    <button onClick={() => startEditFaction(f)} className="btn-outline text-xs shrink-0">edit</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Flagged submissions */}
      <section className="mb-10">
        <h2 className="font-display text-2xl font-bold mb-3 border-b-2 border-border pb-1">
          Flagged Submissions <span className="text-muted text-lg">({flagged.length})</span>
        </h2>
        {flagged.length === 0 ? (
          <p className="font-body text-sm text-muted">No flagged submissions.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {flagged.map((s) => (
              <div key={s.id} className="card px-4 py-3 flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-display text-lg font-bold">{s.title}</p>
                  <p className="font-body text-xs text-muted">by {s.character_display_name || `#${s.character_id}`}</p>
                </div>
                {deleteTarget === s.id ? (
                  <div className="flex items-center gap-2 font-body text-xs">
                    <span className="text-muted">Sure?</span>
                    <button onClick={() => void handleDelete(s.id)} className="btn-primary text-xs bg-red-700 border-red-900">yes, delete</button>
                    <button onClick={() => setDeleteTarget(null)} className="btn-outline text-xs">cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteTarget(s.id)} className="btn-primary text-xs bg-red-700 border-red-900">
                    delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Contact Messages */}
      <section>
        <h2 className="font-display text-2xl font-bold mb-3 border-b-2 border-border pb-1">
          Messages <span className="text-muted text-lg">({messages.length})</span>
        </h2>
        {messages.length === 0 ? (
          <p className="font-body text-sm text-muted">No messages.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <div key={m.id} className="card px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-display text-lg font-bold">{m.name}</p>
                    <p className="font-body text-xs text-muted">{m.email} · {formatTimestamp(m.created_at)}</p>
                  </div>
                </div>
                <p className="font-body text-sm text-ink mt-2 whitespace-pre-wrap">{m.message}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

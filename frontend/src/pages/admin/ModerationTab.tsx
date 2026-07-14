/**
 * Moderation tab — the unified moderator review screen (#237).
 *
 * Flagged praxes and comments merge into ONE queue, newest first (both surface
 * on the first flag — era.comment_flag_review_threshold is 1). Each card badges
 * the top flag reason from the shared vocabulary (ADR-0031), links back to the
 * flagged content, and dispatches actions to the right endpoint per type:
 *   Praxis:  Keep (visible) · Remove (hidden) · Fail (failed + player note)
 *   Comment: Keep (visible) · Remove (deleted)
 * "Dismiss report" collapses into Keep — one control per identical outcome.
 * The action log is this-session client state only; nothing persists.
 */
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  getFlaggedPraxes,
  getFlaggedComments,
  getAdminCharacters,
  getMessages,
  moderatePraxis,
  moderateComment,
  archiveMessage,
} from '../../api/admin'
import type {
  ContactMessageOut,
  FlagOut,
  FlaggedCommentOut,
  FlaggedPraxisOut,
} from '../../api/admin'
import { formatTimestamp, relativeTime } from '../../utils/dates'
import { extractError } from '../../utils/errors'
import { flagReasonLabel } from '../../utils/flagReasons'

// ── Queue shaping ─────────────────────────────────────────────────────────────

type QueueItem =
  | { kind: 'praxis'; praxis: FlaggedPraxisOut }
  | { kind: 'comment'; comment: FlaggedCommentOut }

/** When the item entered the queue: its most recent flag (flags arrive newest
 *  first), falling back to the content's own timestamps. */
function queueTime(item: QueueItem): string {
  if (item.kind === 'praxis') {
    return (
      item.praxis.flags[0]?.created_at ??
      item.praxis.flagged_at ??
      item.praxis.created_at
    )
  }
  return item.comment.flags[0]?.created_at ?? item.comment.created_at
}

/** Top reason: most common; ties break to the most recently flagged reason.
 *  Flags are newest-first, so the first reason to reach the max count wins. */
function topReason(flags: FlagOut[]): string {
  const counts = new Map<string, number>()
  for (const flag of flags) {
    counts.set(flag.reason, (counts.get(flag.reason) ?? 0) + 1)
  }
  let best: string | null = null
  let bestCount = 0
  for (const flag of flags) {
    const count = counts.get(flag.reason) ?? 0
    if (count > bestCount) {
      best = flag.reason
      bestCount = count
    }
  }
  return best ?? 'other'
}

/** "reported by {name}" for one reporter, "reported by N members" for more. */
function reporterText(flags: FlagOut[]): string {
  const distinct = new Set(flags.map((flag) => flag.flagged_by_id))
  if (distinct.size === 1 && flags[0]) return `reported by ${flags[0].flagged_by_name}`
  return `reported by ${distinct.size} members`
}

interface ActionLogEntry {
  id: number
  text: string
  at: string
}

// ── Small presentational bits ────────────────────────────────────────────────

function ReasonBadge({ reason }: { reason: string }) {
  return (
    <span
      className="eyebrow"
      style={{
        border: '1.5px solid var(--color-danger)',
        color: 'var(--color-danger)',
        padding: '2px 8px',
        fontSize: 9,
      }}
    >
      {flagReasonLabel(reason)}
    </span>
  )
}

function QueueCardFrame({
  badgeReason,
  typeLabel,
  when,
  children,
}: {
  badgeReason: string
  typeLabel: string
  when: string
  children: ReactNode
}) {
  return (
    <div className="card px-4 py-3">
      <div className="flex items-center gap-3 mb-2">
        <ReasonBadge reason={badgeReason} />
        <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>
          {typeLabel} &middot; {relativeTime(when)}
        </span>
      </div>
      {children}
    </div>
  )
}

// ── The tab ──────────────────────────────────────────────────────────────────

export default function ModerationTab() {
  const [flaggedPraxes, setFlaggedPraxes] = useState<FlaggedPraxisOut[]>([])
  const [flaggedComments, setFlaggedComments] = useState<FlaggedCommentOut[]>([])
  const [activeMembers, setActiveMembers] = useState<number | null>(null)
  const [messages, setMessages] = useState<ContactMessageOut[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Fail note state: praxis id -> note text
  const [failNoteTarget, setFailNoteTarget] = useState<number | null>(null)
  const [failNote, setFailNote] = useState('')

  // "Your last actions" — this session only, newest first. No undo, no audit
  // table; leaving the page clears it. Deliberate (#237).
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([])

  const refresh = () => {
    setError(null)
    Promise.all([
      getFlaggedPraxes(),
      getFlaggedComments(),
      getAdminCharacters('active'),
      getMessages(showArchived),
    ])
      .then(([praxes, comments, characters, messageRows]) => {
        setFlaggedPraxes(praxes)
        setFlaggedComments(comments)
        setActiveMembers(characters.length)
        setMessages(messageRows)
      })
      .catch((err) => setError(extractError(err, "Couldn't load moderation data.")))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [showArchived])

  const logAction = (text: string) => {
    setActionLog((previous) => [
      { id: Date.now(), text, at: new Date().toISOString() },
      ...previous,
    ])
  }

  const handlePraxisAction = async (
    praxis: FlaggedPraxisOut,
    status: 'visible' | 'hidden' | 'failed',
    note?: string,
  ) => {
    setActionError(null)
    const verb = status === 'visible' ? 'Kept' : status === 'hidden' ? 'Removed' : 'Failed'
    try {
      await moderatePraxis(praxis.id, status, note)
      setFailNoteTarget(null)
      setFailNote('')
      logAction(`${verb} praxis "${praxis.title || praxis.task_title}"`)
      refresh()
    } catch (err) {
      setActionError(extractError(err, 'Moderation action failed.'))
    }
  }

  const handleCommentAction = async (
    comment: FlaggedCommentOut,
    status: 'visible' | 'deleted',
  ) => {
    setActionError(null)
    const verb = status === 'visible' ? 'Kept' : 'Removed'
    try {
      await moderateComment(comment.id, status)
      logAction(`${verb} comment by ${comment.author.display_name}`)
      refresh()
    } catch (err) {
      setActionError(extractError(err, 'Moderation action failed.'))
    }
  }

  const handleArchive = async (id: number) => {
    setActionError(null)
    try {
      await archiveMessage(id)
      refresh()
    } catch (err) {
      setActionError(extractError(err, 'Could not archive message.'))
    }
  }

  if (loading) return <div className="font-body text-muted text-sm">Loading...</div>
  if (error) return <p className="font-body text-sm text-red-600">{error}</p>

  const queue: QueueItem[] = [
    ...flaggedPraxes.map((praxis): QueueItem => ({ kind: 'praxis', praxis })),
    ...flaggedComments.map((comment): QueueItem => ({ kind: 'comment', comment })),
  ].sort((a, b) => queueTime(b).localeCompare(queueTime(a)))

  return (
    <div className="flex flex-col gap-8">
      {actionError && (
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
          {actionError}
        </p>
      )}

      {/* Stat strip — only numbers real state backs (#237). */}
      <div className="flex gap-4">
        <div className="card px-5 py-3" style={{ minWidth: 140 }}>
          <p className="font-display text-2xl font-bold">{queue.length}</p>
          <p className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>Open reports</p>
        </div>
        <div className="card px-5 py-3" style={{ minWidth: 140 }}>
          <p className="font-display text-2xl font-bold">{activeMembers ?? '—'}</p>
          <p className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>Active members</p>
        </div>
      </div>

      {/* Review queue — flagged praxes + comments, one list, newest first. */}
      <section>
        <h3 className="font-display text-xl font-bold mb-3 border-b-2 border-border pb-1">
          Review queue <span className="text-muted text-base">({queue.length})</span>
        </h3>
        {queue.length === 0 ? (
          <div className="card px-4 py-6" style={{ textAlign: 'center' }}>
            <p className="font-display text-lg font-bold">Queue clear</p>
            <p className="font-body text-sm text-muted">
              Nothing flagged right now. Check back later.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {queue.map((item) =>
              item.kind === 'praxis' ? (
                <QueueCardFrame
                  key={`praxis-${item.praxis.id}`}
                  badgeReason={topReason(item.praxis.flags)}
                  typeLabel="Praxis"
                  when={queueTime(item)}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <Link
                        to={`/praxes/${item.praxis.id}`}
                        className="font-display text-lg font-bold"
                        style={{ color: 'inherit' }}
                      >
                        {item.praxis.title || item.praxis.task_title}
                      </Link>
                      <p className="font-body text-xs text-muted">
                        by {item.praxis.created_by_display_name || `#${item.praxis.created_by_id}`}
                        {' '}&middot; {reporterText(item.praxis.flags)}
                        {' '}&middot; {item.praxis.flags.length} flag{item.praxis.flags.length === 1 ? '' : 's'}
                      </p>
                      {item.praxis.flags[0]?.reason_detail && (
                        <p className="font-body text-xs text-muted" style={{ marginTop: 4, fontStyle: 'italic' }}>
                          &ldquo;{item.praxis.flags[0].reason_detail}&rdquo;
                        </p>
                      )}
                      <Link
                        to={`/praxes/${item.praxis.id}`}
                        className="eyebrow"
                        style={{ display: 'inline-block', marginTop: 6 }}
                      >
                        View praxis &rarr;
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => void handlePraxisAction(item.praxis, 'visible')}
                        className="btn-primary text-xs"
                      >
                        keep
                      </button>
                      <button
                        onClick={() => void handlePraxisAction(item.praxis, 'hidden')}
                        className="btn-outline text-xs"
                        style={{ borderColor: 'rgba(220,38,38,0.5)', color: 'var(--color-danger)' }}
                      >
                        remove
                      </button>
                      <button
                        onClick={() => setFailNoteTarget(failNoteTarget === item.praxis.id ? null : item.praxis.id)}
                        className="btn-outline text-xs"
                        style={{ borderColor: 'rgba(245,158,11,0.5)', color: 'var(--color-warning)' }}
                      >
                        fail
                      </button>
                    </div>
                  </div>
                  {failNoteTarget === item.praxis.id && (
                    <div className="mt-3 flex gap-2 items-end">
                      <textarea
                        className="border-2 border-border bg-card px-3 py-1 font-body text-sm focus:outline-none focus:border-ink flex-1 resize-none"
                        rows={2}
                        placeholder="Reason for failure (visible to player)..."
                        value={failNote}
                        onChange={(e) => setFailNote(e.target.value)}
                      />
                      <button
                        onClick={() => void handlePraxisAction(item.praxis, 'failed', failNote)}
                        className="btn-primary text-xs"
                        style={{ background: 'var(--color-warning)', borderColor: 'var(--color-warning)' }}
                      >
                        confirm fail
                      </button>
                      <button
                        onClick={() => { setFailNoteTarget(null); setFailNote('') }}
                        className="btn-outline text-xs"
                      >
                        cancel
                      </button>
                    </div>
                  )}
                </QueueCardFrame>
              ) : (
                <QueueCardFrame
                  key={`comment-${item.comment.id}`}
                  badgeReason={topReason(item.comment.flags)}
                  typeLabel="Comment"
                  when={queueTime(item)}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <p className="font-body text-sm text-ink" style={{ fontStyle: 'italic' }}>
                        &ldquo;{item.comment.body_text}&rdquo;
                      </p>
                      <p className="font-body text-xs text-muted" style={{ marginTop: 4 }}>
                        by {item.comment.author.display_name}
                        {' '}&middot; {reporterText(item.comment.flags)}
                        {' '}&middot; {item.comment.flags.length} flag{item.comment.flags.length === 1 ? '' : 's'}
                      </p>
                      {item.comment.flags[0]?.reason_detail && (
                        <p className="font-body text-xs text-muted" style={{ marginTop: 4, fontStyle: 'italic' }}>
                          &ldquo;{item.comment.flags[0].reason_detail}&rdquo;
                        </p>
                      )}
                      {/* Linkback to the thread the comment lives on. */}
                      <Link
                        to={item.comment.praxis_id != null
                          ? `/praxes/${item.comment.praxis_id}`
                          : `/tasks/${item.comment.task_id}`}
                        className="eyebrow"
                        style={{ display: 'inline-block', marginTop: 6 }}
                      >
                        View thread &rarr;
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => void handleCommentAction(item.comment, 'visible')}
                        className="btn-primary text-xs"
                      >
                        keep
                      </button>
                      <button
                        onClick={() => void handleCommentAction(item.comment, 'deleted')}
                        className="btn-outline text-xs"
                        style={{ borderColor: 'rgba(220,38,38,0.5)', color: 'var(--color-danger)' }}
                      >
                        remove
                      </button>
                    </div>
                  </div>
                </QueueCardFrame>
              ),
            )}
          </div>
        )}
      </section>

      {/* Your last actions — this session only; nothing persists, no undo. */}
      {actionLog.length > 0 && (
        <section>
          <h3 className="font-display text-xl font-bold mb-3 border-b-2 border-border pb-1">
            Your last actions
          </h3>
          <p className="font-body text-xs text-muted mb-2">
            This session only — the list clears when you leave the page.
          </p>
          <ul className="flex flex-col gap-1">
            {actionLog.map((entry) => (
              <li key={entry.id} className="font-body text-sm">
                {entry.text}
                <span className="text-muted text-xs"> &middot; {formatTimestamp(entry.at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Contact Messages */}
      <section>
        <div className="flex items-center gap-4 mb-3 border-b-2 border-border pb-1">
          <h3 className="font-display text-xl font-bold">
            Messages <span className="text-muted text-base">({messages.length})</span>
          </h3>
          <label className="font-body text-xs text-muted flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            show archived
          </label>
        </div>
        {messages.length === 0 ? (
          <p className="font-body text-sm text-muted">
            {showArchived ? 'No archived messages.' : 'No messages.'}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className="card px-4 py-3"
                style={{ opacity: m.is_archived ? 0.6 : 1 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-display text-lg font-bold">{m.name}</p>
                    <p className="font-body text-xs text-muted">
                      {m.email} &middot; {formatTimestamp(m.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => void handleArchive(m.id)}
                    className="btn-outline text-xs shrink-0"
                  >
                    {m.is_archived ? 'unarchive' : 'archive'}
                  </button>
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

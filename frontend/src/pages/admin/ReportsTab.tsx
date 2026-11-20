import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import {
  banCharacter,
  getFlaggedComments,
  getFlaggedPraxes,
  getModLog,
  listAdminPraxes,
  moderateComment,
  moderatePraxis,
  removeFlaggedPraxes,
  suspendAccount,
} from '../../api/admin'
import type { FlaggedCommentOut, FlaggedPraxisOut, FlagOut, ModActionOut } from '../../api/admin'
import MediaGallery from '../../components/MediaGallery'
import { relativeTime } from '../../utils/dates'
import { extractError } from '../../utils/errors'
import { flagReasonLabel } from '../../utils/flagReasons'
import { useReloadCounts } from './useAdminCounts'
import AuthorRow from './AuthorRow'
import type { AuthorAction } from './AuthorRow'
import './adminReports.css'

type Filter = 'all' | 'praxis' | 'comment'
type Item =
  | { kind: 'praxis'; praxis: FlaggedPraxisOut }
  | { kind: 'comment'; comment: FlaggedCommentOut }

/** Most recent flag (flags are newest-first), else the content's own timestamps. */
const itemTime = (item: Item): string =>
  item.kind === 'praxis'
    ? (item.praxis.flags[0]?.created_at ?? item.praxis.flagged_at ?? item.praxis.created_at)
    : (item.comment.flags[0]?.created_at ?? item.comment.created_at)

/** Most common reason; ties go to the most recent (flags are newest-first). */
function topReason(flags: FlagOut[]): string {
  const counts = new Map<string, number>()
  for (const flag of flags) counts.set(flag.reason, (counts.get(flag.reason) ?? 0) + 1)
  let best = 'other'
  let bestCount = 0
  for (const flag of flags) {
    const count = counts.get(flag.reason) ?? 0
    if (count > bestCount) {
      best = flag.reason
      bestCount = count
    }
  }
  return best
}

function FlagFacts({ flags }: { flags: FlagOut[] }) {
  const { t } = useTranslation('admin')
  const first = flags[0]
  const people = new Set(flags.map((flag) => flag.flagged_by_id)).size
  return (
    <>
      {first?.reason_detail && (
        <blockquote className="rp-quote">
          &ldquo;{first.reason_detail}&rdquo; <span className="rp-muted">&mdash; {first.flagged_by_name}</span>
        </blockquote>
      )}
      <span className="rp-muted">
        {t('console.reports.flagCount', {
          count: flags.length,
          people: t(people === 1 ? 'console.reports.peopleOne' : 'console.reports.peopleMany', { count: people }),
        })}
      </span>
    </>
  )
}

function PraxisReport({
  praxis,
  act,
  moderateAuthor,
  onViewAccount,
}: {
  praxis: FlaggedPraxisOut
  act: (status: 'visible' | 'hidden' | 'failed', note?: string) => Promise<void>
  moderateAuthor: (praxis: FlaggedPraxisOut, kind: AuthorAction, on: boolean, note?: string) => Promise<void>
  onViewAccount: (search: string) => void
}) {
  const { t } = useTranslation('admin')
  const [deciding, setDeciding] = useState<'hidden' | 'failed' | null>(null)
  const [reason, setReason] = useState('')
  const [confirming, setConfirming] = useState<AuthorAction | null>(null)
  const reasonRef = useRef<HTMLInputElement>(null)
  const when = itemTime({ kind: 'praxis', praxis })

  const toggle = (status: 'hidden' | 'failed') => {
    const arming = deciding !== status
    setDeciding(arming ? status : null)
    if (arming) reasonRef.current?.focus()
  }
  const cancel = () => {
    setDeciding(null)
    setReason('')
  }

  return (
    <section aria-label={praxis.title || praxis.task_title} className="rp-card">
      <div className="rp-body">
        {praxis.media_items.length > 0 && (
          <div className="rp-photo" role="img" aria-label={t('console.reports.photoAlt')}>
            <MediaGallery media={praxis.media_items} />
          </div>
        )}
        <div className="rp-facts">
          <span className="rp-reason">{flagReasonLabel(topReason(praxis.flags))}</span>
          <Link to={`/praxis/${praxis.id}`} className="rp-title">
            {praxis.title || praxis.task_title}
          </Link>
          <span className="rp-muted">
            {t('console.reports.meta', {
              type: t('console.reports.typeLabel.praxis'),
              author: praxis.created_by_display_name || `#${praxis.created_by_id}`,
              task: praxis.task_title,
              age: relativeTime(when),
            })}
          </span>
          <FlagFacts flags={praxis.flags} />
        </div>
      </div>

      <hr className="rp-rule" />
      <div className="rp-btns rp-decide" role="group" aria-label={t('console.reports.decision.label')}>
        <button type="button" className="rp-btn" onClick={() => void act('visible')}>
          {t('console.reports.decision.keep')}
        </button>
        <button
          type="button"
          className="rp-btn rp-btn-dng"
          aria-pressed={deciding === 'hidden'}
          onClick={() => toggle('hidden')}
        >
          {t('console.reports.decision.remove')}
        </button>
        <button
          type="button"
          className="rp-btn rp-btn-wrn"
          aria-pressed={deciding === 'failed'}
          aria-label={t('console.reports.decision.fail')}
          onClick={() => toggle('failed')}
        >
          <span className="rp-long" aria-hidden="true">{t('console.reports.decision.fail')}</span>
          <span className="rp-short" aria-hidden="true">{t('console.reports.decision.failShort')}</span>
        </button>
      </div>
      <p className="rp-muted rp-help">{t('console.reports.decision.help')}</p>
      <form
        className="rp-reason-form"
        data-deciding={deciding ?? undefined}
        onSubmit={(event) => {
          event.preventDefault()
          if (deciding) void act(deciding, reason.trim()).then(cancel, () => {})
        }}
      >
        <label className="rp-field">
          {t('console.reports.decision.reasonLabel')}
          <input
            ref={reasonRef}
            className="rp-input"
            placeholder={t('console.reports.decision.reasonHint')}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        {deciding && (
          <div className="rp-btns">
            <button type="submit" className="rp-btn rp-btn-dng" disabled={!reason.trim()}>
              {t(deciding === 'hidden' ? 'console.reports.decision.submitRemove' : 'console.reports.decision.submitFail')}
            </button>
            <button type="button" className="rp-btn" onClick={cancel}>
              {t('console.reports.decision.cancel')}
            </button>
          </div>
        )}
      </form>

      <hr className="rp-rule" />
      <AuthorRow
        praxis={praxis}
        confirming={confirming}
        onAsk={setConfirming}
        onCancel={() => setConfirming(null)}
        onModerate={async (...args) => {
          await moderateAuthor(...args)
          setConfirming(null)
        }}
        onViewAccount={onViewAccount}
      />
    </section>
  )
}

function CommentReport({
  comment,
  act,
}: {
  comment: FlaggedCommentOut
  act: (status: 'visible' | 'deleted', note?: string) => Promise<void>
}) {
  const { t } = useTranslation('admin')
  const [removing, setRemoving] = useState(false)
  const [reason, setReason] = useState('')
  const cancel = () => {
    setRemoving(false)
    setReason('')
  }
  return (
    <section aria-label={comment.author.display_name} className="rp-card">
      <div className="rp-facts">
        <span className="rp-reason">{flagReasonLabel(topReason(comment.flags))}</span>
        <blockquote className="rp-quote">&ldquo;{comment.body_text}&rdquo;</blockquote>
        <span className="rp-muted">
          {t('console.reports.metaComment', {
            author: comment.author.display_name,
            age: relativeTime(itemTime({ kind: 'comment', comment })),
          })}
        </span>
        <FlagFacts flags={comment.flags} />
        <Link
          to={comment.praxis_id != null ? `/praxis/${comment.praxis_id}` : `/tasks/${comment.task_id}`}
          className="rp-muted"
        >
          {t('console.reports.viewThread')}
        </Link>
      </div>
      <div className="rp-btns rp-decide">
        <button type="button" className="rp-btn" onClick={() => void act('visible')}>
          {t('console.reports.decision.keep')}
        </button>
        <button
          type="button"
          className="rp-btn rp-btn-dng"
          aria-pressed={removing}
          onClick={() => (removing ? cancel() : setRemoving(true))}
        >
          {t('console.reports.decision.remove')}
        </button>
      </div>
      {removing && (
        <form
          className="rp-reason-form"
          data-deciding="hidden"
          onSubmit={(event) => {
            event.preventDefault()
            void act('deleted', reason.trim()).then(cancel, () => {})
          }}
        >
          <label className="rp-field">
            {t('console.reports.decision.reasonLabel')}
            <input
              className="rp-input"
              autoFocus
              placeholder={t('console.reports.decision.reasonHintComment')}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <div className="rp-btns">
            <button type="submit" className="rp-btn rp-btn-dng" disabled={!reason.trim()}>
              {t('console.reports.decision.submitRemove')}
            </button>
            <button type="button" className="rp-btn" onClick={cancel}>
              {t('console.reports.decision.cancel')}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

function useLogLine(): (entry: ModActionOut) => string {
  const { t } = useTranslation('admin')
  return (entry) =>
    t('console.reports.recent.entry', {
      actor: entry.actor_name ?? t('console.reports.recent.unknownActor'),
      action: t(`console.reports.recent.actions.${entry.action}` as 'console.reports.recent.entry', {
        defaultValue: entry.action,
      }),
      target: t(`console.reports.recent.targets.${entry.target_type}` as 'console.reports.recent.entry', {
        defaultValue: entry.target_type,
      }),
      id: entry.target_id,
    })
}

function Calm({ last, newestPraxisId }: { last: ModActionOut | undefined; newestPraxisId: number | null }) {
  const { t } = useTranslation('admin')
  const logLine = useLogLine()
  return (
    <section aria-label={t('console.reports.empty.title')} className="rp-card rp-calm">
      <span className="rp-calm-word">{t('console.reports.empty.title')}</span>
      <span className="rp-muted">
        {last
          ? t('console.reports.empty.last', { entry: logLine(last), age: relativeTime(last.created_at) })
          : t('console.reports.empty.none')}
      </span>
      <div className="rp-btns">
        {newestPraxisId !== null && (
          <Link to={`/praxis/${newestPraxisId}`} className="rp-btn">
            {t('console.reports.empty.newest')}
          </Link>
        )}
        <Link to="/admin/mod-log" className="rp-btn">
          {t('console.reports.empty.modLog')}
        </Link>
      </div>
    </section>
  )
}

export default function ReportsTab({ onViewAccount }: { onViewAccount: (search: string) => void }) {
  const { t } = useTranslation(['admin', 'common'])
  const logLine = useLogLine()
  const reloadCounts = useReloadCounts()
  const [praxes, setPraxes] = useState<FlaggedPraxisOut[]>([])
  const [comments, setComments] = useState<FlaggedCommentOut[]>([])
  const [recent, setRecent] = useState<ModActionOut[]>([])
  const [newestPraxisId, setNewestPraxisId] = useState<number | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [params, setParams] = useSearchParams()
  const character = Number(params.get('character')) || null

  const refresh = () => {
    setError(null)
    // The log is garnish: its failure must not hide the queue.
    Promise.all([
      getFlaggedPraxes(),
      getFlaggedComments(),
      getModLog(0, { kind: 'reports' }).then((log) => log.items, () => []),
    ])
      .then(([flaggedPraxes, flaggedComments, log]) => {
        setPraxes(flaggedPraxes)
        setComments(flaggedComments)
        setRecent(log)
        if (flaggedPraxes.length + flaggedComments.length === 0) {
          void listAdminPraxes({ limit: 1, status: 'submitted' })
            .then((rows) => setNewestPraxisId(rows[0]?.id ?? null))
            .catch(() => setNewestPraxisId(null))
        }
      })
      .catch((err) => setError(extractError(err, t('console.reports.loadError'))))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [])

  const run = async (call: () => Promise<unknown>) => {
    setActionError(null)
    try {
      await call()
      refresh()
      reloadCounts()
    } catch (err) {
      setActionError(extractError(err, t('console.reports.actionError')))
      throw err
    }
  }

  const moderateAuthor = (praxis: FlaggedPraxisOut, kind: AuthorAction, on: boolean, note?: string) =>
    run(() => {
      if (kind === 'removeAll') return removeFlaggedPraxes(praxis.created_by_id, note)
      return kind === 'ban' ? banCharacter(praxis.created_by_id, on) : suspendAccount(praxis.author_account_id, on)
    })

  if (loading) return <p className="font-body text-muted">{t('common:loading')}</p>
  if (error) return <p className="font-body danger-text">{error}</p>

  const items: Item[] = [
    ...praxes.filter((p) => !character || p.created_by_id === character).map((praxis): Item => ({ kind: 'praxis', praxis })),
    ...comments.filter((c) => !character || c.author.id === character).map((comment): Item => ({ kind: 'comment', comment })),
  ].sort((a, b) => itemTime(b).localeCompare(itemTime(a)))
  const shown = filter === 'all' ? items : items.filter((item) => item.kind === filter)
  const tabs: [Filter, string, number][] = [
    ['all', t('console.reports.filter.all'), items.length],
    ['praxis', t('console.reports.filter.praxis'), items.filter((item) => item.kind === 'praxis').length],
    ['comment', t('console.reports.filter.comments'), items.filter((item) => item.kind === 'comment').length],
  ]

  let body: ReactNode
  if (shown.length === 0) {
    body =
      character && praxes.length + comments.length > 0 ? (
        <p className="rp-muted">{t('console.reports.noneForCharacter')}</p>
      ) : (
        <Calm last={recent[0]} newestPraxisId={newestPraxisId} />
      )
  } else {
    body = shown.map((item) =>
      item.kind === 'praxis' ? (
        <PraxisReport
          key={`p${item.praxis.id}`}
          praxis={item.praxis}
          act={(status, note) => run(() => moderatePraxis(item.praxis.id, status, note))}
          moderateAuthor={moderateAuthor}
          onViewAccount={onViewAccount}
        />
      ) : (
        <CommentReport
          key={`c${item.comment.id}`}
          comment={item.comment}
          act={(status, note) => run(() => moderateComment(item.comment.id, status, note))}
        />
      ),
    )
  }

  return (
    <>
      <header className="rp-head">
        <div>
          <h1 className="rp-h1">
            {t('console.reports.title')}
            {items.length > 0 && <span className="rp-count">{items.length}</span>}
          </h1>
          <p className="rp-lede">{t('console.reports.lede')}</p>
        </div>
        <div className="rp-segs" role="tablist" aria-label={t('console.reports.filter.label')}>
          {tabs.map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              className="rp-seg"
              onClick={() => setFilter(key)}
            >
              {label} {count}
            </button>
          ))}
        </div>
      </header>
      {character && (
        <p className="rp-muted">
          {t('console.reports.onlyCharacter', { id: character })}{' '}
          <button type="button" className="rp-btn" onClick={() => setParams({}, { replace: true })}>
            {t('console.reports.clearCharacter')}
          </button>
        </p>
      )}
      {actionError && <p role="alert" className="rp-error">{actionError}</p>}
      <div className="rp-split">
        <div className="rp-main">{body}</div>
        <aside aria-label={t('console.reports.recent.heading')} className="rp-card rp-side">
          <h2 className="rp-h2">{t('console.reports.recent.heading')}</h2>
          {recent.length === 0 && <p className="rp-muted">{t('console.reports.recent.none')}</p>}
          {recent.slice(0, 3).map((entry) => (
            <p key={entry.id} className="rp-entry">
              {logLine(entry)} <span className="rp-muted">&middot; {relativeTime(entry.created_at)}</span>
            </p>
          ))}
          <Link to="/admin/mod-log" className="rp-muted">
            {t('console.reports.recent.all')}
          </Link>
        </aside>
      </div>
    </>
  )
}

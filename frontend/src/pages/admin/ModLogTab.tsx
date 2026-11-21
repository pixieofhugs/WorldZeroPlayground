import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getModLog, type ModActionOut, type ModLogFilters } from '../../api/admin'
import { extractError } from '../../utils/errors'
import { formatTimestamp } from '../../utils/dates'
import './adminModLog.css'
import { ListTable, ListToolbar, SelectChip, SidePanel, type Column } from './AdminList'

type Kind = NonNullable<ModLogFilters['kind']>
const KINDS: Kind[] = ['reports', 'tasks', 'people', 'rules']
const BAD = new Set(['ban', 'suspend', 'praxis_hidden', 'comment_hidden', 'remove_flagged', 'task_delete', 'role_revoke'])
const OK = new Set(['unban', 'unsuspend', 'praxis_visible', 'comment_visible'])
// praxis_failed and comment_deleted carry the note the author was shown; every other detail is a count or a name.
const REASON = new Set(['praxis_failed', 'comment_deleted'])

const tone = (action: string) => (BAD.has(action) ? 'adm-tag-bad' : OK.has(action) ? 'adm-tag-ok' : 'adm-tag-wait')
const when = formatTimestamp

type Page = Awaited<ReturnType<typeof getModLog>>

export default function ModLogTab() {
  const { t } = useTranslation('admin')
  const [kind, setKind] = useState<Kind | ''>('')
  const [actor, setActor] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<ModActionOut[]>([])
  const [page, setPage] = useState<Page | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filters = (): ModLogFilters => ({
    ...(kind ? { kind } : {}),
    ...(actor ? { actor: Number(actor) } : {}),
    ...(search.trim() ? { q: search.trim() } : {}),
  })
  const fail = (err: unknown) => setError(extractError(err, t('console.modlog.loadError')))

  // A filter change starts over; typing waits a beat so each key isn't a query.
  useEffect(() => {
    let live = true
    const timer = setTimeout(() => {
      setError(null)
      getModLog(0, filters())
        .then((next) => {
          if (!live) return
          setPage(next)
          setRows(next.items)
        })
        .catch((err) => live && fail(err))
    }, search ? 250 : 0)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [kind, actor, search])

  const loadMore = () =>
    getModLog(rows.length, filters())
      .then((next) => setRows((previous) => [...previous, ...next.items]))
      .catch(fail)

  const name = (r: ModActionOut) => r.target_name ?? ''
  const author = (r: ModActionOut) => r.target_author ?? ''
  const to = (r: ModActionOut) => {
    if (r.action === 'remove_flagged') return t('console.modlog.to.removeFlagged', { name: name(r) })
    if (r.target_name === null && r.target_author === null)
      return t('console.modlog.to.gone', { type: r.target_type, id: r.target_id })
    return t(`console.modlog.to.${r.target_type}`, { name: name(r), author: author(r), defaultValue: name(r) })
  }
  const did = (r: ModActionOut) => t(`console.modlog.did.${r.action}`, { defaultValue: r.action.replace(/_/g, ' ') })
  const why = (r: ModActionOut) => (REASON.has(r.action) && r.detail ? r.detail : t('console.modlog.none'))
  const mod = (r: ModActionOut) => r.actor_name ?? ''

  const columns: Column<ModActionOut>[] = [
    { key: 'when', header: t('console.modlog.cols.when'), cell: (r) => when(r.created_at) },
    { key: 'mod', header: t('console.modlog.cols.mod'), cell: mod },
    { key: 'did', header: t('console.modlog.cols.did'), cell: (r) => <span className={`adm-tag ${tone(r.action)}`}>{did(r)}</span> },
    { key: 'to', header: t('console.modlog.cols.to'), cell: to },
    { key: 'why', header: t('console.modlog.cols.reason'), cell: (r) => <span className="adm-muted">{why(r)}</span> },
  ]

  const counts = page?.counts ?? {}
  const all = KINDS.reduce((sum, k) => sum + (counts[k] ?? 0), 0)
  const selected = rows.find((r) => r.id === selectedId) ?? null

  return (
    <div className="adm-modlog">
      <header className="adm-head">
        <div>
          <h1 className="adm-h1">{t('console.modlog.title')}</h1>
          <p className="adm-lede">{t('console.modlog.lede')}</p>
        </div>
      </header>

      <ListToolbar
        label={t('console.modlog.toolbar')}
        search={{ value: search, onChange: setSearch, placeholder: t('console.modlog.searchPlaceholder'), label: t('console.modlog.searchLabel') }}
        segments={[
          { key: '', label: t('console.modlog.segments.all'), count: all },
          ...KINDS.map((k) => ({ key: k, label: t(`console.modlog.segments.${k}`), count: counts[k] ?? 0 })),
        ]}
        active={kind}
        onSegment={(key) => setKind(key as Kind | '')}
      >
        <SelectChip
          label={t('console.modlog.mod')}
          value={actor}
          onChange={setActor}
          options={(page?.mods ?? []).map((m) => ({ value: String(m.account_id), label: m.name ?? '' }))}
        />
      </ListToolbar>

      {error && <p className="adm-err">{error}</p>}
      <div className="adm-split">
        <div className="adm-card adm-split-main">
          <ListTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            selectedKey={selectedId}
            onOpen={(r) => setSelectedId(r.id)}
            empty={page ? t('console.modlog.empty') : ''}
          />
          {page && rows.length < page.total && (
            <button type="button" className="adm-btn" onClick={() => void loadMore()}>
              {t('console.modlog.loadMore')} ({rows.length}/{page.total})
            </button>
          )}
        </div>
        {selected && (
          <SidePanel
            key={selected.id}
            label={t('console.modlog.panel')}
            badge={<span className={`adm-tag ${tone(selected.action)}`}>{did(selected)}</span>}
            onClose={() => setSelectedId(null)}
          >
            <p>{t('console.modlog.panelLine', { mod: mod(selected), did: did(selected), to: to(selected) })}</p>
            <p className="adm-muted">{when(selected.created_at)}</p>
            <p className="adm-muted">{why(selected)}</p>
          </SidePanel>
        )}
      </div>
      <p className="adm-muted">{t('console.modlog.foot')}</p>
    </div>
  )
}

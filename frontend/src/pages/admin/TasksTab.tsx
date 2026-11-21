import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getAllTasks, getPendingTasks, getTaskIdsWithHistory } from '../../api/admin'
import { extractError } from '../../utils/errors'
import { useGameConfig } from '../../hooks/useGameConfig'
import { factionName, isFactionHiddenFromChoosers, UNAFFILIATED_FACTION_SLUG } from '../../utils/factions'
import { ListTable, ListToolbar, SelectChip, useSelection, type Column } from './AdminList'
import TaskImportPanel from './TaskImportPanel'
import TaskPanel from './TaskPanel'
import {
  distinctLevels,
  filterAdminTaskRows,
  hoursUntilPublic,
  mergeAdminTaskRows,
  reconcileLevelFilter,
  type AdminTaskRow,
} from './adminTaskRows'
import { markTaskRowDeleted } from './taskDelete'
import { useReloadCounts } from './useAdminCounts'

type Segment = 'proposals' | 'active' | 'retired' | 'deleted' | 'backdoor'
const SEGMENTS: { key: Segment; status: string }[] = [
  { key: 'proposals', status: 'pending' },
  { key: 'active', status: 'active' },
  { key: 'retired', status: 'retired' },
  { key: 'deleted', status: 'deleted' },
  { key: 'backdoor', status: 'backdoor' },
]
const segmentOf = (status: string): Segment => SEGMENTS.find((s) => s.status === status)?.key ?? 'active'

/** `/admin/proposals` is this page on its Proposals segment; `?task=<id>` opens that task's panel. */
export default function TasksTab() {
  const { t } = useTranslation(['admin', 'common'])
  const { pathname } = useLocation()
  const config = useGameConfig()
  const reloadCounts = useReloadCounts()
  const [tasks, setTasks] = useState<AdminTaskRow[]>([])
  const [segment, setSegment] = useState<Segment>(pathname.endsWith('/proposals') ? 'proposals' : 'active')
  const [search, setSearch] = useState('')
  const [faction, setFaction] = useState('')
  const [level, setLevel] = useState('')
  const [minPoints, setMinPoints] = useState('')
  const [maxPoints, setMaxPoints] = useState('')
  const [importing, setImporting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setError(null)
    Promise.all([getAllTasks(), getPendingTasks(), getTaskIdsWithHistory()])
      .then(([all, pending, history]) => setTasks(mergeAdminTaskRows(all, pending, history)))
      .catch((err) => setError(extractError(err, t('tasks.loadError'))))
      .finally(() => setLoading(false))
  }, [t])
  useEffect(refresh, [refresh])

  // An edit or refresh can remove the picked level from the options; clear it rather than filter to nothing behind a blank select.
  useEffect(
    () => setLevel((l) => String(reconcileLevelFilter(l === '' ? undefined : Number(l), distinctLevels(tasks)) ?? '')),
    [tasks],
  )

  // The rail's Proposals and Tasks are one component instance; follow the route.
  useEffect(() => setSegment(pathname.endsWith('/proposals') ? 'proposals' : 'active'), [pathname])

  const [selectedId, open] = useSelection('task')
  const selected = tasks.find((row) => row.id === selectedId) ?? null
  // A deep link, or a status change in the panel, brings the list to the task.
  useEffect(() => {
    if (selected) setSegment(segmentOf(selected.status))
  }, [selected?.id, selected?.status])

  const reviewHours = config?.pending_task_admin_review_hours
  const left = (row: AdminTaskRow) =>
    reviewHours === undefined ? null : hoursUntilPublic(row.created_at, reviewHours, Date.now())

  const factionLabel = (slug: string) => (slug === UNAFFILIATED_FACTION_SLUG ? t('tasks.crossFaction') : factionName(slug))
  const factions = (config?.factions ?? [])
    .map((f) => f.slug)
    .filter((slug) => !isFactionHiddenFromChoosers(slug))
    .map((slug) => ({ slug, label: factionLabel(slug) }))

  const status = SEGMENTS.find((s) => s.key === segment)?.status
  const rows = filterAdminTaskRows(
    tasks.filter((row) => row.status === status),
    {
      search,
      factions: faction ? [faction] : [],
      level: level !== '' ? Number(level) : undefined,
      minPoints: minPoints !== '' ? Number(minPoints) : undefined,
      maxPoints: maxPoints !== '' ? Number(maxPoints) : undefined,
    },
  )

  const proposals = segment === 'proposals'
  const columns: Column<AdminTaskRow>[] = [
    { key: 'title', header: proposals ? t('console.tasks.cols.proposal') : t('console.tasks.cols.task'), cell: (r) => (
        <>
          {r.title}
          {r.task_type === 'metatask' && <span className="adm-tag adm-tag-wait ml-2">{t('console.tasks.metatask')}</span>}
        </>
      ),
    },
    ...(proposals ? [{ key: 'by', header: t('console.tasks.cols.by'), cell: (r: AdminTaskRow) => r.created_by_name ?? '' }] : []),
    { key: 'faction', header: t('tasks.factionLabel'), cell: (r) => factionLabel(r.primary_faction_slug) },
    { key: 'level', header: t('console.tasks.cols.level'), numeric: true, cell: (r) => r.level_required },
    { key: 'points', header: t('console.tasks.cols.points'), numeric: true, cell: (r) => r.point_value },
    ...(proposals
      ? [
          {
            key: 'public',
            header: t('console.tasks.cols.goesPublic'),
            cell: (r: AdminTaskRow) => {
              const hours = left(r)
              if (hours === null) return null
              // Last quarter of the window reads as urgent.
              const urgent = hours <= (reviewHours ?? 0) / 4
              return (
                <span className={urgent ? 'adm-tag adm-tag-bad' : 'adm-tag adm-tag-wait'}>
                  {hours > 0 ? t('console.tasks.inHours', { hours }) : t('console.tasks.publicNow')}
                </span>
              )
            },
          },
        ]
      : []),
  ]

  if (loading) return <p className="adm-muted">{t('common:loading')}</p>
  if (error) return <p className="adm-err">{error}</p>

  const proposalWindow =
    config && selected ? { hours: config.pending_task_admin_review_hours, level: config.level_to_see_pending_tasks, left: left(selected) ?? 0 } : null

  return (
    <>
      <header className="adm-head">
        <div>
          <h1 className="adm-h1">{t('console.tasks.title')}</h1>
          <p className="adm-lede">{t('console.tasks.lede')}</p>
        </div>
        <button type="button" className="adm-btn adm-btn-pri" aria-expanded={importing} onClick={() => setImporting(!importing)}>
          {t('console.tasks.importCsv')}
        </button>
      </header>
      {importing && <TaskImportPanel onImported={refresh} />}

      <ListToolbar
        label={t('console.tasks.toolbar')}
        search={{ value: search, onChange: setSearch, placeholder: t('console.tasks.searchPlaceholder'), label: t('console.tasks.searchLabel') }}
        segments={SEGMENTS.map((s) => ({
          key: s.key,
          label: t(`console.tasks.segments.${s.key}`),
          count: tasks.filter((row) => row.status === s.status).length,
        }))}
        active={segment}
        onSegment={(key) => setSegment(key as Segment)}
      >
        <SelectChip label={t('tasks.factionLabel')} value={faction} onChange={setFaction} options={factions.map((f) => ({ value: f.slug, label: f.label }))} />
        <SelectChip
          label={t('console.tasks.cols.level')}
          value={level}
          onChange={setLevel}
          options={distinctLevels(tasks).map((l) => ({ value: String(l), label: String(l) }))}
        />
        <details className="adm-chip">
          <summary>{t('console.tasks.cols.points')}</summary>
          <div className="adm-chip-pop">
            <input className="adm-input" type="number" aria-label={t('console.tasks.pointsMin')} placeholder={t('console.tasks.pointsMin')} value={minPoints} onChange={(e) => setMinPoints(e.target.value)} onWheel={(e) => e.currentTarget.blur()} />
            <input className="adm-input" type="number" aria-label={t('console.tasks.pointsMax')} placeholder={t('console.tasks.pointsMax')} value={maxPoints} onChange={(e) => setMaxPoints(e.target.value)} onWheel={(e) => e.currentTarget.blur()} />
          </div>
        </details>
      </ListToolbar>

      <div className="adm-split">
        <div className="adm-card adm-split-main">
          <ListTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            selectedKey={selectedId}
            onOpen={(r) => open(r.id)}
            empty={t('console.tasks.empty', { segment: t(`console.tasks.segments.${segment}`).toLowerCase() })}
          />
        </div>
        {selected && (
          <TaskPanel
            key={`${selected.id}:${selected.status}`}
            task={selected}
            factions={factions}
            proposal={proposalWindow}
            onChanged={() => {
              refresh()
              reloadCounts()
            }}
            onDeleted={(id) => {
              // No refetch: it would flash the whole list for one row.
              setTasks((all) => markTaskRowDeleted(all, id))
              reloadCounts()
              open(null)
            }}
            onClose={() => open(null)}
          />
        )}
      </div>
    </>
  )
}

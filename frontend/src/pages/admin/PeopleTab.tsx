import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getAdminCharacters, getAdmins, type AdminCharacterSummary } from '../../api/admin'
import { useAuth } from '../../auth/AuthContext'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { extractError } from '../../utils/errors'
import { formatTimestamp } from '../../utils/dates'
import { factionFill } from '../../utils/factions'
import AdminRosterSection from './AdminRosterSection'
import { ListTable, ListToolbar, type Column } from './AdminList'
import PersonPanel from './PersonPanel'
import './adminPeople.css'

type Segment = 'all' | 'suspended' | 'banned'
const SEGMENTS: Segment[] = ['all', 'suspended', 'banned']
const IN: Record<Segment, (p: AdminCharacterSummary) => boolean> = {
  all: () => true,
  suspended: (p) => p.account_status === 'suspended',
  banned: (p) => p.status === 'banned',
}
const statusOf = (p: AdminCharacterSummary) => (p.status === 'banned' ? 'banned' : p.account_status === 'suspended' ? 'suspended' : 'active')

/** `?search=` seeds the search (Reports links here); `?person=<character id>` opens that panel. */
export default function PeopleTab() {
  const { t } = useTranslation(['admin', 'common'])
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const [people, setPeople] = useState<AdminCharacterSummary[]>([])
  const [search, setSearch] = useState(params.get('search') ?? '')
  const [segment, setSegment] = useState<Segment>('all')
  const [roster, setRoster] = useState(false)
  const [adminCount, setAdminCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounced = useDebouncedValue(search)

  const refresh = useCallback(() => {
    setError(null)
    return getAdminCharacters(debounced)
      .then(setPeople)
      .catch((err) => setError(extractError(err, t('console.people.loadError'))))
      .finally(() => setLoading(false))
  }, [debounced, t])
  useEffect(() => void refresh(), [refresh])

  const isOwner = user?.is_owner === true
  useEffect(() => {
    if (isOwner) void getAdmins().then((a) => setAdminCount(a.length), () => undefined)
  }, [isOwner, roster])

  const selectedId = Number(params.get('person')) || null
  const selected = people.find((p) => p.id === selectedId) ?? null
  const open = (id: number | null) => setParams(id ? { person: String(id) } : {}, { replace: true })

  // A link that names one person lands on their panel.
  const [landed, setLanded] = useState(false)
  useEffect(() => {
    if (!landed && !loading && !selectedId && params.get('search') && people.length === 1) {
      setLanded(true)
      open(people[0].id)
    }
  }, [landed, loading, selectedId, people])

  const columns: Column<AdminCharacterSummary>[] = [
    {
      key: 'name',
      header: t('console.people.cols.character'),
      cell: (p) => (
        <>
          <span className="adm-dot" style={factionFill(p.faction_slug, 'dot')} />
          {p.display_name} <span className="adm-muted">· {t('console.people.lvl', { level: p.level })}</span>
        </>
      ),
    },
    { key: 'account', header: t('console.people.cols.account'), cell: (p) => <span className="adm-muted">#{p.account_id}</span> },
    { key: 'joined', header: t('console.people.cols.joined'), cell: (p) => <span className="adm-muted">{formatTimestamp(p.created_at)}</span> },
    { key: 'votes', header: t('console.people.cols.votes'), numeric: true, cell: (p) => p.votes_cast },
    {
      key: 'status',
      header: t('console.people.cols.status'),
      cell: (p) => {
        const status = statusOf(p)
        return <span className={status === 'active' ? 'adm-tag adm-tag-ok' : 'adm-tag adm-tag-bad'}>{t(`console.people.status.${status}`)}</span>
      },
    },
  ]

  if (loading) return <p className="adm-muted">{t('common:loading')}</p>
  if (error) return <p className="adm-err">{error}</p>

  return (
    <>
      <header className="adm-head">
        <div>
          <h1 className="adm-h1">{t('console.people.title')}</h1>
          <p className="adm-lede">{t('console.people.lede')}</p>
        </div>
        {isOwner && (
          <button type="button" className="adm-btn" aria-expanded={roster} onClick={() => setRoster(!roster)}>
            {t('console.people.admins', { count: adminCount ?? 0 })}
          </button>
        )}
      </header>
      {roster && <AdminRosterSection isOwner={isOwner} />}

      <ListToolbar
        label={t('console.people.toolbar')}
        search={{ value: search, onChange: setSearch, placeholder: t('console.people.searchPlaceholder'), label: t('console.people.searchLabel') }}
        segments={SEGMENTS.map((key) => ({ key, label: t(`console.people.segments.${key}`), count: people.filter(IN[key]).length }))}
        active={segment}
        onSegment={(key) => setSegment(key as Segment)}
      />

      <div className="adm-split">
        <div className="adm-card adm-split-main">
          <ListTable
            columns={columns}
            rows={people.filter(IN[segment])}
            rowKey={(p) => p.id}
            selectedKey={selectedId}
            onOpen={(p) => open(p.id)}
            empty={t('console.people.empty')}
          />
        </div>
        {selected && <PersonPanel key={selected.id} person={selected} onChanged={refresh} onClose={() => open(null)} />}
      </div>
    </>
  )
}

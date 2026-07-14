import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { listTasks, type TaskOut } from '../api/tasks'
import { createPraxis } from '../api/praxis'
import { getFactions, type FactionOut } from '../api/factions'
import { getGameConfig, type FactionConfigOut } from '../api/gameConfig'
import TaskCard from '../components/TaskCard'
import PageTitle from '../components/ui/PageTitle'
import FilterStamps from '../components/ui/FilterStamps'
import FilterFactionTabs from '../components/ui/FilterFactionTabs'
import FilterLevelNodes from '../components/ui/FilterLevelNodes'
import { extractError } from '../utils/errors'
import { useAuth } from '../auth/AuthContext'
import { computeDisplayPoints } from '../utils/points'

const LEVEL_FILTERS = [0, 1, 2, 3, 4, 5]

export default function Tasks() {
  const { t } = useTranslation('tasks')
  const { t: tc } = useTranslation('common')
  const { user } = useAuth()
  const navigate = useNavigate()
  const characterId = user?.character?.id

  const [tasks, setTasks] = useState<TaskOut[]>([])
  const [factions, setFactions] = useState<FactionOut[]>([])
  const [factionConfigs, setFactionConfigs] = useState<FactionConfigOut[]>([])
  const [status, setStatus] = useState('All')
  const [faction, setFaction] = useState('')
  const [level, setLevel] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [signupMsg, setSignupMsg] = useState<{ id: number; msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    getFactions().then(setFactions).catch(() => {})
    getGameConfig()
      .then((config) => setFactionConfigs(config.factions))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setFetchError(null)
    listTasks({
      status: status === 'All' ? undefined : status,
      faction: faction || undefined,
      level: level === '' ? undefined : level,
      exclude_character_id: characterId,
    })
      .then(setTasks)
      .catch((err) => setFetchError(extractError(err, "Couldn't load tasks.")))
      .finally(() => setLoading(false))
  }, [status, faction, level, characterId])

  const handleSignup = async (id: number) => {
    setSignupMsg(null)
    try {
      const praxis = await createPraxis({ task_id: id, type: 'solo' })
      navigate(`/praxes/${praxis.id}/edit`)
    } catch (err) {
      setSignupMsg({ id, msg: extractError(err, 'Could not sign up — make sure you are logged in.'), ok: false })
    }
  }

  const statusFilters = ['All', 'active']
  if (user?.can_see_retired_tasks) statusFilters.push('retired')
  if (user?.can_see_pending_tasks) statusFilters.push('pending')

  return (
    <div className="py-8">
      <PageTitle title="Tasks" eyebrow={`${tasks.length} shown`} />

      {/* Filters (Style Guide §5.3) */}
      <div className="flex flex-col gap-2.5 mb-6">
        <FilterStamps options={statusFilters} value={status} onChange={setStatus} />
        <FilterFactionTabs factions={factions} value={faction} onChange={setFaction} />
        <FilterLevelNodes levels={LEVEL_FILTERS} value={level} onChange={setLevel} />
      </div>

      {signupMsg && (
        <p className={`font-body text-sm mb-4 border-2 px-3 py-2 ${signupMsg.ok ? 'border-border text-ink' : 'border-red-300 text-red-600'}`}>
          {signupMsg.msg}
        </p>
      )}

      {loading ? (
        <p className="font-body text-muted">{t('listPage.loading')}</p>
      ) : fetchError ? (
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
          {fetchError}{' '}
          <button onClick={() => window.location.reload()} className="underline">{tc('states.tryRefreshing')}</button>
        </p>
      ) : tasks.length === 0 ? (
        <p className="font-body text-muted">{t('listPage.empty')}</p>
      ) : (
        /* Flex-wrap container — NOT a grid. Varied card sizes and rotations are intentional (Style Guide §6). */
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              displayPoints={computeDisplayPoints(
                task.point_value,
                user?.character?.faction_slug,
                task.primary_faction_slug,
                factionConfigs,
              )}
              onSignup={user && task.can_submit_praxis ? handleSignup : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}

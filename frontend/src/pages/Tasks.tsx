import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listTasks, signupTask, type TaskOut } from '../api/tasks'
import { getFactions, type FactionOut } from '../api/factions'
import TaskCard from '../components/TaskCard'
import PageTitle from '../components/ui/PageTitle'
import FilterStamps from '../components/ui/FilterStamps'
import FilterFactionTabs from '../components/ui/FilterFactionTabs'
import FilterLevelNodes from '../components/ui/FilterLevelNodes'
import { extractError } from '../utils/errors'
import { useAuth } from '../auth/AuthContext'

const LEVEL_FILTERS = [0, 1, 2, 3, 4, 5]

export default function Tasks() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const characterLevel = user?.character?.level ?? 0
  const characterId = user?.character?.id

  const [tasks, setTasks] = useState<TaskOut[]>([])
  const [factions, setFactions] = useState<FactionOut[]>([])
  const [status, setStatus] = useState('All')
  const [faction, setFaction] = useState('')
  const [level, setLevel] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [signupMsg, setSignupMsg] = useState<{ id: number; msg: string; ok: boolean } | null>(null)

  // Fetch factions once for filter tabs
  useEffect(() => {
    getFactions().then(setFactions).catch(() => {})
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
      await signupTask(id)
      navigate(`/tasks/${id}/submit`)
    } catch (err) {
      setSignupMsg({ id, msg: extractError(err, 'Could not sign up — make sure you are logged in.'), ok: false })
    }
  }

  // Build status filters based on character level
  const statusFilters = ['All', 'active']
  if (characterLevel >= 2) statusFilters.push('retired')
  if (characterLevel >= 3) statusFilters.push('pending')

  return (
    <div className="py-8">
      <PageTitle title="Tasks" eyebrow={`${tasks.length} shown`} />

      {/* Filters — three distinct visual types (Style Guide §5.3) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
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
        <p className="font-body text-muted">Loading tasks...</p>
      ) : fetchError ? (
        <p className="font-body text-sm text-red-600 border-2 border-red-300 px-3 py-2">
          {fetchError}{' '}
          <button onClick={() => window.location.reload()} className="underline">Try refreshing.</button>
        </p>
      ) : tasks.length === 0 ? (
        <p className="font-body text-muted">No tasks match your filters.</p>
      ) : (
        /* Flex-wrap container — NOT a grid. Varied card sizes and rotations are intentional (Style Guide §6). */
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} onSignup={user && characterLevel >= t.level_required ? handleSignup : undefined} />
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listTasks, signupTask, type TaskOut } from '../api/tasks'
import { getFactions, type FactionOut } from '../api/factions'
import { getGameConfig, type FactionConfigOut } from '../api/gameConfig'
import { getMetaTasks, type MetaTaskOut } from '../api/metaTasks'
import TaskCard from '../components/TaskCard'
import PageTitle from '../components/ui/PageTitle'
import FilterStamps from '../components/ui/FilterStamps'
import FilterFactionTabs from '../components/ui/FilterFactionTabs'
import FilterLevelNodes from '../components/ui/FilterLevelNodes'
import LevelPill from '../components/ui/LevelPill'
import { extractError } from '../utils/errors'
import { useAuth } from '../auth/AuthContext'
import { computeDisplayPoints } from '../utils/points'
import { factionColor, factionName } from '../utils/factions'

const LEVEL_FILTERS = [0, 1, 2, 3, 4, 5]

export default function Tasks() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const characterLevel = user?.character?.level ?? 0
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
  const [showMetaTasks, setShowMetaTasks] = useState(false)
  const [metaTaskList, setMetaTaskList] = useState<MetaTaskOut[]>([])
  const [metaTasksLoading, setMetaTasksLoading] = useState(false)

  // Fetch factions (filter tabs) and game config (faction modifiers) once
  useEffect(() => {
    getFactions().then(setFactions).catch(() => {})
    getGameConfig()
      .then((config) => setFactionConfigs(config.factions))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!showMetaTasks) return
    setMetaTasksLoading(true)
    getMetaTasks()
      .then(setMetaTaskList)
      .catch(() => setMetaTaskList([]))
      .finally(() => setMetaTasksLoading(false))
  }, [showMetaTasks])

  useEffect(() => {
    if (showMetaTasks) return
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
  }, [status, faction, level, characterId, showMetaTasks])

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

  // Client-side filter for meta tasks (faction + level)
  const visibleMetaTasks = metaTaskList.filter((mt) => {
    if (faction && mt.faction_slug !== faction) return false
    if (level !== '' && mt.level_required < level) return false
    return true
  })

  return (
    <div className="py-8">
      <PageTitle
        title="Tasks"
        eyebrow={showMetaTasks ? `${visibleMetaTasks.length} meta tasks` : `${tasks.length} shown`}
      />

      {/* Filters — three distinct visual types (Style Guide §5.3) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        {!showMetaTasks && (
          <FilterStamps options={statusFilters} value={status} onChange={setStatus} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <FilterFactionTabs factions={factions} value={faction} onChange={setFaction} />
          <button
            type="button"
            onClick={() => setShowMetaTasks((v) => !v)}
            style={{
              fontFamily: "'Courier Prime', monospace",
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.1em', padding: '4px 12px',
              background: showMetaTasks ? '#15803d' : 'transparent',
              color: showMetaTasks ? '#fff' : 'var(--color-text-tertiary)',
              border: `1.5px solid ${showMetaTasks ? '#15803d' : 'var(--color-border)'}`,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Meta Tasks
          </button>
        </div>
        <FilterLevelNodes levels={LEVEL_FILTERS} value={level} onChange={setLevel} />
      </div>

      {signupMsg && (
        <p className={`font-body text-sm mb-4 border-2 px-3 py-2 ${signupMsg.ok ? 'border-border text-ink' : 'border-red-300 text-red-600'}`}>
          {signupMsg.msg}
        </p>
      )}

      {showMetaTasks ? (
        metaTasksLoading ? (
          <p className="font-body text-muted">Loading meta tasks...</p>
        ) : visibleMetaTasks.length === 0 ? (
          <p className="font-body text-muted">No meta tasks match your filters.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
            {visibleMetaTasks.map((mt) => {
              const mtColor = factionColor(mt.faction_slug)
              return (
                <div
                  key={mt.id}
                  className="sidebar-card"
                  style={{
                    borderLeft: `4px solid ${mtColor}`,
                    padding: '16px 18px',
                    minWidth: 220, maxWidth: 320, flex: '1 1 220px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span
                      style={{
                        clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)',
                        background: mtColor, color: 'white',
                        fontFamily: "'Courier Prime', monospace",
                        fontSize: 8, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.07em', padding: '2px 10px',
                      }}
                    >
                      {factionName(mt.faction_slug)}
                    </span>
                    {mt.level_required > 0 && <LevelPill level={mt.level_required} />}
                  </div>
                  <p className="font-body" style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                    {mt.name}
                  </p>
                  <p className="font-body" style={{ fontSize: 10, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>
                    {mt.description}
                  </p>
                  <span
                    style={{
                      fontFamily: "'Courier Prime', monospace",
                      fontSize: 11, fontWeight: 700, color: '#15803d',
                    }}
                  >
                    +{mt.bonus_value} pts bonus
                  </span>
                </div>
              )
            })}
          </div>
        )
      ) : loading ? (
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
              onSignup={user && characterLevel >= task.level_required ? handleSignup : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}

import { useTranslation } from 'react-i18next'
import TaskCard from '../../components/taskCard/TaskCard'
import type { LevelProfile } from '../../api/gameConfig'
import type { TaskOut } from '../../api/tasks'
import { useGameConfig } from '../../hooks/useGameConfig'
import Wisp from './Wisp'
import { hatForName } from './hatForName'
import './arrival.css'

const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  background: `var(--faction-default-stop-${(i % 7) + 1})`,
  ['--fx' as string]: `${((i * 53) % 120) - 60}px`,
  ['--fr' as string]: `${((i * 97) % 720) - 360}deg`,
  ['--fd' as string]: `${(2.2 + (i % 5) * 0.35).toFixed(2)}s`,
  ['--fdl' as string]: `${((i % 9) * 0.08).toFixed(2)}s`,
}))

/** The first ranked level is the one the first task leads to; its threshold over the task's points is the praxis count. Both come from the era, never a literal. */
export function firstLevelAway(profiles: LevelProfile[], thresholds: number[], points: number) {
  const level = profiles.findIndex((p, i) => i > 0 && p.rank_key !== '')
  if (level < 1 || !(thresholds[level] > 0) || !(points > 0)) return null
  return { level, count: Math.ceil(thresholds[level] / points) }
}

/** Step `arrival`: shown once, after creating here. The card only links; nothing is claimed. */
export default function Arrival({ name, task, onBack }: { name: string; task: TaskOut; onBack?: () => void }) {
  const { t } = useTranslation('onboarding')
  const config = useGameConfig()
  const away = config && firstLevelAway(config.level_profiles, config.level_thresholds, task.point_value)
  const delay = (s: number) => ({ animationDelay: `${s}s` })
  return (
    <main className="ar-arrival">
      {CONFETTI.map((style, i) => (
        <span key={i} aria-hidden="true" className="ar-conf" style={style} />
      ))}
      <span className="ob-cap boing" style={delay(0.2)}>
        {t('arrival.registered')}
      </span>
      <h1 className="ob-lora boing ar-h" style={delay(0.5)}>
        {t('arrival.entered', { name })}
      </h1>
      <span className="ob-srule ob-draw ar-rule" style={delay(0.9)} />
      <div className="ar-card">
        <span aria-hidden="true" className="boing ar-wisp" style={delay(2.3)}>
          <span className="jump">
            <Wisp size={48} confidence={1} hat={hatForName(name)} className="shy" />
          </span>
        </span>
        <div className="toss" style={delay(1.4)}>
          <TaskCard task={task} basePoints={task.point_value} />
        </div>
      </div>
      <p className="boing ar-line" style={delay(2.8)}>
        {t('arrival.firstTask')} {away && t('arrival.levelAway', { level: away.level, count: away.count })}
      </p>
      {onBack && (
        <span className="boing ar-nav" style={delay(3.4)}>
          <button type="button" className="ob-ghost ob-cap ob-bk" onClick={onBack}>
            {t('flow.back')}
          </button>
        </span>
      )}
    </main>
  )
}

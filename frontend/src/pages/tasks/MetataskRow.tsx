import { useTranslation } from 'react-i18next'
import type { TaskOut } from '../../api/tasks'
import { factionCssVar, factionName } from '../../utils/factions'

/**
 * Shared compact metatask row (#934). Metatasks are informational — they're
 * applied to a praxis through the picker, never signed up for — so this row
 * carries NO sign-up CTA. It's dressed in the ISSUING faction's tint
 * (`metatask_faction_slug`), not a primary-faction card archetype: a metatask
 * belongs to whichever faction set the condition. Rendered verbatim by the
 * desktop browse grid and every mobile skin while the Task/Metatask toggle sits
 * in Metatask mode. A drop-in for the richer MetaTaskSeal (#928) once it lands.
 */
export default function MetataskRow({ task, points }: { task: TaskOut; points: number }) {
  const { t } = useTranslation('tasks')
  const slug = task.metatask_faction_slug
  const accent = factionCssVar(slug)
  return (
    <div
      className="w-full flex flex-col gap-2 p-4 bg-surface"
      style={{
        borderLeft: `4px solid ${accent}`,
        borderTop: '1px solid var(--color-border)',
        borderRight: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <span className="eyebrow inline-flex items-center gap-1.5" style={{ color: accent }}>
        <i
          className="inline-block"
          style={{ width: 8, height: 8, borderRadius: 2, background: accent }}
        />
        {t('metatask.eyebrow', { faction: factionName(slug) })}
      </span>

      <h2 className="font-display italic font-medium text-wz-2xl leading-tight text-ink">
        {task.title}
      </h2>

      {task.description && (
        <p className="card-description font-body text-muted">{task.description}</p>
      )}

      <div className="flex items-center gap-3">
        <span className="font-body font-bold text-wz-lg text-ink bg-surface-alt border border-border px-2 py-0.5">
          {t('mobile.points', { points })}
        </span>
        <span className="eyebrow text-tertiary">
          {t('mobile.level', { level: task.level_required })}
        </span>
      </div>
    </div>
  )
}

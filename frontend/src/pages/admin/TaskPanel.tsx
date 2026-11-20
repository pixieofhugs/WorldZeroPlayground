import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { adminPatchTask, updateTaskStatus, type AdminTaskStatus } from '../../api/admin'
import { extractError } from '../../utils/errors'
import TaskStatusControl from '../../components/admin/TaskStatusControl'
import { SidePanel } from './AdminList'
import TaskDeleteConfirm from './TaskDeleteConfirm'
import { requestTaskDelete } from './taskDelete'
import type { AdminTaskRow } from './adminTaskRows'

// Text presentation selector: bare U+2197 renders as an emoji on iOS (#1702).
const ARROW = ' \u2197\uFE0E'
const TAG = { wait: 'adm-tag adm-tag-wait', ok: 'adm-tag adm-tag-ok', bad: 'adm-tag adm-tag-bad' }
const RESTORE_STATUSES = ['pending', 'active', 'retired'] as const

/** A proposal's panel warning: the window and the level come from `/game-config`, never literals. */
export interface ProposalWindow {
  hours: number
  level: number
}

interface Props {
  task: AdminTaskRow
  factions: { slug: string; label: string }[]
  /** Hours left, or null when the era config has not loaded. */
  proposal: (ProposalWindow & { left: number }) | null
  onChanged: () => void
  onDeleted: (id: number) => void
  onClose: () => void
}

export default function TaskPanel({ task, factions, proposal, onChanged, onDeleted, onClose }: Props) {
  const { t } = useTranslation('admin')
  const [form, setForm] = useState({
    title: task.title,
    description: task.description,
    points: String(task.point_value),
    level: String(task.level_required),
    faction: task.primary_faction_slug,
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const dirty =
    form.title !== task.title ||
    form.description !== task.description ||
    form.points !== String(task.point_value) ||
    form.level !== String(task.level_required) ||
    form.faction !== task.primary_faction_slug
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [key]: e.target.value })

  /** Edits first, then the status: both choices keep what was typed. */
  const save = async (next?: AdminTaskStatus) => {
    setBusy(true)
    setError(null)
    try {
      if (dirty) {
        await adminPatchTask(task.id, {
          title: form.title || undefined,
          description: form.description,
          point_value: form.points !== '' ? Number(form.points) : undefined,
          level_required: form.level !== '' ? Number(form.level) : undefined,
          primary_faction_slug: form.faction || undefined,
        })
      }
      if (next) await updateTaskStatus(task.id, next)
      onChanged()
    } catch (err) {
      setError(extractError(err, next ? t('tasks.statusError') : t('tasks.saveError')))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setDeleteError(null)
    const refusal = await requestTaskDelete(task.id, t('tasks.deleteError'))
    setBusy(false)
    if (refusal) setDeleteError(refusal)
    else onDeleted(task.id)
  }

  const pending = task.status === 'pending'
  const tone = pending ? 'wait' : task.status === 'active' ? 'ok' : 'bad'

  return (
    <SidePanel
      label={t('console.tasks.panel.label')}
      badge={
        <span className={TAG[tone]}>
          {pending ? t('console.tasks.panel.proposal') : t(`tasks.status.${task.status}`)}
        </span>
      }
      actions={
        <Link to={`/tasks/${task.id}`} className="adm-btn">
          {t('console.tasks.panel.viewOnSite')}
          {ARROW}
        </Link>
      }
      onClose={onClose}
    >
      {pending && proposal && (
        <p className="adm-warn">
          {proposal.left > 0
            ? t('console.tasks.panel.warn', { level: proposal.level, hours: proposal.left })
            : t('console.tasks.panel.warnPublic', { level: proposal.level })}
        </p>
      )}
      <label className="adm-field">
        {t('console.tasks.panel.title')}
        <input className="adm-input" value={form.title} onChange={set('title')} />
      </label>
      <label className="adm-field">
        {t('console.tasks.panel.description')}
        <textarea className="adm-input adm-textarea" value={form.description} onChange={set('description')} />
      </label>
      <div className="adm-fields3">
        <label className="adm-field">
          {t('tasks.pointsLabel')}
          <input className="adm-input" type="number" min={1} value={form.points} onChange={set('points')} />
        </label>
        <label className="adm-field">
          {t('console.tasks.panel.level')}
          <input className="adm-input" type="number" min={0} max={8} value={form.level} onChange={set('level')} />
        </label>
        {factions.length > 0 && (
          <label className="adm-field">
            {t('tasks.factionLabel')}
            <select className="adm-input" value={form.faction} onChange={set('faction')}>
              {factions.map((f) => (
                <option key={f.slug} value={f.slug}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {pending && task.notes && (
        <label className="adm-field">
          {t('console.tasks.panel.note')}
          <textarea className="adm-input adm-textarea" readOnly value={task.notes} />
        </label>
      )}
      {error && <p className="adm-err">{error}</p>}
      {confirmDelete ? (
        <TaskDeleteConfirm
          title={task.title}
          deleting={busy}
          error={deleteError}
          onConfirm={() => void remove()}
          onCancel={() => setConfirmDelete(false)}
        />
      ) : (
        <>
          <div className="adm-btns" aria-busy={busy}>
            {task.status === 'deleted' ? (
              RESTORE_STATUSES.map((s) => (
                <button key={s} type="button" className="adm-btn" onClick={() => void save(s)}>
                  {t('tasks.actions.restoreAs', { status: t(`tasks.status.${s}`) })}
                </button>
              ))
            ) : (
              <TaskStatusControl status={task.status} variant="panel" onChange={(next) => void save(next)} />
            )}
            {dirty && task.status !== 'deleted' && (
              <button type="button" className="adm-btn" disabled={busy} onClick={() => void save()}>
                {busy ? t('tasks.actions.saving') : t('tasks.actions.save')}
              </button>
            )}
          </div>
          <p className="adm-muted">{t('console.tasks.panel.hint')}</p>
          {task.status !== 'deleted' && (
            <button type="button" className="adm-btn adm-btn-dng" onClick={() => setConfirmDelete(true)}>
              {t('tasks.actions.delete')}
            </button>
          )}
        </>
      )}
    </SidePanel>
  )
}

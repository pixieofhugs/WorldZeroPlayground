import { useState } from 'react'
import { useTranslation } from 'react-i18next'
// Type-only: TaskCard is eager, so this file must not reach api/admin (#1141).
import type { AdminTaskStatus } from '../../api/admin'
import { extractError } from '../../utils/errors'
import { fromLocalInput, toLocalInput, type BackdoorWindow } from './backdoorWindow'

/** The task status buttons, mounted by TaskCard in mod mode and by the console task panel (#3667). */
export default function TaskStatusControl({
  status,
  variant,
  opensAt,
  closesAt,
  onChange,
}: {
  status: string
  /** `strip` is the card's caption-sized strip; `panel` the console's 44px buttons. */
  variant: 'strip' | 'panel'
  /** A backdoor task's schedule, so the control can say when the door opens or closes. */
  opensAt?: string | null
  closesAt?: string | null
  /** A rejection is shown here as a readable message. */
  onChange: (next: AdminTaskStatus, window?: BackdoorWindow) => void | Promise<void>
}) {
  const { t } = useTranslation('admin')
  const [confirming, setConfirming] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [opens, setOpens] = useState(() => toLocalInput(new Date().toISOString()))
  const [closes, setCloses] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isBackdoor = status === 'backdoor'
  const activate = status === 'pending' || status === 'retired' || isBackdoor
  const retire = status === 'pending' || status === 'active' || isBackdoor
  const schedule = status === 'pending' || status === 'active' || status === 'retired'
  if (!activate && !retire) return null

  const button = (label: string, tone: 'danger' | 'success', onClick: () => void) =>
    variant === 'panel' ? (
      <button type="button" className={tone === 'success' ? 'adm-btn adm-btn-pri' : 'adm-btn adm-btn-dng'} onClick={onClick}>
        {label}
      </button>
    ) : (
      <button
        type="button"
        className="label-caption"
        onClick={onClick}
        style={{
          padding: 'var(--space-xs) var(--space-sm)',
          border: `1px solid color-mix(in srgb, var(--color-${tone}) 30%, transparent)`,
          color: `var(--color-${tone})`,
          background: 'var(--color-surface-scrim)',
          cursor: 'pointer',
        }}
      >
        {label}
      </button>
    )

  if (scheduling) {
    const submit = async () => {
      setError(null)
      try {
        await onChange('backdoor', { opens: fromLocalInput(opens), closes: fromLocalInput(closes) })
        setScheduling(false)
      } catch (err) {
        setError(extractError(err, t('tasks.statusError')))
      }
    }
    return (
      <>
        <label className="adm-field">
          {t('tasks.backdoor.opens')}
          <input className="adm-input" type="datetime-local" value={opens} onChange={(e) => setOpens(e.target.value)} />
        </label>
        <label className="adm-field">
          {t('tasks.backdoor.closes')}
          <input className="adm-input" type="datetime-local" value={closes} onChange={(e) => setCloses(e.target.value)} />
        </label>
        {error && <p role="alert" className="adm-err">{error}</p>}
        {button(t('tasks.backdoor.submit'), 'success', () => void submit())}
        {button(t('tasks.backdoor.cancel'), 'danger', () => setScheduling(false))}
      </>
    )
  }

  if (confirming) {
    return (
      <>
        {button(t('tasks.actions.confirmRetire'), 'danger', () => {
          setConfirming(false)
          onChange('retired')
        })}
        {button(t('tasks.actions.keep'), 'success', () => setConfirming(false))}
      </>
    )
  }
  const opensInFuture = opensAt ? Date.parse(opensAt) > Date.now() : false
  const when = (iso: string) => new Date(iso).toLocaleString()
  return (
    <>
      {isBackdoor && opensAt && (
        <p className="adm-muted">
          {opensInFuture
            ? t('tasks.backdoor.opensOn', { when: when(opensAt) })
            : closesAt
              ? t('tasks.backdoor.closesOn', { when: when(closesAt) })
              : t('tasks.backdoor.openNoClose')}
        </p>
      )}
      {schedule && button(t('tasks.actions.backdoor'), 'success', () => setScheduling(true))}
      {activate && button(t('tasks.actions.activate'), 'success', () => onChange('active'))}
      {retire && button(t('tasks.actions.retire'), 'danger', () => setConfirming(true))}
    </>
  )
}

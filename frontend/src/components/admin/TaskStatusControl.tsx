import { useState } from 'react'
import { useTranslation } from 'react-i18next'
// Type-only: TaskCard is eager, so this file must not reach api/admin (#1141).
import type { AdminTaskStatus } from '../../api/admin'

/** The task status buttons, mounted by TaskCard in mod mode and by the console task panel (#3667). */
export default function TaskStatusControl({
  status,
  variant,
  onChange,
}: {
  status: string
  /** `strip` is the card's caption-sized strip; `panel` the console's 44px buttons. */
  variant: 'strip' | 'panel'
  onChange: (next: AdminTaskStatus) => void
}) {
  const { t } = useTranslation('admin')
  const [confirming, setConfirming] = useState(false)

  const activate = status === 'pending' || status === 'retired'
  const retire = status === 'pending' || status === 'active'
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
  return (
    <>
      {activate && button(t('tasks.actions.activate'), 'success', () => onChange('active'))}
      {retire && button(t('tasks.actions.retire'), 'danger', () => setConfirming(true))}
    </>
  )
}

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  open: boolean
  sort: string
  onSelect: (sort: string) => void
  onClose: () => void
}

/**
 * Minimal self-contained bottom sheet for the mobile Tasks sort control.
 * There is no shared bottom-sheet component in this repo yet, so this follows
 * the same self-contained-backdrop pattern as LevelUpPopup: fixed overlay,
 * dismiss on backdrop tap or Escape. Offers the two sort states listTasks()
 * already understands (default level/points vs 'newest' — api/tasks.ts).
 */
export default function SortSheet({ open, sort, onSelect, onClose }: Props) {
  const { t } = useTranslation('tasks')

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const options: { value: string; label: string }[] = [
    { value: '', label: t('mobile.sortSheet.default') },
    { value: 'newest', label: t('mobile.sortSheet.newest') },
  ]

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        background: 'var(--color-surface-scrim)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          background: 'var(--color-bg-page)',
          borderTop: '1px solid var(--color-border)',
          borderTopLeftRadius: 'var(--radius-xl)',
          borderTopRightRadius: 'var(--radius-xl)',
          padding: '18px 18px 28px',
        }}
      >
        <div className="eyebrow mb-3">{t('mobile.sortSheet.heading')}</div>
        <div className="flex flex-col gap-1">
          {options.map((option) => {
            const active = sort === option.value
            return (
              <button
                key={option.value || 'default'}
                onClick={() => {
                  onSelect(option.value)
                  onClose()
                }}
                className="font-body"
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  border: 'none',
                  background: active ? 'var(--color-text-primary)' : 'transparent',
                  color: active ? 'var(--color-bg-page)' : 'var(--color-text-primary)',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

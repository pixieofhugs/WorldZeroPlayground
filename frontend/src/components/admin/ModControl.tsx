import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAdminMode } from '../../auth/AdminModeContext'
import { useAdminCounts } from '../../pages/admin/useAdminCounts'
import './modMode.css'

/** The one MOD control in the top bar (#3666). NavBar lazy-loads it for admins only, so players never fetch this chunk or the counts. */
export default function ModControl() {
  const { t } = useTranslation('common')
  const { adminMode, toggleAdminMode } = useAdminMode()
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  // Re-read each time the menu opens: these are obligations, not a cache.
  const counts = useAdminCounts(String(open))
  const total = (counts.reports ?? 0) + (counts.messages ?? 0) + (counts.proposals ?? 0)

  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) button.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    wrap.current?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus()
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) return
    if (e.key === 'Escape') return close()
    if (e.key === 'Tab') return close(false)
    const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const items = [...wrap.current!.querySelectorAll<HTMLElement>('[role^="menuitem"]')]
    const at = items.indexOf(document.activeElement as HTMLElement)
    items[(at + step + items.length) % items.length]?.focus()
  }

  const rows = [
    ['reports', t('nav.mod.reports'), counts.reports],
    ['messages', t('nav.mod.messages'), counts.messages],
    ['proposals', t('nav.mod.proposals'), counts.proposals],
  ] as const

  return (
    <div ref={wrap} className="mod-wrap" data-modal-free onKeyDown={onKeyDown}>
      <button
        ref={button}
        type="button"
        className="mod-btn"
        data-on={adminMode}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={total > 0 ? t('nav.mod.buttonWithCount', { count: total }) : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {t('nav.mod.label')}
        {total > 0 && (
          <span className="mod-ct" aria-hidden="true">
            {total}
          </span>
        )}
      </button>
      {open && (
        <div role="menu" aria-label={t('nav.mod.label')} className="mod-menu">
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={adminMode}
            className="mod-item"
            onClick={toggleAdminMode}
          >
            <span className="mod-item-text">
              <span className="mod-item-title">{t('nav.mod.edit')}</span>
              <span className="mod-item-hint">{t('nav.mod.editHint')}</span>
            </span>
            <span className="mod-switch" aria-hidden="true" />
          </button>
          <hr className="mod-rule" />
          <Link to="/admin" role="menuitem" className="mod-item" onClick={() => setOpen(false)} style={{ flexDirection: 'column' }}>
            <span className="mod-item-title">{t('nav.mod.open')}</span>
            <span className="mod-counts">
              {rows.map(([key, label, n]) => (
                <span key={key} style={{ display: 'contents' }}>
                  <span>{label}</span>
                  <b>{n ?? '–'}</b>
                </span>
              ))}
            </span>
          </Link>
        </div>
      )}
    </div>
  )
}

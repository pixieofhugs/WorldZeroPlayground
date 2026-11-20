import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAdminMode } from '../../auth/AdminModeContext'
import { drawAtRoot } from '../ui/drawAtRoot'
import CopyEditor from './CopyEditor'
import './modMode.css'

/** The accent frame and the status strip while mod mode is on; the copy editor lives in the strip. Mounted by `App.tsx` for admins in mod mode only. */
export default function ModStrip() {
  const { t } = useTranslation('common')
  const { toggleAdminMode } = useAdminMode()

  // The strip is fixed; publish its height so the page and the sticky nav clear it.
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.mod-strip')
    const root = document.documentElement
    root.dataset.modStrip = ''
    const set = () => root.style.setProperty('--modstrip-h', `${el?.offsetHeight ?? 0}px`)
    set()
    const ro = typeof ResizeObserver === 'undefined' || !el ? null : new ResizeObserver(set)
    if (el) ro?.observe(el)
    return () => {
      ro?.disconnect()
      delete root.dataset.modStrip
      root.style.removeProperty('--modstrip-h')
    }
  }, [])

  return drawAtRoot(
    <>
      <div className="mod-frame" aria-hidden="true" />
      <div className="mod-strip" data-modal-free>
        <span role="status">{t('nav.mod.stripText')}</span>
        <button type="button" onClick={toggleAdminMode} className="label-caption">
          {t('nav.mod.turnOff')}
        </button>
        <CopyEditor />
      </div>
    </>,
  )
}

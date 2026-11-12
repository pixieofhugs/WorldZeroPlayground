import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { exportMyData } from '../../../api/me'
import type { SettingsSectionProps } from '../../Settings'
import SettingsCard from '../SettingsCard'
import SettingsRow from '../SettingsRow'

/**
 * Your data (#2158): one button downloading the player's whole record.
 *
 * No queued/"preparing" state: owner ruling (2026-08-17) is that `GET /me/export`
 * builds synchronously, so nothing is stored to remember. `working` lasts one
 * request. The copy omits "notification history" (it does not exist) and warns
 * that past `data_export.MEDIA_CEILING_BYTES` media is linked, not embedded.
 */

/**
 * Via a Blob, not `<a href>`: the cookie-authed API is cross-origin, where
 * `download` is ignored. The app's only download, so inline.
 */
function saveBlob(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.click()
  // Deferred: Safari reads `href` after the click; revoking now cancels it.
  setTimeout(() => URL.revokeObjectURL(href), 0)
}

export default function DataSection({ sectionId }: SettingsSectionProps) {
  const { t } = useTranslation('common')
  const [working, setWorking] = useState(false)
  const [failed, setFailed] = useState(false)

  const download = async () => {
    setWorking(true)
    setFailed(false)
    try {
      const { blob, filename } = await exportMyData()
      saveBlob(blob, filename)
    } catch {
      // The only actionable failure is "press it again"; a 401 already redirected.
      setFailed(true)
    } finally {
      setWorking(false)
    }
  }

  const noteId = `${sectionId}-export-note`

  return (
    <SettingsCard
      sectionId={sectionId}
      title={t('settings.data.eyebrow')}
      lead={t('settings.data.lead')}
    >
      <SettingsRow
        last
        title={t('settings.data.export.title')}
        note={failed ? t('settings.data.export.failed') : t('settings.data.export.note')}
        noteId={noteId}
      >
        <button
          type="button"
          onClick={download}
          disabled={working}
          aria-describedby={noteId}
          className="btn-outline shrink-0"
          style={{ borderRadius: 'var(--radius-md)' }}
          data-testid="settings-export-data"
        >
          {working ? t('settings.data.export.working') : t('settings.data.export.button')}
        </button>
      </SettingsRow>
    </SettingsCard>
  )
}

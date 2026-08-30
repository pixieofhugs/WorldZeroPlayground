import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { exportMyData } from '../../../api/me'
import type { SettingsSectionProps } from '../../Settings'
import SettingsCard from '../SettingsCard'
import SettingsRow from '../SettingsRow'

/**
 * Your data (#2158) — one button that hands the player their whole record.
 *
 * THERE IS NO "PREPARING…" STATE TO READ BACK, and that is the ruling rather
 * than an omission. The canvas draws a queued export: *"we build a zip and
 * email you a link, usually within an hour"*, with a pending state the card
 * remembers. A queue, somewhere to keep the zip, and email are three things
 * this backend does not have, so the owner ruled (2026-08-17) that
 * `GET /me/export` builds the file synchronously and the button downloads it
 * then and there. Nothing is stored, so there is nothing for this card to
 * remember between visits.
 *
 * The disabled `working` label below is NOT that pending state. It lives for
 * the length of one request and dies with it — a 200 MB archive takes a moment
 * to build, and a button that looks idle while it does reads as broken. A
 * reload during it starts over, which is exactly right for something that was
 * never queued.
 *
 * THE COPY DROPS "NOTIFICATION HISTORY". The canvas promises it; it does not
 * exist in any form, not even a table. Promising a reader a file will contain
 * something it cannot contain is the same defect as a button that does nothing.
 *
 * THE 200 MB CEILING IS NAMED IN THE COPY ON PURPOSE. Past it the archive
 * links the media rather than embedding it, and a reader who opens a zip with
 * no photos in it needs to have been told why before they downloaded it, not
 * only inside the file. The number itself lives in
 * `backend/services/data_export.MEDIA_CEILING_BYTES`; `settings.data.export.note`
 * is the other place it is written down.
 *
 * THE CARD IS UNDRESSED, like the rest of Settings (#2539): `--faction-default-*`
 * only, and the geometry is `SettingsCard`/`SettingsRow`'s — the same
 * `.btn-outline` secondary button `AccountSection` uses for the canvas'
 * `secondaryBtn`.
 */

/**
 * Hand a downloaded blob to the browser as a file.
 *
 * The bytes arrive through the app's transport (they have to — the route is
 * authenticated by an httpOnly cookie on ANOTHER origin, so a plain `<a href>`
 * would be a cross-site navigation and the `download` attribute would be
 * ignored). That leaves a `Blob` in memory and this is the standard way back
 * out of one. Inline rather than a shared util: it is the app's only download.
 */
function saveBlob(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.click()
  // Frees the blob. Deferred because Safari reads `href` after the click
  // returns, and revoking synchronously cancels the download it just started.
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
      // No error code to read: the failure a player can act on is "it did not
      // arrive, press it again", and every other outcome (401) has already
      // redirected them out of this page.
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
        help={t('settings.data.export.help')}
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

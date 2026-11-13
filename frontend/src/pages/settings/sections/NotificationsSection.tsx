import { useEffect, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { apiGet, apiPut } from '../../../api/client'
import { extractError } from '../../../utils/errors'
import type { SettingsSectionProps } from '../../Settings'
import SettingsCard from '../SettingsCard'
import SettingsRow from '../SettingsRow'
import SettingsSwitch from '../SettingsSwitch'
import {
  isLocked,
  lockNoteKey,
  masterChecked,
  rowsFor,
  saveBody,
  setAll,
  toggleCell,
  type NotificationPrefs,
  type PrefAxis,
} from '../notificationPrefs'

/**
 * Notifications (#1047): nine events, two switches each, PER ACCOUNT. Rules live
 * in `../notificationPrefs.ts` (see there for what each axis means); this file
 * is fetch, save and markup. The email-pending line is what keeps the Email
 * column honest (#1263): do NOT delete it, and do not fake a send.
 *
 * The master row doubles as the header: the only row whose cells name the columns.
 */

/** Shared cell width so rows align under the captions (wider than a switch). */
const CELL: CSSProperties = {
  width: 'var(--space-6xl)',
  display: 'flex',
  justifyContent: 'center',
}

const CELLS: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-sm)',
  flexShrink: 0,
}

const CAPTION: CSSProperties = {
  display: 'block',
  textAlign: 'center',
  marginBottom: 'var(--space-xs)',
  fontSize: 'var(--text-content)',
  color: 'var(--color-text-secondary)',
}

const PENDING_LINE: CSSProperties = {
  margin: 'var(--space-sm) 0 0',
  fontSize: 'var(--text-content)',
  lineHeight: 1.65,
  color: 'var(--color-text-tertiary)',
  maxWidth: '62ch',
}

const STATUS_LINE: CSSProperties = {
  margin: 'var(--space-lg) 0 0',
  fontSize: 'var(--text-content)',
  lineHeight: 1.6,
  color: 'var(--color-text-secondary)',
}

const AXES: readonly PrefAxis[] = ['on_updates', 'by_email']

/** Split out for the test: the section only has rows after an effect. */
export function NotificationRows({
  prefs,
  onToggle,
  onToggleAll,
}: {
  readonly prefs: NotificationPrefs
  readonly onToggle: (key: string, axis: PrefAxis) => void
  readonly onToggleAll: (axis: PrefAxis) => void
}) {
  const { t } = useTranslation('common')
  const rows = rowsFor(prefs)

  return (
    <>
      <SettingsRow
        title={t('settings.notifications.all')}
        help={t('settings.notifications.allHelp')}
      >
        <div style={CELLS}>
          {AXES.map((axis) => (
            <div key={axis}>
              <span style={CAPTION} aria-hidden>
                {t(
                  axis === 'on_updates'
                    ? 'settings.notifications.columnPage'
                    : 'settings.notifications.columnEmail',
                )}
              </span>
              <div style={CELL}>
                <SettingsSwitch
                  checked={masterChecked(prefs, axis)}
                  label={t(
                    axis === 'on_updates'
                      ? 'settings.notifications.allPageName'
                      : 'settings.notifications.allEmailName',
                  )}
                  onToggle={() => onToggleAll(axis)}
                  testId={`settings-notifications-all-${axis}`}
                />
              </div>
            </div>
          ))}
        </div>
      </SettingsRow>

      {rows.map((row, index) => {
        const pref = prefs[row.key]
        const noteKey = lockNoteKey(pref)
        const noteId = `settings-notifications-${row.key}-note`
        return (
          <SettingsRow
            key={row.key}
            last={index === rows.length - 1}
            title={t(row.titleKey)}
            help={t(row.helpKey)}
            note={noteKey ? t(noteKey) : undefined}
            noteId={noteKey ? noteId : undefined}
          >
            <div style={CELLS}>
              {AXES.map((axis) => {
                const locked = isLocked(pref, axis)
                return (
                  <div key={axis} style={CELL}>
                    <SettingsSwitch
                      checked={pref[axis]}
                      disabled={locked}
                      describedById={locked ? noteId : undefined}
                      // Name carries the column, and the reason when locked.
                      label={
                        locked && noteKey
                          ? `${t(row.titleKey)} — ${t(noteKey)}`
                          : t(
                              axis === 'on_updates'
                                ? 'settings.notifications.rowPageName'
                                : 'settings.notifications.rowEmailName',
                              { event: t(row.titleKey) },
                            )
                      }
                      onToggle={() => onToggle(row.key, axis)}
                      testId={`settings-notifications-${row.key}-${axis}`}
                    />
                  </div>
                )
              })}
            </div>
          </SettingsRow>
        )
      })}
    </>
  )
}

export default function NotificationsSection({ sectionId }: SettingsSectionProps) {
  const { t } = useTranslation('common')
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    apiGet('/me/notification-prefs')
      .then(({ data }) => {
        if (live) setPrefs(data.events)
      })
      .catch((err) => {
        if (live) setError(extractError(err, t('settings.notifications.loadError')))
      })
    return () => {
      live = false
    }
    // Deliberately empty: one locale, so `t` changing is never a reason to refetch.
  }, [])

  /** Optimistic; the server's answer then replaces state and snaps locks back. */
  async function save(next: NotificationPrefs) {
    setPrefs(next)
    setError(null)
    try {
      const { data } = await apiPut('/me/notification-prefs', { body: saveBody(next) })
      setPrefs(data.events)
    } catch (err) {
      setError(extractError(err, t('settings.notifications.saveError')))
    }
  }

  return (
    <SettingsCard
      sectionId={sectionId}
      title={t('settings.notifications.eyebrow')}
    >
      {/* Owner ruling 2026-08-31: the switch stores intent, #2164 delivers. */}
      <p style={PENDING_LINE} data-testid="settings-notifications-email-pending">
        {t('settings.notifications.emailPending')}
      </p>

      {prefs && (
        <NotificationRows
          prefs={prefs}
          onToggle={(key, axis) => void save(toggleCell(prefs, key, axis))}
          onToggleAll={(axis) => void save(setAll(prefs, axis))}
        />
      )}

      {(!prefs || error) && (
        <p
          role={error ? 'alert' : 'status'}
          style={STATUS_LINE}
          data-testid="settings-notifications-status"
        >
          {error ?? t('settings.notifications.loading')}
        </p>
      )}
    </SettingsCard>
  )
}

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
 * Notifications (#1047) — nine events, two independent switches each.
 *
 * THE TWO SWITCHES ARE NOT IN THE SAME POSITION, and the card says so.
 *
 * **"On Updates" is wired.** The server drops a switched-off type out of the
 * feed, the tab counts and the sidebar panel together. Three rows keep it
 * locked ON because they are *requests* — something is waiting on an answer
 * and the Requests queue is its only home (ADR-0070) — and one row keeps it
 * locked OFF because it has no feed row at all. Both locks explain themselves
 * on the row rather than going missing: the Cookies card ships inert switches
 * for the same reason, and an absent control states nothing.
 *
 * **"Email" stores intent only.** Nothing in `backend/` sends email — no
 * provider, no sender, no queue, no template layer — so the card carries one
 * line saying delivery is not on yet. #2164 honours what this stores when the
 * channel goes live. That line is the whole of what makes this switch honest
 * rather than the false-affordance class #1263 named; do NOT delete it, and do
 * not fake a send to "earn" it.
 *
 * PER ACCOUNT, NOT PER CHARACTER — the issue's founding sentence. Nothing here
 * reads the carried life.
 *
 * WHY THE LOGIC IS NEXT DOOR. `../notificationPrefs.ts` owns every rule: this
 * harness is `renderToStaticMarkup` with no DOM and no effects, so a rule
 * inside a click handler is a rule nothing can assert. This file is the fetch,
 * the save, and the markup.
 *
 * THE FIRST ROW IS THE HEADER. The master row is a bulk-set control (nothing
 * persists for it) AND the only place the two columns are named, which is why
 * its cells carry captions and the nine below do not: naming them nine times
 * is noise, and naming them nowhere leaves two identical switches whose
 * meaning is position.
 */

/** Both columns' cell width, header and switch alike — the one number that
 *  keeps the nine rows aligned under the captions that name them. A caption at
 *  the content floor does not fit 48px, and a cell sized to the switch alone
 *  would leave the header hanging off its column. */
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

const AXES: readonly PrefAxis[] = ['page', 'email']

/**
 * The card's rows, given state — the seam the DOM-less harness renders.
 *
 * Split out for the same reason `CookiesSection` split `StorageInventory`: the
 * section itself only has rows after an effect resolves, and an effect never
 * runs under `renderToStaticMarkup`, so a section rendered whole under test
 * would only ever prove the loading line.
 */
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
                  axis === 'page'
                    ? 'settings.notifications.columnPage'
                    : 'settings.notifications.columnEmail',
                )}
              </span>
              <div style={CELL}>
                <SettingsSwitch
                  checked={masterChecked(prefs, axis)}
                  label={t(
                    axis === 'page'
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
                      // The accessible name carries the COLUMN, because the
                      // two switches on a row are otherwise identical to a
                      // screen reader — and when it is locked it carries the
                      // reason too, which is the rule `SettingsSwitch`
                      // documents for its disabled state.
                      label={
                        locked && noteKey
                          ? `${t(row.titleKey)} — ${t(noteKey)}`
                          : t(
                              axis === 'page'
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
    // Deps are deliberately empty. `t` is the only other value read in here
    // and this app initialises one locale, so depending on it would refetch
    // the card whenever the catalog object's identity changed and never for a
    // reason a reader would recognise. `live` is the guard against the unmount
    // race that empty deps otherwise invite.
  }, [])

  /**
   * Optimistic, and deliberately: a switch that waits a round trip to move
   * reads as broken on a phone. The server's answer replaces the state when it
   * lands, which is also how a locked `page` a client tried to set snaps back
   * — the response is the authority on what was stored, not this state.
   */
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
      lead={t('settings.notifications.lead')}
    >
      {/* The line that makes the Email column honest. Owner ruling
          2026-08-31: the switch stores intent, #2164 delivers. */}
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

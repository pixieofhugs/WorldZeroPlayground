import { useEffect, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { apiGet, apiPut } from '../../../api/client'
import InstallIphoneSteps from '../../../components/install/InstallIphoneSteps'
import { useFormFactor } from '../../../hooks/useFormFactor'
import { isIphoneSafari, isStandalone } from '../../../utils/installPrompt'
import { subscribePush } from '../../../utils/pushSubscribe'
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

const AXES: readonly PrefAxis[] = ['on_updates', 'by_email', 'by_push']

/** Why Push cannot turn on, or 'ok'. Priority: server, then device, then browser. */
export type PushState = 'ok' | 'keys' | 'ios' | 'denied'

const AXIS_NAME = {
  on_updates: ['columnPage', 'allPageName', 'rowPageName'],
  by_email: ['columnEmail', 'allEmailName', 'rowEmailName'],
  by_push: ['columnPush', 'allPushName', 'rowPushName'],
} as const

const STACK_CELLS: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--space-sm)',
}

const STACK_CELL: CSSProperties = {
  width: 'var(--space-6xl)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'var(--space-xs)',
}

const PUSH_INK = 'var(--color-accent-primary)'

const BLOCKED: CSSProperties = {
  margin: 'var(--space-lg) 0 0',
  padding: 'var(--space-lg)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-sm)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
}

const BLOCKED_HEAD: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 'var(--space-lg)',
}

const BLOCKED_KICKER: CSSProperties = {
  fontSize: 'var(--text-content)',
  letterSpacing: '0.14em',
  color: 'var(--color-text-tertiary)',
}

const PUSH_NOTE_ID = 'settings-notifications-push-note'

function PushBlocked({ state }: { readonly state: Exclude<PushState, 'ok'> }) {
  const { t } = useTranslation('common')
  const [steps, setSteps] = useState(false)
  return (
    <div style={BLOCKED} data-testid="settings-notifications-push-blocked">
      <span className="font-accent" style={BLOCKED_KICKER}>
        {t(`settings.notifications.push.${state}.when`)}
      </span>
      <div style={BLOCKED_HEAD}>
        <div>
          <div className="font-display" style={{ fontSize: 'var(--text-content)', fontWeight: 600 }}>
            {t('settings.notifications.push.title')}
          </div>
          <div
            id={PUSH_NOTE_ID}
            style={{
              marginTop: 'var(--space-xs)',
              fontSize: 'var(--text-content)',
              lineHeight: 1.6,
              color: 'var(--color-text-secondary)',
            }}
          >
            {t(`settings.notifications.push.${state}.note`)}
          </div>
        </div>
        <div style={STACK_CELL}>
          <SettingsSwitch
            checked={false}
            disabled
            describedById={PUSH_NOTE_ID}
            label={t(`settings.notifications.push.${state}.label`)}
            onToggle={() => {}}
          />
          <span aria-hidden style={{ fontSize: 'var(--text-content)', color: PUSH_INK }}>
            {t('settings.notifications.columnPush')}
          </span>
        </div>
      </div>
      {state === 'ios' && (
        <>
          <button
            type="button"
            className="btn-outline"
            style={{ minHeight: 44, alignSelf: 'flex-start' }}
            aria-expanded={steps}
            onClick={() => setSteps((v) => !v)}
          >
            {t('settings.notifications.push.ios.action')}
          </button>
          {steps && <InstallIphoneSteps />}
        </>
      )}
    </div>
  )
}

/** Split out for the test: the section only has rows after an effect. */
export function NotificationRows({
  prefs,
  onToggle,
  onToggleAll,
  push = 'ok',
}: {
  readonly prefs: NotificationPrefs
  readonly onToggle: (key: string, axis: PrefAxis) => void
  readonly onToggleAll: (axis: PrefAxis) => void
  readonly push?: PushState
}) {
  const { t } = useTranslation('common')
  const rows = rowsFor(prefs)
  const stacked = useFormFactor() === 'mobile'
  const pushOff = push !== 'ok'

  /** One cell: the switch, plus its column caption when stacked (or on the master row). */
  function cell(
    axis: PrefAxis,
    props: { checked: boolean; locked: boolean; label: string; describedById?: string; onToggle: () => void; testId: string },
    caption: boolean,
  ) {
    const blocked = axis === 'by_push' && pushOff
    const [colKey] = AXIS_NAME[axis]
    return (
      <div key={axis} style={stacked ? STACK_CELL : caption ? undefined : CELL}>
        {caption && !stacked && (
          <span style={CAPTION} aria-hidden>
            {t(`settings.notifications.${colKey}`)}
          </span>
        )}
        <div style={stacked || !caption ? undefined : CELL}>
          <SettingsSwitch
            checked={blocked ? false : props.checked}
            disabled={props.locked || blocked}
            describedById={blocked ? PUSH_NOTE_ID : props.describedById}
            label={blocked ? t(`settings.notifications.push.${push}.label`) : props.label}
            onToggle={props.onToggle}
            testId={props.testId}
          />
        </div>
        {stacked && (
          <span
            aria-hidden
            style={{
              fontSize: 'var(--text-content)',
              color: axis === 'by_push' ? PUSH_INK : 'var(--color-text-secondary)',
            }}
          >
            {t(`settings.notifications.${colKey}`)}
          </span>
        )}
      </div>
    )
  }

  return (
    <>
      {pushOff && <PushBlocked state={push} />}
      <SettingsRow
        title={t('settings.notifications.all')}
        help={t('settings.notifications.allHelp')}
        stacked={stacked}
      >
        <div style={stacked ? STACK_CELLS : CELLS}>
          {AXES.map((axis) =>
            cell(
              axis,
              {
                checked: masterChecked(prefs, axis),
                locked: false,
                label: t(`settings.notifications.${AXIS_NAME[axis][1]}`),
                onToggle: () => onToggleAll(axis),
                testId: `settings-notifications-all-${axis}`,
              },
              true,
            ),
          )}
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
            stacked={stacked}
          >
            <div style={stacked ? STACK_CELLS : CELLS}>
              {AXES.map((axis) => {
                const locked = isLocked(pref, axis)
                return cell(
                  axis,
                  {
                    checked: pref[axis],
                    locked,
                    describedById: locked ? noteId : undefined,
                    // Name carries the column, and the reason when locked.
                    label:
                      locked && noteKey
                        ? `${t(row.titleKey)} — ${t(noteKey)}`
                        : t(`settings.notifications.${AXIS_NAME[axis][2]}`, {
                            event: t(row.titleKey),
                          }),
                    onToggle: () => onToggle(row.key, axis),
                    testId: `settings-notifications-${row.key}-${axis}`,
                  },
                  false,
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
  const [vapidKey, setVapidKey] = useState<string | null>(null)
  const [denied, setDenied] = useState(
    () => typeof Notification !== 'undefined' && Notification.permission === 'denied',
  )

  useEffect(() => {
    let live = true
    apiGet('/me/notification-prefs')
      .then(({ data }) => {
        if (live) {
          setPrefs(data.events)
          setVapidKey(data.vapid_public_key ?? null)
        }
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

  const push: PushState = !vapidKey
    ? 'keys'
    : isIphoneSafari() && !isStandalone()
      ? 'ios'
      : denied
        ? 'denied'
        : 'ok'

  /** The browser's yes comes first; a no leaves the switch off and shows the blocked state. */
  async function toggle(next: NotificationPrefs, turningOn: boolean) {
    if (turningOn && vapidKey) {
      try {
        if ((await subscribePush(vapidKey)) === 'denied') {
          setDenied(true)
          return
        }
      } catch (err) {
        setError(extractError(err, t('settings.notifications.saveError')))
        return
      }
    }
    await save(next)
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
          push={push}
          onToggle={(key, axis) =>
            void toggle(toggleCell(prefs, key, axis), axis === 'by_push' && !prefs[key].by_push)
          }
          onToggleAll={(axis) =>
            void toggle(setAll(prefs, axis), axis === 'by_push' && !masterChecked(prefs, axis))
          }
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

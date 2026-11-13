import { useState, type CSSProperties } from 'react'
import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import { ADMIN_MODE_STORAGE_KEY } from '../../../auth/AdminModeContext'
import { SESSION_HINT_KEY } from '../../../auth/AuthContext'
import { SEEN_INVITES_KEY_PREFIX } from '../../../components/InvitationWatcher'
import { LAST_SEEN_LEVEL_KEY_PREFIX } from '../../../components/LevelUpWatcher'
import { MOTION_STORAGE_KEY } from '../../../hooks/useMotion'
import { SIDEBAR_COLLAPSED_STORAGE_KEY } from '../../../hooks/useSidebarCollapsed'
import { SIDEBAR_PANEL_LAYOUT_STORAGE_KEY } from '../../../hooks/useSidebarPanelLayout'
import { THEME_STORAGE_KEY } from '../../../hooks/useTheme'
import { FACTION_SECTIONS, PROFILE_SECTIONS } from '../../factionDetail/sectionDisclosure'
import { ONBOARDING_HANDOFF_KEY } from '../../../utils/onboardingResume'
import type { SettingsSectionProps } from '../../Settings'
import SettingsCard from '../SettingsCard'
import SettingsRow from '../SettingsRow'
import SettingsSwitch from '../SettingsSwitch'

/**
 * Cookies and local storage (#2156) — the card IS the policy.
 *
 * The design's cookies, analytics keys and policy link do not exist: there is
 * ONE cookie and no analytics. Do not "restore" any of it from the canvas. Local
 * storage is here because ePrivacy treats it alike and it is most of what we keep.
 *
 * All three switches render inert (owner ruling 2026-08-17): a readout, not a
 * control, each with its reason in the accessible name.
 *
 * Every key is imported from its writer, never retyped;
 * `__tests__/cookiesSection.test.tsx` fails on any undisclosed writer or key.
 */

/** Keys built by suffixing an id onto a base. */
type KeyFamily = 'account' | 'character'

interface StoredEntry {
  /** The key, or a family's base. Imported. */
  readonly name: string
  /** Set when the writer appends an id. */
  readonly family?: KeyFamily
  readonly purposeKey: ParseKeys<'common'>
  /** Which store, and how long. */
  readonly whereKey: ParseKeys<'common'>
}

/** Mirrors `_COOKIE_MAX_AGE` in `backend/routers/auth.py`; the test reads it. */
export const SESSION_COOKIE_DAYS = 7

const COOKIE_WHERE = 'settings.cookies.where.cookie' as const
const BROWSER_WHERE = 'settings.cookies.where.browser' as const
const TAB_WHERE = 'settings.cookies.where.tab' as const

/** Everything World Zero puts on the reader's device. */
export const STORED_ENTRIES: readonly StoredEntry[] = [
  {
    name: 'access_token',
    purposeKey: 'settings.cookies.entries.session',
    whereKey: COOKIE_WHERE,
  },
  {
    name: THEME_STORAGE_KEY,
    purposeKey: 'settings.cookies.entries.theme',
    whereKey: BROWSER_WHERE,
  },
  {
    name: MOTION_STORAGE_KEY,
    purposeKey: 'settings.cookies.entries.motion',
    whereKey: BROWSER_WHERE,
  },
  {
    name: SESSION_HINT_KEY,
    purposeKey: 'settings.cookies.entries.sessionHint',
    whereKey: BROWSER_WHERE,
  },
  {
    name: ADMIN_MODE_STORAGE_KEY,
    purposeKey: 'settings.cookies.entries.adminMode',
    whereKey: BROWSER_WHERE,
  },
  {
    name: SIDEBAR_COLLAPSED_STORAGE_KEY,
    purposeKey: 'settings.cookies.entries.sidebarCollapsed',
    whereKey: BROWSER_WHERE,
  },
  {
    name: SIDEBAR_PANEL_LAYOUT_STORAGE_KEY,
    family: 'account',
    purposeKey: 'settings.cookies.entries.sidebarPanels',
    whereKey: BROWSER_WHERE,
  },
  {
    name: FACTION_SECTIONS.storageKey,
    family: 'account',
    purposeKey: 'settings.cookies.entries.factionSections',
    whereKey: BROWSER_WHERE,
  },
  {
    // Shares a writer with the entry above (#2958); the key census (#2989)
    // holds both.
    name: PROFILE_SECTIONS.storageKey,
    family: 'account',
    purposeKey: 'settings.cookies.entries.profileSections',
    whereKey: BROWSER_WHERE,
  },
  {
    name: SEEN_INVITES_KEY_PREFIX,
    family: 'character',
    purposeKey: 'settings.cookies.entries.seenInvites',
    whereKey: BROWSER_WHERE,
  },
  {
    name: LAST_SEEN_LEVEL_KEY_PREFIX,
    family: 'character',
    purposeKey: 'settings.cookies.entries.lastSeenLevel',
    whereKey: BROWSER_WHERE,
  },
  {
    name: ONBOARDING_HANDOFF_KEY,
    purposeKey: 'settings.cookies.entries.onboardingHandoff',
    whereKey: TAB_WHERE,
  },
]

interface OffGroup {
  readonly key: string
  readonly titleKey: ParseKeys<'common'>
  readonly helpKey: ParseKeys<'common'>
  readonly noteKey: ParseKeys<'common'>
  readonly switchKey: ParseKeys<'common'>
}

/** The two categories World Zero does not use. Catalog keys stay literal. */
const OFF_GROUPS: readonly OffGroup[] = [
  {
    key: 'analytics',
    titleKey: 'settings.cookies.analytics.title',
    helpKey: 'settings.cookies.analytics.help',
    noteKey: 'settings.cookies.analytics.note',
    switchKey: 'settings.cookies.analytics.switchName',
  },
  {
    key: 'marketing',
    titleKey: 'settings.cookies.marketing.title',
    helpKey: 'settings.cookies.marketing.help',
    noteKey: 'settings.cookies.marketing.note',
    switchKey: 'settings.cookies.marketing.switchName',
  },
]

const disclosureButton: CSSProperties = {
  padding: 0,
  border: 'none',
  background: 'none',
  fontSize: 'var(--text-content)',
  color: 'var(--color-accent-primary)',
  textDecoration: 'underline',
  cursor: 'pointer',
}

const deletionParagraph: CSSProperties = {
  margin: 'var(--space-sm) 0 0',
  fontSize: 'var(--text-content)',
  lineHeight: 1.65,
  color: 'var(--color-text-secondary)',
  maxWidth: '62ch',
}

/** Split out so the test can render it: the disclosure is shut on first paint. */
export function StorageInventory({ id }: { readonly id: string }) {
  const { t } = useTranslation('common')

  // Layout is an `index.css` container query (#2824); an inline
  // `grid-template-columns` would beat it.
  return (
    <div id={id} className="settings-inventory">
      {STORED_ENTRIES.map((entry) => (
        <div key={entry.name} className="settings-inventory-row">
          <code style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-primary)' }}>
            {entry.name}
            {entry.family === 'account' && t('settings.cookies.suffix.account')}
            {entry.family === 'character' && t('settings.cookies.suffix.character')}
          </code>
          <span
            style={{
              fontSize: 'var(--text-content)',
              lineHeight: 1.6,
              color: 'var(--color-text-secondary)',
            }}
          >
            {t(entry.purposeKey)}
          </span>
          <span style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-tertiary)' }}>
            {t(entry.whereKey, { days: SESSION_COOKIE_DAYS })}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function CookiesSection({ sectionId }: SettingsSectionProps) {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)

  const listId = `${sectionId}-inventory`
  const noteId = (key: string) => `${sectionId}-${key}-note`

  return (
    <SettingsCard
      sectionId={sectionId}
      title={t('settings.cookies.eyebrow')}
      lead={t('settings.cookies.lead')}
    >
      {/* `last`: the disclosure below belongs to this row and carries the rule. */}
      <SettingsRow
        last
        title={t('settings.cookies.essential.title')}
        help={t('settings.cookies.essential.help')}
        note={t('settings.cookies.essential.note')}
        noteId={noteId('essential')}
      >
        <SettingsSwitch
          checked
          disabled
          describedById={noteId('essential')}
          label={t('settings.cookies.essential.switchName')}
          onToggle={() => {}}
          testId="settings-cookies-essential"
        />
      </SettingsRow>

      <div
        style={{
          paddingBottom: 'var(--space-lg)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((was) => !was)}
          aria-expanded={open}
          aria-controls={listId}
          style={disclosureButton}
          data-testid="settings-cookies-disclosure"
        >
          {t(open ? 'settings.cookies.hide' : 'settings.cookies.show', {
            total: STORED_ENTRIES.length,
          })}
        </button>

        {open && <StorageInventory id={listId} />}
      </div>

      {OFF_GROUPS.map(({ key, titleKey, helpKey, noteKey, switchKey }) => (
        <SettingsRow
          key={key}
          title={t(titleKey)}
          help={t(helpKey)}
          note={t(noteKey)}
          noteId={noteId(key)}
        >
          <SettingsSwitch
            checked={false}
            disabled
            describedById={noteId(key)}
            label={t(switchKey)}
            onToggle={() => {}}
            testId={`settings-cookies-${key}`}
          />
        </SettingsRow>
      ))}

      {/* #2162 (no Privacy card exists). ADR-0081's tombstone; no retention
          period is named because purge-on-access has no scheduler. */}
      <div style={{ paddingTop: 'var(--space-lg)' }}>
        <h3
          className="font-display"
          style={{
            margin: 0,
            fontWeight: 600,
            fontSize: 'var(--text-content)',
            color: 'var(--color-text-primary)',
          }}
        >
          {t('settings.cookies.deletion.title')}
        </h3>
        <p style={deletionParagraph}>{t('settings.cookies.deletion.body')}</p>
        <p style={deletionParagraph}>{t('settings.cookies.deletion.hash')}</p>
      </div>
    </SettingsCard>
  )
}

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
 * THE DESIGN FOR THIS SECTION STATES THINGS THAT ARE NOT TRUE, and that is the
 * whole reason the issue exists. The canvas draws `wz_session` / `wz_csrf` /
 * `wz_prefs` at 30 days, an Analytics group holding `wz_anon_id` and
 * `wz_page_ms`, and a link to a `#cookie-policy` page. None of those exist:
 * there is exactly ONE cookie, there is no analytics tooling of any kind in
 * either tree, and there is no policy page for a link to reach. Ported as
 * drawn, this section would have shipped a lie on the one surface whose entire
 * job is to be true. Do not "restore" any of it from the canvas.
 *
 * WHY LOCAL STORAGE IS ON A CARD TITLED "COOKIES". It is not a cookie, but it
 * is the same category under ePrivacy and it is *most* of what World Zero
 * actually keeps — one cookie against eleven storage entries. A cookies-only card
 * would make the site look like it stores less than it does.
 *
 * ALL THREE SWITCHES RENDER, ALL THREE ARE INERT (owner ruling, 2026-08-17).
 * The design hides the Marketing toggle (`showToggle: !g.never`); an absent
 * switch says nothing, whereas a switch pinned OFF beside "never used" is the
 * statement. This is the `SettingsSwitch` disabled exception the chassis
 * already documents, used for its second sanctioned reason: not a control the
 * reader cannot use, but a *readout* of a decision that has already been made.
 * Each one therefore carries the reason in its accessible name, or a screen
 * reader hears "switch, off" and learns nothing.
 *
 * THE INVENTORY BELOW IMPORTS EVERY KEY FROM ITS WRITER. Not one string is
 * retyped, so a key that gets renamed renames itself here, and
 * `__tests__/cookiesSection.test.tsx` fails the build if a NEW writer appears
 * anywhere in `src/` without an entry. The issue's own hand-written inventory
 * was three keys short — a literal grep for `'wz-…'` walks straight past the
 * three families whose keys are built at runtime.
 */

/** The five keys the app builds by suffixing an id onto a base. */
type KeyFamily = 'account' | 'character'

interface StoredEntry {
  /** The literal key, or the base a family's keys are built from. Imported. */
  readonly name: string
  /** Present when the writer appends an id — see the copy for each marker. */
  readonly family?: KeyFamily
  /** What it remembers, in the reader's words. */
  readonly purposeKey: ParseKeys<'common'>
  /** Which store, and how long it lasts. */
  readonly whereKey: ParseKeys<'common'>
}

/**
 * The session cookie's life, in days.
 *
 * Mirrors `_COOKIE_MAX_AGE` in `backend/routers/auth.py`, which is the only
 * place it is set. A number crossing the stack is exactly how the canvas came
 * to say 30, so the test reads the Python constant and fails if these drift.
 */
export const SESSION_COOKIE_DAYS = 7

const COOKIE_WHERE = 'settings.cookies.where.cookie' as const
const BROWSER_WHERE = 'settings.cookies.where.browser' as const
const TAB_WHERE = 'settings.cookies.where.tab' as const

/** Everything World Zero puts on the reader's device. The whole list. */
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
    // ONE writer, TWO keys (#2958). `sectionDisclosure` is the one module that
    // writes both, so the census below — which finds writers by their
    // `setItem` call — cannot tell them apart and would keep passing with this
    // line missing. The second surface has to be disclosed by hand.
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

/**
 * The two categories World Zero does not use. Every catalog key is written out
 * rather than interpolated from `key` — a template-literal key typechecks
 * against nothing and is invisible to a locale grep, which is the shape the
 * chassis' own section list refuses for the same reason.
 */
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

/**
 * The list itself, split out for ONE reason: the disclosure it lives behind is
 * shut on first paint, this repo's test env has no DOM to click with, and a
 * list that never renders under test is a list whose copy nothing checks. It is
 * the seam `__tests__/cookiesSection.test.tsx` renders directly.
 */
export function StorageInventory({ id }: { readonly id: string }) {
  const { t } = useTranslation('common')

  // THE WELL AND ITS ROWS ARE DRESSED IN `index.css` (#2824). Three columns
  // where the pane is wide enough for three, one stack where it is not — and
  // the pane narrows when the app sidebar expands, with the viewport standing
  // still, so the question is the CONTAINER's width rather than the form
  // factor. An inline `grid-template-columns` would beat the container query
  // that has to yield it, which is why nothing here declares one.
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
      {/* `last` drops the rule between this row and its own disclosure — the
          list belongs to Essential, and a rule there would detach it. The
          disclosure block below carries the separator instead. */}
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

      {/* #2162's disclosure line lands here rather than on a Privacy card,
          because there is no Privacy card. What survives a deletion is
          ADR-0081's tombstone; the ninety days are deliberately worded as a
          floor and not a promise, because purge-on-access has no scheduler
          behind it and a tombstone nobody returns to keeps its digest. */}
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

import { useState, type ComponentType, type CSSProperties } from 'react'
import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { useFormFactor } from '../hooks/useFormFactor'
import { factionName } from '../utils/factions'
import AppearanceSection from './settings/sections/AppearanceSection'
import CookiesSection from './settings/sections/CookiesSection'

/**
 * Settings — the responsive chassis (#2154), one component for both form
 * factors.
 *
 * IT IS NO LONGER MOBILE-ONLY. #520 shipped this as a phone screen and
 * redirected desktop back to `/`, because the desktop's theme and sign-out
 * controls lived in the NavBar and there was nothing else to put on a page.
 * The owner reversed that on 2026-08-17: Settings is a real desktop surface,
 * the NavBar's theme toggle is now the way IN to it, and the redirect is gone.
 *
 * IT IS NOT A FACTION-DISPATCHED SURFACE. Settings is absent from
 * `SURFACE_KEYS` and draws `--faction-default-*` only. The eyebrow names the
 * viewer's faction, but that is DATA about the reader, not a skin worn by the
 * page — do not add this route to the manifest.
 *
 * HOW A SIBLING SECTION LANDS
 * ---------------------------
 * Notifications (#1047), Account (#2155), Privacy and cookies (#2156), Language
 * (#2157) and Your data (#2158) are each ONE new file under
 * `settings/sections/` returning a `SettingsCard`, plus ONE entry in
 * `SETTINGS_SECTIONS` below. Nothing else in this file moves, and no two
 * siblings need to edit the same row. The nav rail, the anchors, the scroll
 * offset and the pane rhythm are all derived from that one entry.
 */

/** The props every section takes. The shell owns the anchor id, so a nav item
 *  can never point at a section that spells its own id differently. */
export interface SettingsSectionProps {
  readonly sectionId: string
}

interface SettingsSection {
  readonly key: string
  /** Catalog key for the rail label. Typed against the catalog, and written
   *  out rather than interpolated, so a typo fails the build AND a locale grep
   *  can see it — the two things a template-literal key throws away. */
  readonly labelKey: ParseKeys<'common'>
  readonly Component: ComponentType<SettingsSectionProps>
}

/**
 * The section list, in the order the design draws them. ADD ONE LINE HERE.
 *
 * `settings.appearance.eyebrow` is reused for the rail label AND the card
 * heading rather than minting a `settings.nav.appearance` twin holding the same
 * word — the catalog just spent five PRs collapsing exactly that shape.
 */
export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  { key: 'appearance', labelKey: 'settings.appearance.eyebrow', Component: AppearanceSection },
  { key: 'cookies', labelKey: 'settings.cookies.eyebrow', Component: CookiesSection },
]

/** The design's `sec-<key>`; one derivation, used by the anchor and the rail. */
export const sectionAnchor = (key: string): string => `sec-${key}`

/** The design's 232px rail. Fixed, so the pane absorbs every width change. */
const DESKTOP_BODY: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '232px minmax(0, 1fr)',
  gap: 'var(--space-3xl)',
  alignItems: 'start',
}

const MOBILE_BODY: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-lg)',
}

const PANE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-lg)',
  minWidth: 0,
}

const NAV_ITEM: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-sm)',
  width: '100%',
  padding: 'var(--space-sm) var(--space-md)',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-content)',
  textAlign: 'left',
  cursor: 'pointer',
}

export default function Settings() {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  const isMobile = useFormFactor() === 'mobile'
  const [active, setActive] = useState(SETTINGS_SECTIONS[0]?.key ?? '')

  const character = user?.character ?? null

  const goTo = (key: string) => {
    setActive(key)
    // The card carries `scroll-margin-top`, so this lands clear of the sticky
    // NavBar. No `behavior: 'smooth'` — that is motion, and this page is where
    // a reader turns motion off.
    document.getElementById(sectionAnchor(key))?.scrollIntoView({ block: 'start' })
  }

  return (
    <div data-testid="settings" className="font-body">
      <header style={{ paddingBottom: 'var(--space-xl)' }}>
        {character && (
          <div className="label-heading">
            {t('settings.eyebrow', {
              faction: factionName(character.faction_slug),
              name: character.username,
            })}
          </div>
        )}
        <h1
          className="font-display"
          style={{
            margin: 'var(--space-xs) 0 var(--space-sm)',
            fontWeight: 600,
            fontSize: isMobile ? 'var(--text-heading)' : 'var(--text-display)',
            lineHeight: 1.1,
            color: 'var(--color-text-primary)',
          }}
        >
          {t('settings.title')}
        </h1>
        <div aria-hidden style={{ height: 3, width: 120, borderRadius: 2, background: 'var(--faction-default-rainbow)' }} />
        <p
          style={{
            margin: 'var(--space-sm) 0 0',
            fontSize: 'var(--text-content)',
            lineHeight: 1.6,
            color: 'var(--color-text-secondary)',
            maxWidth: '52ch',
          }}
        >
          {t('settings.lead')}
        </p>
      </header>

      <div style={isMobile ? MOBILE_BODY : DESKTOP_BODY}>
        {/* The rail is desktop-only. The phone scrolls one column, so a jump
            list would be a second copy of the page — hidden, not disabled.

            The canvas draws a 2px lead between rail items; `--space-xs` (4px)
            is the scale's bottom rung and there is no --space-none. */}
        {!isMobile && (
          <nav
            aria-label={t('settings.title')}
            className="sticky top-14"
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}
          >
            {SETTINGS_SECTIONS.map(({ key, labelKey }) => {
              const on = active === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => goTo(key)}
                  aria-current={on || undefined}
                  style={{
                    ...NAV_ITEM,
                    background: on ? 'var(--faction-default-light)' : 'transparent',
                    color: on ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                    fontWeight: on ? 700 : 400,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: 'block',
                      flexShrink: 0,
                      width: 3,
                      height: 16,
                      borderRadius: 2,
                      background: on
                        ? 'var(--faction-default-rainbow-vertical)'
                        : 'var(--color-border-strong)',
                    }}
                  />
                  <span>{t(labelKey)}</span>
                </button>
              )
            })}
          </nav>
        )}

        <div style={PANE}>
          {SETTINGS_SECTIONS.map(({ key, Component }) => (
            <Component key={key} sectionId={sectionAnchor(key)} />
          ))}
        </div>
      </div>
    </div>
  )
}

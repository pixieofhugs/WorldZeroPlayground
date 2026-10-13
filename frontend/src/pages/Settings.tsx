import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react'
import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { useFormFactor } from '../hooks/useFormFactor'
import { factionName } from '../utils/factions'
import AccountSection from './settings/sections/AccountSection'
import AppearanceSection from './settings/sections/AppearanceSection'
import CookiesSection from './settings/sections/CookiesSection'
import DataSection from './settings/sections/DataSection'
import LanguageSection from './settings/sections/LanguageSection'
import NotificationsSection from './settings/sections/NotificationsSection'

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
 *
 * All six have now landed, so the list above is the record of a contract that
 * held rather than a plan — six sections, six one-line entries, and this file
 * unchanged apart from them.
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
  {
    key: 'notifications',
    labelKey: 'settings.notifications.eyebrow',
    Component: NotificationsSection,
  },
  { key: 'cookies', labelKey: 'settings.cookies.eyebrow', Component: CookiesSection },
  { key: 'language', labelKey: 'settings.language.eyebrow', Component: LanguageSection },
  { key: 'data', labelKey: 'settings.data.eyebrow', Component: DataSection },
  { key: 'account', labelKey: 'settings.account.eyebrow', Component: AccountSection },
]

/** The design's `sec-<key>`; one derivation, used by the anchor and the rail. */
export const sectionAnchor = (key: string): string => `sec-${key}`

/** What the scroll listener measures, and all `currentSectionKey` is told. */
interface RailReading {
  /** Each section's top edge in viewport pixels, in page order. */
  readonly sections: readonly { readonly key: string; readonly top: number }[]
  /** How far down the viewport a section counts as "at the top" — under the
   *  sticky NavBar, where `goTo` lands one. */
  readonly line: number
  readonly scrollY: number
  readonly viewportHeight: number
  readonly pageHeight: number
  /** The last rail click and where its jump came to rest, if any. */
  readonly jump: { readonly key: string; readonly scrollY: number } | null
}

/**
 * Which section the rail marks (#3096). Always exactly one key. In order:
 *
 * 1. A click holds until the page next moves. A jump to a section near the end
 *    runs out of page before the section reaches the line, and rule 2 or 3
 *    would then hand the highlight to a neighbour the reader did not ask for.
 * 2. At the very bottom it is the last section, which is often too short to
 *    reach the line at all. A page that cannot scroll has no bottom.
 * 3. Otherwise the last section whose top has reached the line. The 1px of
 *    slack is for a jump that lands a fraction of a pixel short.
 */
export function currentSectionKey({
  sections,
  line,
  scrollY,
  viewportHeight,
  pageHeight,
  jump,
}: RailReading): string {
  if (jump && jump.scrollY === scrollY) return jump.key
  const reached = sections.filter((section) => section.top <= line + 1)
  const atBottom = scrollY > 0 && scrollY + viewportHeight >= pageHeight - 1
  return ((atBottom ? sections : reached).at(-1) ?? sections[0])?.key ?? ''
}

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

  const jump = useRef<{ key: string; scrollY: number } | null>(null)

  const character = user?.character ?? null

  // The rail follows the reader (#3096). The WINDOW is what scrolls here: the
  // shell has no overflow container, and both the NavBar and this rail are
  // `sticky` against the viewport. No rail on the phone, so nothing to track.
  //
  // ponytail: measures on scroll and resize only. A section that changes height
  // with the page held still leaves the mark where it was until the next
  // scroll; add a ResizeObserver on the pane if that ever shows.
  useEffect(() => {
    if (isMobile) return
    const follow = () => {
      const cards = SETTINGS_SECTIONS.flatMap(({ key }) => {
        const el = document.getElementById(sectionAnchor(key))
        return el ? [{ key, el }] : []
      })
      if (cards.length === 0) return
      if (jump.current?.scrollY !== window.scrollY) jump.current = null
      setActive(
        currentSectionKey({
          sections: cards.map(({ key, el }) => ({ key, top: el.getBoundingClientRect().top })),
          // The cards' own `scroll-margin-top`, read back rather than restated:
          // it is where `goTo` lands a section, so it is where one counts.
          line: parseFloat(getComputedStyle(cards[0].el).scrollMarginTop) || 0,
          scrollY: window.scrollY,
          viewportHeight: window.innerHeight,
          pageHeight: document.documentElement.scrollHeight,
          jump: jump.current,
        }),
      )
    }
    follow()
    window.addEventListener('scroll', follow, { passive: true })
    window.addEventListener('resize', follow)
    return () => {
      window.removeEventListener('scroll', follow)
      window.removeEventListener('resize', follow)
    }
  }, [isMobile])

  const goTo = (key: string) => {
    setActive(key)
    // The card carries `scroll-margin-top`, so this lands clear of the sticky
    // NavBar. No `behavior: 'smooth'` — that is motion, and this page is where
    // a reader turns motion off.
    document.getElementById(sectionAnchor(key))?.scrollIntoView({ block: 'start' })
    // Instant, so the page is already where it will rest: the scroll event this
    // jump fires must not hand the mark to a neighbour.
    jump.current = { key, scrollY: window.scrollY }
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
        {/* The box shrinks to the title and the rule fills the box, so the rule
            is as wide as the word in any language (#3097). Capped at the
            column, as on the Field Desk. */}
        <div style={{ width: 'fit-content', maxWidth: '100%' }}>
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
          <div aria-hidden style={{ height: 3, borderRadius: 2, background: 'var(--faction-default-rainbow)' }} />
        </div>
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

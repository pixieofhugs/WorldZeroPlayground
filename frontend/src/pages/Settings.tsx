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
 * Settings — the responsive chassis (#2154), both form factors.
 *
 * Not faction-dispatched: absent from `SURFACE_KEYS`, draws
 * `--faction-default-*` only (the eyebrow's faction is data, not a skin).
 *
 * A section is one file under `settings/sections/` returning a `SettingsCard`
 * plus one `SETTINGS_SECTIONS` entry; rail, anchors and scroll derive from it.
 */

/** The shell owns the anchor id, so nav and section cannot disagree. */
export interface SettingsSectionProps {
  readonly sectionId: string
}

interface SettingsSection {
  readonly key: string
  /** Typed and written out (not interpolated) so typos fail and greps work. */
  readonly labelKey: ParseKeys<'common'>
  readonly Component: ComponentType<SettingsSectionProps>
}

/** In design order. Each eyebrow key doubles as the rail label (no `nav.*` twin). */
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

export const sectionAnchor = (key: string): string => `sec-${key}`

interface RailReading {
  /** Each section's top edge in viewport pixels, in page order. */
  readonly sections: readonly { readonly key: string; readonly top: number }[]
  /** Where a section counts as "at the top": under the sticky NavBar. */
  readonly line: number
  readonly scrollY: number
  readonly viewportHeight: number
  readonly pageHeight: number
  /** The last rail click, while the page rests where its jump landed. */
  readonly heldKey: string | null
}

/**
 * Which section the rail marks (#3096). A held click wins; else the last
 * section whose top reached the line (1px slack). Over the final `zone` of
 * scroll the line travels to the viewport bottom, so the last sections (which
 * run out of page) still get marked. Monotonic on the way down.
 */
export function currentSectionKey({
  sections,
  line,
  scrollY,
  viewportHeight,
  pageHeight,
  heldKey,
}: RailReading): string {
  if (heldKey !== null) return heldKey
  const maxScroll = pageHeight - viewportHeight
  const travel = viewportHeight - line
  const zone = Math.min(travel, maxScroll)
  const progress = zone > 0 ? Math.min(1, Math.max(0, (scrollY - (maxScroll - zone)) / zone)) : 0
  const effectiveLine = line + progress * travel
  const reached = sections.filter((section) => section.top <= effectiveLine + 1)
  return (reached.at(-1) ?? sections[0])?.key ?? ''
}

/** The 232px rail is fixed; the pane absorbs width changes. */
const DESKTOP_BODY: CSSProperties = {
  display: 'grid',
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
  const pane = useRef<HTMLDivElement>(null)

  const character = user?.character ?? null

  // Rail follows the reader (#3096). The WINDOW scrolls (no overflow container).
  useEffect(() => {
    if (isMobile) return
    let cards: { key: string; el: HTMLElement }[] = []
    let line = 0
    const follow = () => {
      if (cards.length === 0) return
      // A click's hold lasts while the page rests exactly where the jump left it.
      if (jump.current?.scrollY !== window.scrollY) jump.current = null
      setActive(
        currentSectionKey({
          sections: cards.map(({ key, el }) => ({ key, top: el.getBoundingClientRect().top })),
          line,
          scrollY: window.scrollY,
          viewportHeight: window.innerHeight,
          pageHeight: document.documentElement.scrollHeight,
          heldKey: jump.current?.key ?? null,
        }),
      )
    }
    // Layout moved (resize, a card grew): drop the hold and re-read.
    const relayout = () => {
      cards = SETTINGS_SECTIONS.flatMap(({ key }) => {
        const el = document.getElementById(sectionAnchor(key))
        return el ? [{ key, el }] : []
      })
      // Read back the cards' `scroll-margin-top` rather than restating it.
      line = cards[0] ? parseFloat(getComputedStyle(cards[0].el).scrollMarginTop) || 0 : 0
      jump.current = null
      follow()
    }
    relayout()
    window.addEventListener('scroll', follow, { passive: true })
    window.addEventListener('resize', relayout)
    const grown = new ResizeObserver(relayout)
    if (pane.current) grown.observe(pane.current)
    return () => {
      window.removeEventListener('scroll', follow)
      window.removeEventListener('resize', relayout)
      grown.disconnect()
    }
  }, [isMobile])

  const goTo = (key: string) => {
    const el = document.getElementById(sectionAnchor(key))
    if (!el) return
    setActive(key)
    // No smooth: this page is where a reader turns motion off. `instant` is
    // explicit so a global `scroll-behavior: smooth` can't make the next
    // `scrollY` read land mid-flight.
    el.scrollIntoView({ block: 'start', behavior: 'instant' })
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
        {/* Rule matches the title's width (#3097). */}
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

      <div className={isMobile ? undefined : 'wz-settings-body'} style={isMobile ? MOBILE_BODY : DESKTOP_BODY}>
        {/* Desktop-only. Design's 2px lead rounds to `--space-xs`. */}

        {!isMobile && (
          <nav
            aria-label={t('settings.title')}
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

        <div ref={pane} style={PANE}>
          {SETTINGS_SECTIONS.map(({ key, Component }) => (
            <Component key={key} sectionId={sectionAnchor(key)} />
          ))}
        </div>
      </div>
    </div>
  )
}

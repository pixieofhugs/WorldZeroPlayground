/**
 * #2156 — the Cookies and local storage section, and the guard that keeps it true.
 *
 * THE SEAM IS THE RENDERED SECTION plus a source census of `src/`, in the
 * repo's DOM-less node env (`renderToStaticMarkup`) — the same posture
 * `settingsChassis.test.tsx` uses next door. The section itself is rendered
 * rather than the whole page, because nothing here needs the shell; that the
 * shell reaches it is one assertion against `SETTINGS_SECTIONS`.
 *
 * WHAT THIS FILE IS ACTUALLY FOR. The card's only value is that it is
 * accurate, and accuracy is exactly the property nothing else in the build can
 * see. The design it was ported from named five cookies that do not exist and
 * gave the one real cookie the wrong lifetime; the issue's own hand-checked
 * inventory was three keys short, because it was produced by grepping for
 * `'wz-…'` string literals and three of the ten keys are BUILT AT RUNTIME from
 * a prefix. So the guards below are, in order of what they would have caught:
 *
 *   1. A NEW STORAGE WRITER anywhere in `src/` that nobody disclosed. This is
 *      the census — it greps for the two `setItem` calls, which is the sound
 *      question ("who writes?") rather than the unsound one ("what literals
 *      look like keys?").
 *   2. A RENAMED KEY. Nothing here retypes one: the section imports each from
 *      its writer, and this file imports the same constants and checks they
 *      are all disclosed.
 *   3. THE COOKIE'S LIFETIME DRIFTING FROM THE BACKEND. Read out of
 *      `routers/auth.py` rather than trusted, because a number crossing the
 *      stack is precisely how the canvas came to say 30 days.
 *   4. A CANVAS FALSEHOOD BEING "RESTORED" from the design file.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../hooks/useFormFactor', () => ({
  MOBILE_QUERY: '(max-width: 767px)',
  formFactorFor: (matches: boolean) => (matches ? 'mobile' : 'desktop'),
  useFormFactor: () => 'desktop',
}))

import '../../../i18n'
import { ADMIN_MODE_STORAGE_KEY } from '../../../auth/AdminModeContext'
import { SESSION_HINT_KEY } from '../../../auth/AuthContext'
import { SEEN_INVITES_KEY_PREFIX } from '../../../components/InvitationWatcher'
import { LAST_SEEN_LEVEL_KEY_PREFIX } from '../../../components/LevelUpWatcher'
import { MOTION_STORAGE_KEY } from '../../../hooks/useMotion'
import { SIDEBAR_COLLAPSED_STORAGE_KEY } from '../../../hooks/useSidebarCollapsed'
import { SIDEBAR_PANEL_LAYOUT_STORAGE_KEY } from '../../../hooks/useSidebarPanelLayout'
import { THEME_STORAGE_KEY } from '../../../hooks/useTheme'
import { FACTION_SECTION_STORAGE_KEY } from '../../factionDetail/sectionDisclosure'
import { ONBOARDING_HANDOFF_KEY } from '../../../utils/onboardingResume'
import { SETTINGS_SECTIONS } from '../../Settings'
import CookiesSection, { SESSION_COOKIE_DAYS, STORED_ENTRIES } from '../sections/CookiesSection'

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = join(HERE, '..', '..', '..')
const REPO = join(SRC, '..', '..')

const html = () => renderToStaticMarkup(<CookiesSection sectionId="sec-cookies" />)
const text = (markup: string) => markup.replace(/<[^>]*>/g, '')
const control = (markup: string, testId: string) =>
  new RegExp(`<button[^>]*data-testid="${testId}"[^>]*>`).exec(markup)?.[0] ?? ''

const names = STORED_ENTRIES.map((entry) => entry.name)

describe('the section reaches the page', () => {
  it('is registered in the chassis section list', () => {
    expect(SETTINGS_SECTIONS.map(({ key }) => key)).toContain('cookies')
  })
})

/**
 * The census. Every module in `src/` that writes to a browser store, found by
 * the WRITE CALL rather than by anything about the key's spelling — the whole
 * reason three families went undisclosed for a week is that their keys are
 * assembled at runtime and no literal grep can see them.
 *
 * Add a `setItem` anywhere and this goes red. Fixing it means adding the entry
 * to `STORED_ENTRIES` and its copy, then adding the file here — in that order,
 * because the list below is the acknowledgement, not the disclosure.
 */
const KNOWN_WRITERS = [
  'auth/AdminModeContext.tsx',
  'auth/AuthContext.tsx',
  'components/InvitationWatcher.tsx',
  'components/LevelUpWatcher.tsx',
  'hooks/useMotion.tsx',
  'hooks/useSidebarCollapsed.ts',
  'hooks/useSidebarPanelLayout.ts',
  'hooks/useTheme.tsx',
  'pages/factionDetail/sectionDisclosure.tsx',
  'utils/onboardingResume.ts',
]

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full)
    return /\.tsx?$/.test(entry.name) ? [full] : []
  })
}

describe('nothing writes to a browser store without being disclosed', () => {
  it('finds exactly the writers this card knows about', () => {
    const writers = sourceFiles(SRC)
      .filter((file) => /(?:local|session)Storage\.setItem\(/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC, file).split('\\').join('/'))
      .sort()

    expect(writers, 'an undisclosed storage writer').toEqual([...KNOWN_WRITERS].sort())
  })
})

describe('the inventory is pinned to the keys the app really writes', () => {
  it('discloses all ten storage entries and the one cookie', () => {
    expect(names).toHaveLength(11)
  })

  it.each([
    ['theme', THEME_STORAGE_KEY],
    ['motion', MOTION_STORAGE_KEY],
    ['session hint', SESSION_HINT_KEY],
    ['admin mode', ADMIN_MODE_STORAGE_KEY],
    ['sidebar collapse', SIDEBAR_COLLAPSED_STORAGE_KEY],
    ['sidebar panels', SIDEBAR_PANEL_LAYOUT_STORAGE_KEY],
    ['faction sections', FACTION_SECTION_STORAGE_KEY],
    ['seen invites', SEEN_INVITES_KEY_PREFIX],
    ['last seen level', LAST_SEEN_LEVEL_KEY_PREFIX],
    ['onboarding handoff', ONBOARDING_HANDOFF_KEY],
  ])('discloses the %s key', (_label, key) => {
    expect(names).toContain(key)
  })

  it('marks the four families as families, not as single values', () => {
    const families = STORED_ENTRIES.filter((entry) => entry.family).map((entry) => entry.name)
    expect(families).toEqual([
      SIDEBAR_PANEL_LAYOUT_STORAGE_KEY,
      FACTION_SECTION_STORAGE_KEY,
      SEEN_INVITES_KEY_PREFIX,
      LAST_SEEN_LEVEL_KEY_PREFIX,
    ])
  })

  it('has real copy behind every entry, not a bare key echoing back', () => {
    const catalog = JSON.parse(
      readFileSync(join(SRC, 'locales', 'en', 'common.json'), 'utf8'),
    ) as Record<string, unknown>
    const lookup = (path: string) =>
      path.split('.').reduce<unknown>((at, step) => (at as Record<string, unknown>)?.[step], catalog)

    for (const entry of STORED_ENTRIES) {
      expect(typeof lookup(entry.purposeKey), entry.purposeKey).toBe('string')
      expect(typeof lookup(entry.whereKey), entry.whereKey).toBe('string')
    }
  })
})

describe('the session cookie is described the way the backend sets it', () => {
  const auth = readFileSync(join(REPO, 'backend', 'routers', 'auth.py'), 'utf8')

  it('quotes the lifetime the backend actually uses, not the canvas\u2019 30 days', () => {
    const days = /_COOKIE_MAX_AGE = (\d+) \* 24 \* 60 \* 60/.exec(auth)?.[1]
    expect(days, 'the max-age expression moved — re-read it').toBeDefined()
    expect(Number(days)).toBe(SESSION_COOKIE_DAYS)
  })

  it('names the cookie the backend actually sets', () => {
    expect(auth).toContain('key="access_token"')
    expect(names).toContain('access_token')
  })
})

describe('none of the canvas\u2019 invented storage comes back', () => {
  it.each(['wz_session', 'wz_csrf', 'wz_prefs', 'wz_anon_id', 'wz_page_ms'])(
    'does not disclose %s, which does not exist',
    (invented) => {
      expect(names).not.toContain(invented)
    },
  )

  it('links to no cookie policy page — the card is the policy', () => {
    expect(html()).not.toContain('cookie-policy')
    expect(html(), 'no route was added for one either').not.toContain('href=')
  })
})

/**
 * The three switches are a READOUT, not controls. Hiding the two off ones —
 * which is what the design does to Marketing — would leave the page silent
 * about the thing it exists to say.
 */
describe('all three switches render, all three inert, all three say why', () => {
  it.each([
    ['settings-cookies-essential', 'true'],
    ['settings-cookies-analytics', 'false'],
    ['settings-cookies-marketing', 'false'],
  ])('%s renders as a switch reading %s', (testId, checked) => {
    const button = control(html(), testId)
    expect(button).toContain('role="switch"')
    expect(button).toContain(`aria-checked="${checked}"`)
  })

  it.each(['settings-cookies-essential', 'settings-cookies-analytics', 'settings-cookies-marketing'])(
    '%s is unmovable but still reachable by keyboard',
    (testId) => {
      const button = control(html(), testId)
      expect(button).toContain('aria-disabled="true"')
      expect(button, 'a `disabled` button leaves the tab order').not.toMatch(/\sdisabled(=|\s|>)/)
    },
  )

  it.each(['settings-cookies-essential', 'settings-cookies-analytics', 'settings-cookies-marketing'])(
    '%s carries the reason in its accessible name, not only on screen',
    (testId) => {
      const button = control(html(), testId)
      expect(button, 'a screen reader would hear "switch, off" and learn nothing').toMatch(
        /aria-label="[^"]*because/,
      )
      expect(button).toMatch(/aria-describedby="sec-cookies-[a-z]+-note"/)
    },
  )
})

describe('what a reader is told', () => {
  it('offers the inventory behind an expander that says how much there is', () => {
    const button = control(html(), 'settings-cookies-disclosure')
    expect(button).toContain('aria-expanded="false"')
    expect(button).toContain('aria-controls="sec-cookies-inventory"')
    expect(text(html())).toContain(`Show all ${STORED_ENTRIES.length} entries`)
  })

  it('says what a deletion keeps, without promising a ninety-day sweep', () => {
    const body = text(html())
    expect(body, 'ADR-0081: the media files leave the disk').toContain('removed from the disk')
    expect(body, 'ADR-0081: the composer drafts are emptied').toContain('drafts are emptied')
    expect(body, 'the retained digest is disclosed').toContain('one-way hash')
    expect(body, 'purge-on-access has no scheduler behind it').toContain('never come back to')
  })
})

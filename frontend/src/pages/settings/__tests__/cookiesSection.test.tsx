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
 *   1b. A NEW KEY inside a module that ALREADY writes one (#2989). The census
 *      above answers "who writes?" and nothing else, so once a module is on
 *      the list it is free forever to add a second undeclared key — which is
 *      exactly what #2958 did, adding `wz-profile-sections` beside
 *      `wz-faction-sections` in one file while the file set never moved. The
 *      second arm therefore extracts the KEYS out of the writers the first arm
 *      found and holds them against the card's own disclosure.
 *   2. A RENAMED KEY. Nothing here retypes one: the section imports each from
 *      its writer, and this file imports the same constants and checks they
 *      are all disclosed.
 *   3. THE COOKIE'S LIFETIME DRIFTING FROM THE BACKEND. Read out of
 *      `routers/auth.py` rather than trusted, because a number crossing the
 *      stack is precisely how the canvas came to say 30 days.
 *   4. A CANVAS FALSEHOOD BEING "RESTORED" from the design file.
 */
import { readFileSync } from 'node:fs'
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
import { FACTION_SECTIONS, PROFILE_SECTIONS } from '../../factionDetail/sectionDisclosure'
import { ONBOARDING_HANDOFF_KEY } from '../../../utils/onboardingResume'
import { SETTINGS_SECTIONS } from '../../Settings'
import { readStripped, sourceFiles, stripComments } from '../../../test/sourceScan'
import CookiesSection, {
  SESSION_COOKIE_DAYS,
  STORED_ENTRIES,
  StorageInventory,
} from '../sections/CookiesSection'

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = join(HERE, '..', '..', '..')
const REPO = join(SRC, '..', '..')

const html = () => renderToStaticMarkup(<CookiesSection sectionId="sec-cookies" />)
const list = () => renderToStaticMarkup(<StorageInventory id="sec-cookies-inventory" />)
const text = (markup: string) => markup.replace(/<[^>]*>/g, '')
const control = (markup: string, testId: string) =>
  new RegExp(`<button[^>]*data-testid="${testId}"[^>]*>`).exec(markup)?.[0] ?? ''
const controlWithChildren = (markup: string, testId: string) =>
  new RegExp(`<button[^>]*data-testid="${testId}"[^>]*>[\\s\\S]*?</button>`).exec(markup)?.[0] ?? ''

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

/**
 * Every file under `src/` holding a write call, read RAW — a `setItem` inside a
 * comment still means somebody is thinking about storing something, and this
 * arm is the acknowledgement list, so a false positive here costs one line and
 * a real miss costs a lie on the privacy card.
 */
const writerFiles = (): string[] =>
  sourceFiles({ dir: SRC }).filter((file) =>
    /(?:local|session)Storage\.setItem\(/.test(readFileSync(file, 'utf8')),
  )

describe('nothing writes to a browser store without being disclosed', () => {
  it('finds exactly the writers this card knows about', () => {
    const writers = writerFiles()
      .map((file) => relative(SRC, file).split('\\').join('/'))
      .sort()

    expect(writers, 'an undisclosed storage writer').toEqual([...KNOWN_WRITERS].sort())
  })
})

/**
 * #2989 — the same question asked of KEYS, because the arm above cannot ask it.
 *
 * A key is a string literal in this repo, always: even the five families whose
 * full key is assembled at runtime assemble it from a literal BASE, and the
 * base is what the card discloses. So the extraction is source-level, and it
 * takes a literal from a writer file three ways — no resolver, no dataflow:
 *
 *   - handed straight to the store, `setItem('k', …)`;
 *   - bound to something NAMED like a key — `const X_STORAGE_KEY = 'k'`,
 *     `storageKey: 'k'`. This is the one that catches #2958;
 *   - spelled in the app's `wz` storage namespace, wherever it sits.
 *
 * READ WITH COMMENTS STRIPPED, deliberately and unlike the arm above: these
 * modules explain in prose which key they write and why, and a docblock naming
 * a key is not a key being written.
 *
 * ponytail: it reads the WRITER FILES, so a key literal declared in a module
 * that does not itself call `setItem` is invisible to it — the writer set is
 * the anchor, and widening the walk to all of `src/` drags in every `wz-`
 * prefixed DOM id and CSS class in the tree. If keys ever move out of their
 * writers, scan `src/` and grow {@link NOT_STORAGE} instead.
 */
/** One string literal, of any quote, holding no interpolation. `\x60` is a backtick. */
const QUOTED = String.raw`(?<q>['"\x60])(?<key>[^'"\x60\n$]*)\k<q>`

/** Literals the extraction sees that are not storage. Fails CLOSED: a new one is red until classified. */
const NOT_STORAGE = new Set([
  // `sectionDisclosure`'s two DOM id prefixes, which share the `wz` namespace
  // with its two storage keys and are stored nowhere.
  'wz-faction-section',
  'wz-profile-section',
])

/** Every literal in already-stripped `source` that could be a storage key. */
function storageKeyLiterals(source: string): string[] {
  const found = new Set<string>()

  const inline = new RegExp(String.raw`(?:local|session)Storage\.setItem\(\s*${QUOTED}`, 'g')
  for (const { groups } of source.matchAll(inline)) found.add(groups!.key)

  const bound = new RegExp(String.raw`(?<name>[A-Za-z_$][\w$]*)\s*[=:]\s*${QUOTED}`, 'g')
  for (const { groups } of source.matchAll(bound)) {
    if (/key/i.test(groups!.name)) found.add(groups!.key)
  }

  const namespaced = new RegExp(QUOTED, 'g')
  for (const { groups } of source.matchAll(namespaced)) {
    if (/^wz[-_:]/.test(groups!.key)) found.add(groups!.key)
  }

  return [...found].filter((key) => !NOT_STORAGE.has(key))
}

describe('no writer holds a key the card does not disclose', () => {
  /** The one entry the frontend never writes — the backend sets it, pinned below. */
  const disclosed = STORED_ENTRIES.map((entry) => entry.name).filter((name) => name !== 'access_token')

  it('finds exactly the keys this card discloses', () => {
    const keys = new Set(writerFiles().flatMap((file) => storageKeyLiterals(readStripped(file))))

    expect([...keys].sort(), 'an undisclosed storage key').toEqual([...disclosed].sort())
  })

  /* The guard-the-guard: a scan that matches nothing passes, so prove the
     extraction really does fire on the call site that motivated #2989. */
  it('pulls BOTH of one module\u2019s keys out of it \u2014 the #2958 case', () => {
    const keys = storageKeyLiterals(
      readStripped(join(SRC, 'pages', 'factionDetail', 'sectionDisclosure.tsx')),
    )

    expect(keys).toEqual(
      expect.arrayContaining([FACTION_SECTIONS.storageKey, PROFILE_SECTIONS.storageKey]),
    )
  })

  it('does not lean on the wz namespace alone', () => {
    expect(storageKeyLiterals("localStorage.setItem('plain-inline', '1')")).toContain('plain-inline')
    expect(storageKeyLiterals("const SOMETHING_KEY = 'not-namespaced'")).toContain('not-namespaced')
  })

  it('reads no key out of prose or commented-out code', () => {
    expect(
      storageKeyLiterals(stripComments("// localStorage.setItem('wz-ghost', '1')")),
    ).toEqual([])
  })
})

describe('the inventory is pinned to the keys the app really writes', () => {
  it('discloses all eleven storage entries and the one cookie', () => {
    expect(names).toHaveLength(12)
  })

  it.each([
    ['theme', THEME_STORAGE_KEY],
    ['motion', MOTION_STORAGE_KEY],
    ['session hint', SESSION_HINT_KEY],
    ['admin mode', ADMIN_MODE_STORAGE_KEY],
    ['sidebar collapse', SIDEBAR_COLLAPSED_STORAGE_KEY],
    ['sidebar panels', SIDEBAR_PANEL_LAYOUT_STORAGE_KEY],
    ['faction sections', FACTION_SECTIONS.storageKey],
    // #2958: one module writes both, so the census above sees one writer and
    // would stay green with this key undisclosed. Named here on purpose.
    ['profile sections', PROFILE_SECTIONS.storageKey],
    ['seen invites', SEEN_INVITES_KEY_PREFIX],
    ['last seen level', LAST_SEEN_LEVEL_KEY_PREFIX],
    ['onboarding handoff', ONBOARDING_HANDOFF_KEY],
  ])('discloses the %s key', (_label, key) => {
    expect(names).toContain(key)
  })

  it('marks the five families as families, not as single values', () => {
    const families = STORED_ENTRIES.filter((entry) => entry.family).map((entry) => entry.name)
    expect(families).toEqual([
      SIDEBAR_PANEL_LAYOUT_STORAGE_KEY,
      FACTION_SECTIONS.storageKey,
      PROFILE_SECTIONS.storageKey,
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

/**
 * #2844 — the locked-ON switch (`Essential`) now carries a lock glyph, so it
 * no longer renders byte-identically to a live, changeable switch. The
 * locked-OFF switches (`Analytics`, `Marketing`) do NOT get the glyph — see
 * the rationale on `SettingsSwitch`: the flat, non-rainbow edge already reads
 * as "off" there, so only "locked on" was ever ambiguous.
 */
describe('the locked-on switch carries a lock glyph; the locked-off ones do not', () => {
  it('draws a glyph on the locked-and-checked Essential switch', () => {
    const button = controlWithChildren(html(), 'settings-cookies-essential')
    expect(button).toContain('<svg')
  })

  it.each(['settings-cookies-analytics', 'settings-cookies-marketing'])(
    'draws no glyph on the locked-and-unchecked %s switch',
    (testId) => {
      const button = controlWithChildren(html(), testId)
      expect(button).not.toContain('<svg')
    },
  )

  it('never adds opacity to the track — the dim was rejected on measurement, not lost', () => {
    for (const testId of [
      'settings-cookies-essential',
      'settings-cookies-analytics',
      'settings-cookies-marketing',
    ]) {
      const button = controlWithChildren(html(), testId)
      expect(button).not.toContain('opacity')
    }
  })
})

/**
 * Rendered directly, because the disclosure is shut on first paint and there is
 * no DOM here to open it with — see the note on `StorageInventory`.
 */
describe('the disclosed list, once opened', () => {
  it('prints every key, with the family markers spelled out', () => {
    const body = text(list())
    for (const entry of STORED_ENTRIES) expect(body, entry.name).toContain(entry.name)
    expect(body).toContain(`${SEEN_INVITES_KEY_PREFIX}[character id]`)
    expect(body).toContain(`${LAST_SEEN_LEVEL_KEY_PREFIX}[character id]`)
    expect(body).toContain(`${SIDEBAR_PANEL_LAYOUT_STORAGE_KEY}[:account id]`)
    expect(body).toContain(`${FACTION_SECTIONS.storageKey}[:account id]`)
    expect(body).toContain(`${PROFILE_SECTIONS.storageKey}[:account id]`)
  })

  it('prints resolved copy beside each key, never a raw catalog path', () => {
    const body = text(list())
    expect(body, 'a bare key echoing back means the copy is missing').not.toContain(
      'settings.cookies.',
    )
    expect(body).toContain('Keeps you signed in.')
    expect(body).toContain('One entry for each of your characters.')
  })

  it('separates the cookie from the two browser stores', () => {
    const body = text(list())
    expect(body).toContain(`Cookie, ${SESSION_COOKIE_DAYS} days`)
    expect(body, 'local storage has no expiry').toContain('until you clear it')
    expect(body, 'the handoff mark is sessionStorage, not localStorage').toContain(
      'until you close it',
    )
  })
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

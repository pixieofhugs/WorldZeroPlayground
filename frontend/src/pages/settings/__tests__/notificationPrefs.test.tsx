/**
 * #1047 — the Notifications section: its rules, its rows, and the two locks.
 *
 * THE SEAM IS `../notificationPrefs.ts` plus the rendered rows, in the repo's
 * DOM-less node env. Every rule this card carries is a pure function of the
 * fetched state, precisely so that it is assertable here: `renderToStaticMarkup`
 * runs no effects and dispatches no clicks, so a rule living inside a handler
 * would be a rule nothing in this build can see.
 *
 * WHAT THESE GUARD, in order of what they would actually catch:
 *
 *   1. A ROW KEY DRIFTING FROM THE SERVER'S REGISTRY. The nine keys exist on
 *      both sides of a language boundary; a rename on one side alone would
 *      render a row with no state, or drop a row silently. Read out of the
 *      Python rather than trusted — same trick as `requestItemTypes.test.ts`.
 *   2. A LOCK GOING MISSING. The three requests rows must render a page switch
 *      that is ON, unmovable and explaining itself. A regression that made it
 *      movable is the exact thing the owner's 2026-08-19 rule forbids, and it
 *      is invisible to tsc.
 *   3. THE MASTER ROW LIGHTING WHEN THE ROWS DISAGREE.
 *   4. THE EMAIL-PENDING LINE BEING DELETED. It is the only thing that makes a
 *      switch for a channel that does not exist honest rather than a false
 *      affordance (#1263). Losing it silently is losing the ruling.
 */
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../hooks/useFormFactor', () => ({
  MOBILE_QUERY: '(max-width: 767px)',
  formFactorFor: (matches: boolean) => (matches ? 'mobile' : 'desktop'),
  useFormFactor: () => 'desktop',
}))

import '../../../i18n'
import { SETTINGS_SECTIONS } from '../../Settings'
import { NotificationRows } from '../sections/NotificationsSection'
import {
  NOTIFICATION_ROWS,
  governedRows,
  isLocked,
  lockNoteKey,
  masterChecked,
  rowsFor,
  saveBody,
  setAll,
  toggleCell,
  type NotificationPrefs,
} from '../notificationPrefs'

const REGISTRY = new URL(
  '../../../../../backend/services/notification_prefs.py',
  import.meta.url,
)

/** A server answer at the ruled defaults — what a fresh account gets. */
const DEFAULTS: NotificationPrefs = {
  duel_challenge: { on_updates: true, by_email: true, locked: true },
  collab_invite: { on_updates: true, by_email: true, locked: true },
  invitation_letter: { on_updates: true, by_email: true, locked: true },
  comment_on_mine: { on_updates: true, by_email: true, locked: false },
  comment_mention: { on_updates: true, by_email: true, locked: false },
  vote_on_mine: { on_updates: true, by_email: false, locked: false },
  level_up: { on_updates: false, by_email: false, locked: true },
  era_announcement: { on_updates: true, by_email: false, locked: false },
  global_task: { on_updates: true, by_email: false, locked: false },
}

describe('the row list', () => {
  it('is the nine keys the server registry names, in a stable order', () => {
    const source = readFileSync(REGISTRY, 'utf8')

    // `key=FEED_ITEM_TYPE_DUEL_CHALLENGE,` / `key=LEVEL_UP,` → the constant
    // name, then the wire string from `activity_feed.py`'s own declaration or
    // from `LEVEL_UP` here. Reading the CONSTANTS rather than literals is the
    // point: the registry deliberately holds no bare strings to copy.
    const declared = [...source.matchAll(/NotificationEvent\(\s*\n?\s*key=(\w+)/g)].map(
      ([, name]) => name,
    )
    expect(
      declared.length,
      'no NotificationEvent matched — the registry was reformatted, so this regex is now blind',
    ).toBe(9)

    const feed = readFileSync(
      new URL('../../../../../backend/services/activity_feed.py', import.meta.url),
      'utf8',
    )
    const wire = new Map(
      [...feed.matchAll(/^(FEED_ITEM_TYPE_\w+) = "(\w+)"$/gm)].map(([, n, v]) => [n, v]),
    )
    wire.set('LEVEL_UP', 'level_up')

    expect(declared.map((name) => wire.get(name))).toEqual(
      NOTIFICATION_ROWS.map((row) => row.key),
    )
  })

  it('is registered on the Settings chassis', () => {
    expect(SETTINGS_SECTIONS.map((s) => s.key)).toContain('notifications')
  })
})

describe('the locks', () => {
  it('locks only the page axis — email is free on every row, requests included', () => {
    for (const row of NOTIFICATION_ROWS) {
      expect(isLocked(DEFAULTS[row.key], 'by_email')).toBe(false)
    }
    // "You should be able to turn off email notifications on collaboration"
    // while the invite still lands on Updates — the whole reason the exclusive
    // one-channel control was replaced.
    expect(isLocked(DEFAULTS.collab_invite, 'on_updates')).toBe(true)
    expect(isLocked(DEFAULTS.collab_invite, 'by_email')).toBe(false)
  })

  it('leaves mentions and comments-on-my-praxis free — they are not requests', () => {
    expect(isLocked(DEFAULTS.comment_mention, 'on_updates')).toBe(false)
    expect(isLocked(DEFAULTS.comment_on_mine, 'on_updates')).toBe(false)
  })

  it('gives the two kinds of lock two different reasons', () => {
    expect(lockNoteKey(DEFAULTS.duel_challenge)).toBe('settings.notifications.lockedRequest')
    expect(lockNoteKey(DEFAULTS.level_up)).toBe('settings.notifications.lockedNoFeedRow')
    expect(lockNoteKey(DEFAULTS.vote_on_mine)).toBeUndefined()
  })

  it('refuses to flip a locked cell', () => {
    expect(toggleCell(DEFAULTS, 'duel_challenge', 'on_updates')).toBe(DEFAULTS)
    expect(toggleCell(DEFAULTS, 'level_up', 'on_updates')).toBe(DEFAULTS)
    // The email half of the same row is fully operable.
    expect(toggleCell(DEFAULTS, 'duel_challenge', 'by_email').duel_challenge.by_email).toBe(false)
  })
})

describe('the master row', () => {
  it('shows its thumb only when every row it governs agrees', () => {
    // Email: all nine free, and the defaults disagree — five on, four off.
    expect(masterChecked(DEFAULTS, 'by_email')).toBe(false)
    expect(governedRows(DEFAULTS, 'by_email')).toHaveLength(9)

    const allEmail = setAll(DEFAULTS, 'by_email')
    expect(masterChecked(allEmail, 'by_email')).toBe(true)
    expect(Object.values(allEmail).every((p) => p.by_email)).toBe(true)

    // And back off again — it is a switch, not two buttons.
    expect(masterChecked(setAll(allEmail, 'by_email'), 'by_email')).toBe(false)
  })

  it('governs only the page rows it can actually set', () => {
    // Four of the nine page switches are not the reader's, so a cell claiming
    // all nine would either lie or do nothing.
    expect(governedRows(DEFAULTS, 'on_updates').map((r) => r.key)).toEqual([
      'comment_on_mine',
      'comment_mention',
      'vote_on_mine',
      'era_announcement',
      'global_task',
    ])
    expect(masterChecked(DEFAULTS, 'on_updates')).toBe(true)

    const noPage = setAll(DEFAULTS, 'on_updates')
    expect(masterChecked(noPage, 'on_updates')).toBe(false)
    // The locked rows did not move.
    expect(noPage.duel_challenge.on_updates).toBe(true)
    expect(noPage.level_up.on_updates).toBe(false)
  })

  it('stores nothing of its own', () => {
    expect(Object.keys(saveBody(DEFAULTS).events).sort()).toEqual(
      NOTIFICATION_ROWS.map((r) => r.key).sort(),
    )
    expect(saveBody(DEFAULTS).events).not.toHaveProperty('all')
  })
})

describe('the save body', () => {
  it('sends both switches for every known row and nothing else', () => {
    const body = saveBody(toggleCell(DEFAULTS, 'vote_on_mine', 'on_updates'))
    expect(body.events.vote_on_mine).toEqual({ on_updates: false, by_email: false })
    expect(Object.keys(body.events)).toHaveLength(9)
  })

  it('ignores a row the server did not send', () => {
    const partial: NotificationPrefs = { vote_on_mine: DEFAULTS.vote_on_mine }
    expect(rowsFor(partial).map((r) => r.key)).toEqual(['vote_on_mine'])
    expect(Object.keys(saveBody(partial).events)).toEqual(['vote_on_mine'])
  })
})

describe('the rendered card', () => {
  const html = renderToStaticMarkup(
    <NotificationRows prefs={DEFAULTS} onToggle={() => {}} onToggleAll={() => {}} />,
  )

  it('draws two switches for each of the nine rows, plus the master pair', () => {
    for (const row of NOTIFICATION_ROWS) {
      expect(html).toContain(`data-testid="settings-notifications-${row.key}-page"`)
      expect(html).toContain(`data-testid="settings-notifications-${row.key}-email"`)
    }
    expect(html).toContain('data-testid="settings-notifications-all-page"')
    expect(html).toContain('data-testid="settings-notifications-all-email"')
    expect(html.match(/role="switch"/g)).toHaveLength(20)
  })

  it('renders the three requests page switches ON, unmovable, and explaining themselves', () => {
    for (const key of ['duel_challenge', 'collab_invite', 'invitation_letter']) {
      const cell = switchFor(html, `settings-notifications-${key}-page`)
      expect(cell).toContain('aria-checked="true"')
      expect(cell).toContain('aria-disabled="true"')
      expect(cell).toContain(`aria-describedby="settings-notifications-${key}-note"`)
      // A missing control would say nothing; this one says why.
      expect(html).toContain('Always shown — someone is waiting on your answer.')
    }
  })

  it("renders level up's page switch OFF, unmovable, with its own reason", () => {
    const cell = switchFor(html, 'settings-notifications-level_up-page')
    expect(cell).toContain('aria-checked="false"')
    expect(cell).toContain('aria-disabled="true"')
    expect(html).toContain('Not an Updates row')
    // Its email switch is the row's whole point and is free.
    expect(switchFor(html, 'settings-notifications-level_up-email')).not.toContain(
      'aria-disabled',
    )
  })

  it('leaves every email switch operable, requests rows included', () => {
    for (const row of NOTIFICATION_ROWS) {
      expect(switchFor(html, `settings-notifications-${row.key}-email`)).not.toContain(
        'aria-disabled',
      )
    }
  })

  it('names both columns once, on the master row', () => {
    expect(html.match(/>Updates</g)).toHaveLength(1)
    expect(html.match(/>Email</g)).toHaveLength(1)
  })
})

/** The one `<button role="switch">` carrying this test id. */
function switchFor(html: string, testId: string): string {
  const at = html.indexOf(`data-testid="${testId}"`)
  expect(at, `no switch with test id ${testId}`).toBeGreaterThan(-1)
  const opens = html.lastIndexOf('<button', at)
  return html.slice(opens, html.indexOf('>', at) + 1)
}

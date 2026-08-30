/**
 * #2161 — the danger zone, as a reader meets it, plus the page a deleted
 * account lands on.
 *
 * SEAM: the rendered `/settings` page in the repo's DOM-less node env, the same
 * posture as `accountSection.test.tsx` next door — and rendering the whole page
 * rather than the card alone so these also prove the danger zone is MOUNTED.
 * `main` auto-deploys, and a card that renders perfectly but is not reachable
 * from `AccountSection` is exactly the failure this file has to catch.
 *
 * NOT COVERED HERE. Opening the dialog needs an event this harness cannot
 * dispatch, so the dialog's own contract — the held confirm, the content slot —
 * is asserted on `ConfirmDialog` itself in
 * `components/confirm/__tests__/confirmDialogSlot.test.tsx`, and the gate that
 * arms it in `deleteAccount.test.ts`. Escape, the focus trap and focus return
 * are hand-verified, as they are for every other dialog in the repo.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, afterEach, vi } from 'vitest'
import type { CurrentUser } from '../../../api/auth'

const harness = vi.hoisted(() => ({
  formFactor: 'desktop' as 'mobile' | 'desktop',
  user: null as CurrentUser | null,
}))

vi.mock('../../../hooks/useFormFactor', () => ({
  MOBILE_QUERY: '(max-width: 767px)',
  formFactorFor: (matches: boolean) => (matches ? 'mobile' : 'desktop'),
  useFormFactor: () => harness.formFactor,
}))

// Partial, not wholesale: the Cookies section imports `SESSION_HINT_KEY` out of
// this module, and a bare factory blanks every export it does not list.
vi.mock('../../../auth/AuthContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../auth/AuthContext')>()),
  useAuth: () => ({ user: harness.user, signOut: vi.fn() }),
}))

import '../../../i18n'
import common from '../../../locales/en/common.json'
import Settings, { SETTINGS_SECTIONS } from '../../Settings'
import AccountDeleted from '../../AccountDeleted'
import { MotionProvider } from '../../../hooks/useMotion'
import { ThemeProvider } from '../../../hooks/useTheme'

function viewer(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    account_id: 1,
    email: 'pilgrim@example.com',
    provider: 'google',
    character: {
      id: 3,
      username: 'wz_pilgrim',
      display_name: 'WZ Pilgrim',
      faction_slug: 'ua',
      level: 4,
      avatar_url: '',
    },
    ...overrides,
  } as unknown as CurrentUser
}

function draw(node: React.ReactElement): string {
  const holder = globalThis as { window?: unknown }
  const previous = holder.window
  holder.window = {
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  }
  try {
    return renderToStaticMarkup(
      <MemoryRouter>
        <ThemeProvider>
          <MotionProvider>{node}</MotionProvider>
        </ThemeProvider>
      </MemoryRouter>,
    )
  } finally {
    if (previous === undefined) delete holder.window
    else holder.window = previous
  }
}

const render = () => draw(<Settings />)
const text = (html: string) => html.replace(/<[^>]*>/g, '')

afterEach(() => {
  harness.formFactor = 'desktop'
  harness.user = null
})

describe('the danger zone is drawn, and it is drawn inside the Account section', () => {
  it('renders the trigger with the design’s words', () => {
    harness.user = viewer()
    expect(text(render())).toContain('Delete my account')
  })

  it('renders it on a phone too', () => {
    harness.formFactor = 'mobile'
    harness.user = viewer()
    expect(render()).toContain('data-testid="settings-delete-account"')
  })

  it('anchors under the Account section rather than claiming a rail item', () => {
    harness.user = viewer()
    const html = render()
    expect(html).toContain('id="sec-account-danger"')
    expect(
      SETTINGS_SECTIONS.some(({ key }) => key === 'account-danger'),
      'the rail lists one Account item; the danger card rides under it',
    ).toBe(false)
    expect([...html.matchAll(/aria-current="true"/g)].length).toBe(1)
  })

  /**
   * THE SENTENCE IS ONLY TRUE UNDER THE TOMBSTONE (ADR-0081). If the backend
   * ever becomes a hard delete this assertion is the tripwire that says the
   * page has started lying.
   */
  it('keeps the promise about points already awarded to other players', () => {
    harness.user = viewer()
    expect(text(render())).toContain('Points you awarded to other players stay with them.')
  })
})

/**
 * The confirm string is the account EMAIL (#2161 correction 1), so an account
 * with no email on the wire could never arm the button. Hidden, not disabled.
 */
describe('an account with no email to type', () => {
  it('is offered no delete control at all', () => {
    harness.user = viewer({ email: '' })
    const html = render()
    expect(html).not.toContain('data-testid="settings-delete-account"')
    expect(html, 'and no empty danger card left behind either').not.toContain(
      'id="sec-account-danger"',
    )
  })

  it('still gets the rest of the Account section', () => {
    harness.user = viewer({ email: '' })
    expect(render()).toContain('id="sec-account"')
  })
})

/**
 * The copy the dialog picks from. It cannot be opened in this harness, so the
 * catalog entries are pinned here instead — a missing plural sibling throws at
 * render time in dev and test (`i18n.ts`), which is a failure a reader would
 * meet at the worst possible moment.
 */
describe('the dialog copy names the lives, and asks for the email', () => {
  const danger = common.settings.danger

  it('asks for the address, never for a character name', () => {
    expect(danger.dialogBody).toContain('{{email}}')
    expect(danger.fieldLabel.toLowerCase()).toContain('email')
  })

  it('carries a sentence for one life, for several, and for none', () => {
    expect(danger.livesOnly).toContain('{{name}}')
    expect(danger.livesMore_one).toContain('other life')
    expect(danger.livesMore_other).toContain('other lives')
    expect(danger.livesNone).toBeTruthy()
  })
})

/**
 * The page a deleted account lands on. It states both facts WITHOUT an account
 * to read them from — no viewer is mocked here on purpose.
 */
describe('/goodbye', () => {
  const page = () => text(draw(<AccountDeleted />))

  it('says the account is gone and that nothing carries over', () => {
    expect(page()).toContain('Nothing carries over.')
  })

  it('offers the fresh start BEFORE the fact, which is the point of the gate', () => {
    const body = page()
    expect(body).toContain('Google or Discord')
    expect(body).toContain('start you fresh as a new player')
  })

  it('reads nothing off a viewer — there is none by the time it paints', () => {
    expect(page()).not.toContain('undefined')
  })
})

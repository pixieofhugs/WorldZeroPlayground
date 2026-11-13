/**
 * #2161 — the danger zone on the whole `/settings` page (proving it is mounted),
 * plus `/goodbye`. The dialog contract is in
 * `components/confirm/__tests__/confirmDialogSlot.test.tsx`, the gate in
 * `deleteAccount.test.ts`; Escape and focus are hand-verified.
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

// Partial: the Cookies section imports `SESSION_HINT_KEY` from here.
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

  /** True only under the tombstone (ADR-0081): tripwire for a hard delete. */
  it('keeps the promise about points already awarded to other players', () => {
    harness.user = viewer()
    expect(text(render())).toContain('Points you awarded to other players stay with them.')
  })
})

/** The confirm string is the email, so this could never arm. Hidden. */
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

/** The dialog cannot open here, so its catalog entries are pinned instead. */
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

/** No viewer mocked on purpose: the account is gone by now. */
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

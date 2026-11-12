/**
 * #2155 — the Settings Account section. Renders the whole page so these also
 * prove the section is registered in `SETTINGS_SECTIONS`.
 *
 * The sign-out test is load-bearing: Settings holds the app's only sign-out
 * control, so losing it ships a site nobody can sign out of.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, afterEach, vi } from 'vitest'
import type { CurrentUser } from '../../../api/auth'

const harness = vi.hoisted(() => ({
  formFactor: 'desktop' as 'mobile' | 'desktop',
  user: null as CurrentUser | null,
  signOut: vi.fn(),
}))

vi.mock('../../../hooks/useFormFactor', () => ({
  MOBILE_QUERY: '(max-width: 767px)',
  formFactorFor: (matches: boolean) => (matches ? 'mobile' : 'desktop'),
  useFormFactor: () => harness.formFactor,
}))

// Partial: the Cookies section (#2156) imports `SESSION_HINT_KEY` from here.
vi.mock('../../../auth/AuthContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../auth/AuthContext')>()),
  useAuth: () => ({ user: harness.user, signOut: harness.signOut }),
}))

import '../../../i18n'
import Settings from '../../Settings'
import { MotionProvider } from '../../../hooks/useMotion'
import { ThemeProvider } from '../../../hooks/useTheme'

const LIFE = {
  id: 3,
  username: 'wz_pilgrim',
  display_name: 'WZ Pilgrim',
  faction_slug: 'ua',
  level: 4,
  avatar_url: '',
}

function viewer(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    account_id: 1,
    email: 'pilgrim@example.com',
    provider: 'google',
    character: LIFE,
    ...overrides,
  } as unknown as CurrentUser
}

function render(): string {
  // `useMotion` reads `window.matchMedia`; there is no window in this env.
  const holder = globalThis as { window?: unknown }
  const previous = holder.window
  holder.window = {
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  }
  try {
    return renderToStaticMarkup(
      <MemoryRouter>
        <ThemeProvider>
          <MotionProvider>
            <Settings />
          </MotionProvider>
        </ThemeProvider>
      </MemoryRouter>,
    )
  } finally {
    if (previous === undefined) delete holder.window
    else holder.window = previous
  }
}

const text = (html: string) => html.replace(/<[^>]*>/g, '')
const tagged = (html: string, testId: string) =>
  new RegExp(`<[a-z]+[^>]*data-testid="${testId}"[^>]*>[^<]*`).exec(html)?.[0] ?? ''

afterEach(() => {
  harness.formFactor = 'desktop'
  harness.user = null
})

describe('the two per-account facts', () => {
  it('prints the signed-in email', () => {
    harness.user = viewer()
    expect(tagged(render(), 'settings-account-email')).toContain('pilgrim@example.com')
  })

  it('names the provider as a brand, never as the wire slug', () => {
    harness.user = viewer({ provider: 'google' })
    const pill = tagged(render(), 'settings-account-provider')
    expect(pill).toContain('Google')
    expect(pill, 'the raw enum value must not reach a reader').not.toContain('>google')
  })

  /** Owner ruling 2026-08-17: no link-a-provider flow exists yet (ADR-0075). */
  it('offers no control beside the provider', () => {
    harness.user = viewer()
    const html = render()
    const row = html.slice(html.indexOf('Signed in with'), html.indexOf('settings-characters-link'))
    expect(row).not.toContain('<button')
  })

  it('drops the provider row entirely when the account holds no identity row', () => {
    harness.user = viewer({ provider: '' })
    expect(text(render()), 'no empty pill, no raw ""').not.toContain('Signed in with')
  })
})

describe('the carried life', () => {
  it('shows the active character with its faction and level', () => {
    harness.user = viewer()
    const body = text(render())
    expect(body).toContain('WZ Pilgrim')
    expect(body).toContain('Level 4')
  })

  it('points character management at that life', () => {
    harness.user = viewer()
    expect(tagged(render(), 'settings-characters-link')).toContain('href="/characters/3/edit"')
  })

  it('points at creation instead for an account playing nobody', () => {
    harness.user = viewer({ character: null })
    const html = render()
    expect(tagged(html, 'settings-characters-link')).toContain('href="/characters/create"')
    expect(text(html)).toContain('No character yet')
  })
})

/** The only sign-out control in the app. If red, restore one before shipping. */
describe('the way out', () => {
  it('renders a sign-out control on the Settings page', () => {
    harness.user = viewer()
    expect(tagged(render(), 'settings-sign-out')).toContain('Sign out')
  })

  it('renders it on a phone too — the phone has no NavBar to fall back on', () => {
    harness.formFactor = 'mobile'
    harness.user = viewer()
    expect(tagged(render(), 'settings-sign-out')).toContain('Sign out')
  })
})

/** Unreachable in the app, but a `null` section leaves a rail item dangling. */
it('still renders its anchor when there is no user at all', () => {
  harness.user = null
  expect(render()).toContain('id="sec-account"')
})

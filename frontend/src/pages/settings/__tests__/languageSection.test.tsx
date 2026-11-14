/**
 * #2157 — Language and region. Seams: `languageRequestBody` (the `POST /contact`
 * body: inbox marker, cap, trim, the server's `min_length=1` fields), and the
 * whole `/settings` page (proves registration).
 *
 * The confirmation must not survive a refresh: a `ContactMessage` leaves no
 * per-account record. Copy is read from the catalog, not retyped.
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
import { MotionProvider } from '../../../hooks/useMotion'
import { ThemeProvider } from '../../../hooks/useTheme'
import { LANGUAGE_REQUEST_MAX, languageRequestBody } from '../sections/LanguageSection'

const copy = common.settings.language

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
const has = (html: string, testId: string) => html.includes(`data-testid="${testId}"`)

afterEach(() => {
  harness.formFactor = 'desktop'
  harness.user = null
})

describe('the request body', () => {
  it('carries the inbox marker, the character name and the account email', () => {
    expect(languageRequestBody(viewer(), 'Portuguese (Brazil)')).toEqual({
      name: 'WZ Pilgrim',
      email: 'pilgrim@example.com',
      message: 'Language request: Portuguese (Brazil)',
    })
  })

  it('trims what was typed, and refuses a field holding only spaces', () => {
    expect(languageRequestBody(viewer(), '  Welsh  ')?.message).toBe('Language request: Welsh')
    expect(languageRequestBody(viewer(), '   ')).toBeNull()
    expect(languageRequestBody(viewer(), '')).toBeNull()
  })

  /** `maxLength` on the input is a courtesy; the builder is the boundary. */
  it('caps the language at the field cap however it was typed', () => {
    const body = languageRequestBody(viewer(), 'x'.repeat(LANGUAGE_REQUEST_MAX + 40))
    expect(body?.message).toBe(`Language request: ${'x'.repeat(LANGUAGE_REQUEST_MAX)}`)
  })

  /** Both are `min_length=1` in `backend/schemas/contact.py`: a sure 422. */
  it('refuses to build a request there is no identity for', () => {
    expect(languageRequestBody(null, 'Welsh')).toBeNull()
    expect(languageRequestBody(viewer({ email: '' }), 'Welsh')).toBeNull()
    expect(languageRequestBody(viewer({ character: null }), 'Welsh')).toBeNull()
  })

  /** Runs on every Settings mount; a throw here white-screens the page. */
  it('survives a viewer carrying neither field', () => {
    const partial = { character: { id: 7 } } as unknown as CurrentUser
    expect(languageRequestBody(partial, 'Welsh')).toBeNull()
  })
})

describe('the card', () => {
  it('is registered with the chassis', () => {
    expect(SETTINGS_SECTIONS.map((s) => s.key)).toContain('language')
    expect(render()).toContain('id="sec-language"')
  })

  it('states the one interface language there is, with no picker behind it', () => {
    harness.user = viewer()
    const html = render()
    expect(html, 'the static value pill').toContain('data-testid="settings-language-current"')
    expect(text(html)).toContain(copy.currentValue)
    expect(html, 'a language picker would be a control that does nothing').not.toContain('<select')
  })

  /** The canvas says "menus, labels, and email". There is no email (#2157). */
  it('does not promise email it cannot send', () => {
    harness.user = viewer()
    expect(text(render())).not.toMatch(/menus, labels, and email/i)
  })

  it('offers the free-text field beside the button, capped', () => {
    harness.user = viewer()
    const html = render()
    const field = new RegExp(`<input[^>]*data-testid="settings-language-input"[^>]*>`).exec(html)?.[0] ?? ''
    expect(field).toContain(`maxLength="${LANGUAGE_REQUEST_MAX}"`)
    expect(field, 'the row title is the label, so the field carries its own name').toContain(
      `aria-label="${copy.requestField}"`,
    )
    expect(has(html, 'settings-language-submit')).toBe(true)
  })

  /** A control that can only 422 is hidden; a real state (no character yet). */
  it('hides the request row when there is no identity to send', () => {
    harness.user = viewer({ character: null })
    const html = render()
    expect(has(html, 'settings-language-current'), 'the honest half still renders').toBe(true)
    expect(has(html, 'settings-language-input')).toBe(false)
    expect(has(html, 'settings-language-submit')).toBe(false)
  })

  /** A refresh is a fresh mount. */
  it('shows no confirmation on a fresh mount', () => {
    harness.user = viewer()
    expect(has(render(), 'settings-language-status')).toBe(false)
  })

  it('keeps its shape on a phone', () => {
    harness.formFactor = 'mobile'
    harness.user = viewer()
    const html = render()
    expect(html).toContain('id="sec-language"')
    expect(has(html, 'settings-language-input')).toBe(true)
  })
})

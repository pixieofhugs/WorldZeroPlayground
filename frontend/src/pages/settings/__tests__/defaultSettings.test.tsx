/**
 * Mobile Settings behaviour + slot invariant (#520). Runs in the repo's DOM-less
 * node env (renderToStaticMarkup), so interaction is proven against the extracted
 * seams the screen wires to, not synthetic clicks:
 *   - the dark-mode toggle delegates to `useTheme`'s `nextTheme`/`applyTheme`,
 *     which flip the real `[data-theme]` cascade (exercised via a document shim);
 *   - the render shows ONLY real controls — the parked notifications / privacy /
 *     about rows are absent (ADR-0035).
 *
 * Sign-out moved out of this file with #1349: the screen now passes
 * `useAuth().signOut` straight through, and the wiring it used to assert here is
 * covered where it now lives — `auth/__tests__/authRefetchLedger.test.ts`.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'
import { describe, it, expect } from 'vitest'
// Initialize the i18n catalog so shared copy keys resolve to English text.
import '../../../i18n'
import DefaultSettings from '../mobileArchetypes/DefaultSettings'
import { nextTheme, applyTheme } from '../../../hooks/useTheme'
import type { CharacterOut } from '../../../api/auth'

function render(element: ReactElement): { html: string; text: string } {
  const html = renderToStaticMarkup(<MemoryRouter>{element}</MemoryRouter>)
  return { html, text: html.replace(/<[^>]*>/g, '') }
}

function character(overrides: Partial<CharacterOut> = {}): CharacterOut {
  return {
    id: 7,
    username: 'nova',
    display_name: 'Nova',
    bio: '',
    tagline: '',
    avatar_url: '',
    location: '',
    level: 3,
    score: 120,
    all_time_score: 120,
    faction_slug: 'everymen',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    badges: [],
    invitations: [],
    ...overrides,
  }
}

const noop = () => {}

describe('mobile Settings — real controls only', () => {
  it('renders the account header, character link, dark-mode toggle and sign out', () => {
    const { html, text } = render(
      <DefaultSettings character={character()} dark={false} onToggleTheme={noop} onSignOut={noop} />,
    )
    expect(text, 'title').toContain('Settings')
    expect(text, 'account name').toContain('Nova')
    expect(text, 'view-profile link').toContain('View profile')
    expect(html, 'character-management link').toContain('href="/characters/7/edit"')
    expect(text, 'characters row').toContain('Characters')
    expect(text, 'appearance').toContain('Dark mode')
    expect(html, 'theme toggle control').toContain('data-testid="settings-theme-toggle"')
    expect(text, 'sign out').toContain('Sign out')
  })

  it('omits the parked notifications / privacy / about rows', () => {
    const { text } = render(
      <DefaultSettings character={character()} dark={false} onToggleTheme={noop} onSignOut={noop} />,
    )
    const lower = text.toLowerCase()
    expect(lower).not.toContain('notification')
    expect(lower).not.toContain('privacy')
    expect(lower).not.toContain('about')
  })

  it('links a character-less account into creation instead', () => {
    const { html, text } = render(
      <DefaultSettings character={null} dark={false} onToggleTheme={noop} onSignOut={noop} />,
    )
    expect(html).toContain('href="/characters/create"')
    expect(text).toContain('No character yet')
  })

  it('reflects the live theme on the toggle (aria-checked)', () => {
    const light = render(
      <DefaultSettings character={character()} dark={false} onToggleTheme={noop} onSignOut={noop} />,
    )
    expect(light.html).toContain('aria-checked="false"')

    const dark = render(
      <DefaultSettings character={character()} dark onToggleTheme={noop} onSignOut={noop} />,
    )
    expect(dark.html).toContain('aria-checked="true"')
  })
})

describe('mobile Settings — dark-mode toggle flips [data-theme]', () => {
  it('flips the cascade attribute via the reused theme mechanism', () => {
    // Minimal document shim: the toggle composes nextTheme + applyTheme, which
    // is exactly what useTheme().toggle runs. Prove the flip end to end.
    const attrs: Record<string, string> = {}
    const previousDocument = (globalThis as { document?: unknown }).document
    ;(globalThis as { document?: unknown }).document = {
      documentElement: {
        setAttribute: (name: string, value: string) => {
          attrs[name] = value
        },
      },
    }
    try {
      let theme: 'light' | 'dark' = 'light'
      applyTheme(theme)
      expect(attrs['data-theme']).toBe('light')

      // One toggle press.
      theme = nextTheme(theme)
      applyTheme(theme)
      expect(theme).toBe('dark')
      expect(attrs['data-theme']).toBe('dark')

      // And back.
      theme = nextTheme(theme)
      applyTheme(theme)
      expect(attrs['data-theme']).toBe('light')
    } finally {
      ;(globalThis as { document?: unknown }).document = previousDocument
    }
  })
})


/**
 * #1773 — the landing half of a failed OAuth callback.
 *
 * A callback is a top-level browser NAVIGATION, so nothing it raises reaches
 * `api/client.ts`: before this, a Discord account with no email address, and an
 * unverified email on either provider (ADR-0075), left the player looking at
 * `{"detail":{"code":"OAUTH_EMAIL_UNVERIFIED",...}}` in the address bar. The
 * backend now redirects here with the code in `?login=`, and this is where it
 * becomes words.
 *
 * One param carries both meanings — `required` is `ProtectedRoute`'s bounce and
 * this page owns its prose; anything else is an `ErrorCode` the `errors.json`
 * catalog owns. All three branches are pinned, including the fallback, because
 * a frontend deployed ahead of its backend is how a brand-new code arrives.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import '../../i18n'
import home from '../../locales/en/home.json'

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: null, refetch: () => {} }),
}))
vi.mock('../../hooks/useGameConfig', () => ({ useGameConfig: () => null }))
vi.mock('../../api/praxis', () => ({ listPraxes: () => Promise.resolve([]) }))
vi.mock('../../api/tasks', () => ({ listTasks: () => Promise.resolve([]) }))
vi.mock('../../api/auth', () => ({ devLogin: () => {}, loginWith: () => {} }))

import Home from '../Home'

function render(search: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[`/${search}`]}>
      <Home />
    </MemoryRouter>
  )
}

describe('Home, ?login=', () => {
  it('says nothing when the param is absent', () => {
    expect(render('')).not.toContain('sign you in')
  })

  it('keeps ProtectedRoute’s own bounce copy', () => {
    expect(render('?login=required')).toContain('You need to log in to access that page')
  })

  it('turns a refused callback’s ErrorCode into the catalog’s words', () => {
    const markup = render('?login=OAUTH_EMAIL_UNVERIFIED')

    // The catalog entry, not the raw code and not the backend's Python prose.
    expect(markup).toContain('that account has no verified email address')
    expect(markup).not.toContain('OAUTH_EMAIL_UNVERIFIED')
  })

  it('falls back for a code this build has never heard of', () => {
    const markup = render('?login=SOME_FUTURE_CODE')

    expect(markup).toContain('That sign-in didn')
    expect(markup).not.toContain('SOME_FUTURE_CODE')
  })

  // #1861 — the hero's two provider buttons moved to `/start`'s auth card. A
  // stranger is owed the explanation before the ask, so the logged-out CTA
  // leads INTO the onboarding arc rather than straight to a provider, and the
  // arc's second card is where Google and Discord now live. The destination
  // itself is an `onClick`, so nothing static can read it; what this pins is
  // that the hero no longer *is* the sign-in.
  it('leads a logged-out visitor into the onboarding arc, not to a provider', () => {
    const markup = render('')

    expect(markup).toContain('data-testid="home-hero-cta"')
    expect(markup).not.toContain('data-testid="sign-in-google"')
    expect(markup).not.toContain('data-testid="sign-in-discord"')
  })

  // #2766 — the door into the arc was itself a placeholder. It is the first
  // line of copy a stranger meets on the public marketing page, under the
  // wordmark and the tagline, and `main` auto-deploys.
  it('says the written words on that CTA, not a placeholder', () => {
    const markup = render('')

    expect(markup).toContain(home.hero.cta.loggedOut)
    expect(home.hero.cta.loggedOut).not.toContain('PLACEHOLDER')
  })
})

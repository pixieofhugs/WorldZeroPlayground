/**
 * #1773 — the landing half of a failed OAuth callback. A callback is a
 * top-level navigation, so its error code arrives in `?login=`: `required` is
 * ProtectedRoute's bounce, anything else an `ErrorCode` worded by
 * `errors.json`, with a fallback for codes this build doesn't know.
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

    expect(markup).toContain('that account has no verified email address')
    expect(markup).not.toContain('OAUTH_EMAIL_UNVERIFIED')
  })

  it('falls back for a code this build has never heard of', () => {
    const markup = render('?login=SOME_FUTURE_CODE')

    expect(markup).toContain('That sign-in didn')
    expect(markup).not.toContain('SOME_FUTURE_CODE')
  })

  // #1861: providers live on `/start`'s auth card. The destination is an
  // `onClick`, so this pins only that the hero is not the sign-in.
  it('leads a logged-out visitor into the onboarding arc, not to a provider', () => {
    const markup = render('')

    expect(markup).toContain('data-testid="home-hero-cta"')
    expect(markup).not.toContain('data-testid="sign-in-google"')
    expect(markup).not.toContain('data-testid="sign-in-discord"')
  })

  // #2766: a stranger's first line of copy, and `main` auto-deploys.
  it('says the written words on that CTA, not a placeholder', () => {
    const markup = render('')

    expect(markup).toContain(home.hero.cta.loggedOut)
    expect(home.hero.cta.loggedOut).not.toContain('PLACEHOLDER')
  })
})

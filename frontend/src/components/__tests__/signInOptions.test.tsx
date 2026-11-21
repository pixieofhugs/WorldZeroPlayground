/**
 * #1773: logged-out surfaces offer every provider the backend serves. #1738: a
 * provider is named only on its own button.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../i18n'

const loginWith = vi.fn()
vi.mock('../../api/auth', () => ({ loginWith: (p: string) => loginWith(p) }))

import SignInOptions from '../SignInOptions'

describe('SignInOptions', () => {
  it('offers every provider the backend serves a leg for', () => {
    const markup = renderToStaticMarkup(<SignInOptions />)

    expect(markup).toContain('data-testid="sign-in-google"')
    expect(markup).toContain('data-testid="sign-in-discord"')
    expect(markup).toContain('Continue with Google')
    expect(markup).toContain('Continue with Discord')
  })

  it('gives neither provider the visual primacy of being the default', () => {
    const markup = renderToStaticMarkup(<SignInOptions />)
    const classes = [...markup.matchAll(/class="([^"]*)"/g)].map((m) => m[1])

    expect(classes).toHaveLength(2)
    expect(classes[0]).toBe(classes[1])
  })
})

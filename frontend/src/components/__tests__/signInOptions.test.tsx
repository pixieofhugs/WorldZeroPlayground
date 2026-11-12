/**
 * #1773: logged-out surfaces offer every provider the backend serves. #1738: a
 * provider is named only on its own button. `drawAtRoot` renders inline here
 * (no `document`), so the sheet is assertable.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import '../../i18n'

const loginWith = vi.fn()
vi.mock('../../api/auth', () => ({ loginWith: (p: string) => loginWith(p) }))

import SignInOptions, { SignInSheet } from '../SignInOptions'

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

describe('SignInSheet', () => {
  it('draws nothing until it is opened', () => {
    expect(renderToStaticMarkup(<SignInSheet open={false} onClose={() => {}} />)).toBe('')
  })

  it('opens both ways in, under framing copy that names neither (#1738)', () => {
    const markup = renderToStaticMarkup(<SignInSheet open onClose={() => {}} />)

    expect(markup).toContain('data-testid="sign-in-google"')
    expect(markup).toContain('data-testid="sign-in-discord"')

    const framing = markup.replace(/<button[\s\S]*?<\/button>/g, '')
    expect(framing).toContain('Somewhere to keep your score')
    expect(framing).not.toMatch(/Google|Discord/)
  })

  it('is a labelled modal, not a bare div', () => {
    const markup = renderToStaticMarkup(<SignInSheet open onClose={() => {}} />)

    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('aria-modal="true"')
  })
})

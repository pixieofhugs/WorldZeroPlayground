/**
 * `SignInSheet`'s chassis by form factor (#2355): centred card on a laptop,
 * bottom sheet on a phone, as `ConfirmDialog` does. Copy is
 * `signInOptions.test.tsx`'s. `useFormFactor` is mocked: SSR always says desktop.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '../../i18n'

const mocks = vi.hoisted(() => ({ formFactor: 'desktop' as 'mobile' | 'desktop' }))

vi.mock('../../hooks/useFormFactor', () => ({
  useFormFactor: () => mocks.formFactor,
}))

vi.mock('../../api/auth', () => ({ loginWith: () => {} }))

const { SignInSheet } = await import('../SignInOptions')

const draw = (formFactor: 'mobile' | 'desktop') => {
  mocks.formFactor = formFactor
  return renderToStaticMarkup(<SignInSheet open onClose={() => {}} />)
}

describe('SignInSheet chassis', () => {
  beforeEach(() => {
    mocks.formFactor = 'desktop'
  })

  it('reads the phone-flipped chassis vars', () => {
    const markup = draw('desktop')

    expect(markup).toContain('align-items:var(--signin-align)')
    expect(markup).toContain('width:var(--signin-width)')
    expect(markup).toContain('border:var(--signin-border)')
    expect(markup).toContain('border-radius:var(--signin-radius)')
  })

  it('keeps the grab handle to the form that can be dragged', () => {
    expect(draw('mobile')).toContain('width:38px')
    expect(draw('desktop')).not.toContain('width:38px')
  })

  it('offers the same ways in and the same ways out in both forms', () => {
    for (const form of ['mobile', 'desktop'] as const) {
      const markup = draw(form)

      expect(markup).toContain('role="dialog"')
      expect(markup).toContain('aria-modal="true"')
      expect(markup).toContain('data-testid="sign-in-google"')
      expect(markup).toContain('data-testid="sign-in-discord"')
      expect(markup).toContain('aria-label="Close"')
    }
  })
})

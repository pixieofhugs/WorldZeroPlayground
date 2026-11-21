import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ErrorBanner } from '../ErrorBanner'

describe('ErrorBanner', () => {
  it('announces the message and keeps the caller spacing class', () => {
    const html = renderToStaticMarkup(<ErrorBanner className="mb-4" message="Nope" />)
    expect(html).toContain('role="alert"')
    expect(html).toContain('font-body mb-4')
  })

  it('renders nothing for an empty message', () => {
    expect(renderToStaticMarkup(<ErrorBanner message="" />)).toBe('')
  })
})

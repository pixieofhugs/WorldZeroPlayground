// @vitest-environment jsdom
/**
 * Seam: ErrorBoundary + the `vite:preloadError` listener, with `location.reload` spied.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '../../i18n'
import ErrorBoundary, { onPreloadError } from '../ErrorBoundary'

const reload = vi.fn()

beforeEach(() => {
  sessionStorage.clear()
  window.addEventListener('vite:preloadError', onPreloadError)
  reload.mockReset()
  vi.stubGlobal('location', { reload })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  cleanup()
  window.removeEventListener('vite:preloadError', onPreloadError)
  vi.restoreAllMocks()
})

function Boom({ message }: { message: string }): never {
  throw new Error(message)
}

const mount = (message: string) =>
  render(
    <ErrorBoundary>
      <Boom message={message} />
    </ErrorBoundary>,
  )

describe('ErrorBoundary', () => {
  it('shows the fallback with a reload button when a child throws', () => {
    mount('kaboom')
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(reload).not.toHaveBeenCalled()
    screen.getByRole('button').click()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads once on a dynamic-import error, then only shows the fallback', () => {
    mount('Failed to fetch dynamically imported module: /assets/x.js')
    expect(reload).toHaveBeenCalledTimes(1)
    mount('Importing a module script failed.')
    expect(reload).toHaveBeenCalledTimes(1)
    expect(screen.getAllByRole('alert').length).toBe(2)
  })

  it('vite:preloadError reloads once and is swallowed only that once', () => {
    const fire = () => {
      const e = new Event('vite:preloadError', { cancelable: true })
      window.dispatchEvent(e)
      return e.defaultPrevented
    }
    expect(fire()).toBe(true)
    expect(fire()).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })
})

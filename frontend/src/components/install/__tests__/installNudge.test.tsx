// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '../../../i18n'
import InstallNudge from '../InstallNudge'
import { captureInstallPrompt, INSTALL_DISMISSED_KEY } from '../../../utils/installPrompt'

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

function setUa(ua: string) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua)
}

function media(phone: boolean, standalone = false) {
  window.matchMedia = vi.fn((q: string) => ({
    matches: q.includes('standalone') ? standalone : phone,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  localStorage.clear()
  media(true)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  window.dispatchEvent(new Event('appinstalled')) // clears the module-level `held`
})

describe('InstallNudge', () => {
  it('shows nothing without an iPhone or a held event', () => {
    const { container } = render(<InstallNudge />)
    expect(container.innerHTML).toBe("")
  })

  it('iPhone: three steps; Done it dismisses forever', () => {
    setUa(IPHONE_UA)
    const { unmount } = render(<InstallNudge />)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: /done it/i }))
    expect(localStorage.getItem(INSTALL_DISMISSED_KEY)).toBe('1')
    unmount()
    expect(render(<InstallNudge />).container.innerHTML).toBe("")
  })

  it('hidden when standalone', () => {
    setUa(IPHONE_UA)
    media(true, true)
    expect(render(<InstallNudge />).container.innerHTML).toBe("")
  })

  it('desktop: no card when beforeinstallprompt fires', () => {
    media(false)
    captureInstallPrompt()
    const { container } = render(<InstallNudge />)
    act(() => {
      window.dispatchEvent(Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt: vi.fn() }))
    })
    expect(container.innerHTML).toBe('')
  })

  it('Android: appears once the event fires; Install calls prompt()', async () => {
    captureInstallPrompt()
    render(<InstallNudge />)
    const prompt = vi.fn().mockResolvedValue(undefined)
    act(() => {
      window.dispatchEvent(Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt }))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^install$/i }))
    })
    expect(prompt).toHaveBeenCalled()
    expect(localStorage.getItem(INSTALL_DISMISSED_KEY)).toBe('1')
  })
})

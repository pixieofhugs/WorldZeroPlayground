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

beforeEach(() => {
  localStorage.clear()
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
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
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
    expect(render(<InstallNudge />).container.innerHTML).toBe("")
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

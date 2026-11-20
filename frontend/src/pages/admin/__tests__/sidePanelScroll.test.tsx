// @vitest-environment jsdom
/** Seam: SidePanel mount. On phone the panel wraps under the table, so it scrolls itself into view; the effect must not return the call's value (React treats it as a cleanup and crashes on unmount). */
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import '../../../i18n'
import { SidePanel } from '../AdminList'

afterEach(cleanup)

it('scrolls into view on mount and unmounts cleanly', () => {
  const scroll = vi.fn(() => 'not-a-cleanup')
  Element.prototype.scrollIntoView = scroll as unknown as typeof Element.prototype.scrollIntoView
  const view = render(<SidePanel label="P" badge={<b>P</b>} onClose={() => {}}>x</SidePanel>)
  expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' })
  expect(() => view.unmount()).not.toThrow()
})

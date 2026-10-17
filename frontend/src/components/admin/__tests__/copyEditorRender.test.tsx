// @vitest-environment jsdom
/**
 * The seam: `CopyEditor` actually mounted, effects and clicks included.
 *
 * #3081 shipped with two defects no `renderToStaticMarkup` test can see because
 * it runs no effects: the arm effect re-ran on every store event and so looped
 * ("Maximum update depth exceeded"), and Revert wrote the override straight
 * back. This arms the editor, clicks a string, and reverts it.
 */
import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useTranslation } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { deleteCopyOverride } from '../../../api/copy'
import i18n from '../../../i18n'
import CopyEditor, { shippedValue } from '../CopyEditor'

vi.mock('../../../api/copy', () => ({
  putCopyOverride: vi.fn(),
  deleteCopyOverride: vi.fn(),
}))

const NS = 'common'
const KEY = 'brand'

function Page() {
  const { t } = useTranslation(NS)
  return <p>{t(KEY)}</p>
}

beforeEach(() => {
  // jsdom has no matchMedia; `useFormFactor` asks for it. Desktop.
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
  vi.mocked(deleteCopyOverride).mockResolvedValue(undefined)
  // An override in force, as after a save.
  i18n.addResource('en', NS, KEY, 'Overridden Zero')
})
afterEach(() => {
  vi.unstubAllGlobals()
  cleanup()
  i18n.addResource('en', NS, KEY, shippedValue(NS, KEY))
})

describe('CopyEditor, mounted', () => {
  it('settles after arming instead of looping', async () => {
    let renders = 0
    render(
      <Profiler id="editor" onRender={() => (renders += 1)}>
        <CopyEditor />
      </Profiler>,
    )
    fireEvent.click(screen.getByText('edit copy'))
    await screen.findByText('stop editing copy')

    await new Promise((resolve) => setTimeout(resolve, 50))
    const settled = renders
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(renders).toBe(settled)
    expect(settled).toBeLessThan(10)
  })

  it('Revert puts the shipped wording back', async () => {
    render(
      <>
        <Page />
        <CopyEditor />
      </>,
    )
    fireEvent.click(screen.getByText('edit copy'))
    await screen.findByText('stop editing copy')

    fireEvent.click(screen.getByText('Overridden Zero'))
    fireEvent.click(await screen.findByText('revert to default'))

    await waitFor(() => expect(i18n.getResource('en', NS, KEY)).toBe(shippedValue(NS, KEY)))
    expect(deleteCopyOverride).toHaveBeenCalledWith(NS, KEY)
    expect(shippedValue(NS, KEY)).not.toBe('Overridden Zero')
  })
})

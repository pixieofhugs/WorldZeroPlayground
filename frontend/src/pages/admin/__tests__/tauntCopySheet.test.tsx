// @vitest-environment jsdom
/** The taunt sheet: a click on a rendered taunt opens its own `taunts:` key, and a save that drops a name is refused. */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { putCopyOverride } from '../../../api/copy'
import i18n from '../../../i18n'
import taunts from '../../../locales/en/taunts.json'
import CopyEditor, { shippedValue } from '../../../components/admin/CopyEditor'
import TauntCopySheet from '../TauntCopySheet'

vi.mock('../../../api/copy', () => ({
  putCopyOverride: vi.fn(),
  deleteCopyOverride: vi.fn(),
}))

const KEY = 'coven.level_up.0'
const shipped = taunts.coven.level_up[0]
const rendered = shipped.replace('{{from_name}}', 'Ada').replace('{{to_name}}', 'Bo')

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
  vi.mocked(putCopyOverride).mockResolvedValue(undefined as never)
})
afterEach(() => {
  vi.unstubAllGlobals()
  cleanup()
  i18n.addResource('en', 'taunts', KEY, shippedValue('taunts', KEY))
})

async function openTaunt() {
  const { container } = render(
    <MemoryRouter>
      <TauntCopySheet />
      <CopyEditor />
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByText('edit copy'))
  await screen.findByText('stop editing copy')
  const quote = screen.getAllByText(`“${rendered}”`)[0]
  fireEvent.click(quote)
  await screen.findByLabelText('Replacement wording')
  return container
}

describe('the taunt copy sheet', () => {
  it('opens the taunt key, not the quote wrapper, and saves a reword', async () => {
    await openTaunt()
    expect(screen.getByText(`taunts:${KEY}`)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Replacement wording'), {
      target: { value: '{{from_name}} out-leveled {{to_name}}.' },
    })
    fireEvent.click(screen.getByText('save'))
    await waitFor(() => expect(putCopyOverride).toHaveBeenCalledWith({ ns: 'taunts', key: KEY, value: '{{from_name}} out-leveled {{to_name}}.' }))
  })

  it('refuses a save that drops a name', async () => {
    await openTaunt()
    fireEvent.change(screen.getByLabelText('Replacement wording'), {
      target: { value: '{{from_name}} out-leveled everyone.' },
    })
    fireEvent.click(screen.getByText('save'))
    await screen.findByText(/Put .*to_name/)
    expect(putCopyOverride).not.toHaveBeenCalled()
  })

  it('labels the default fallback for a branch with no taunts of its own', () => {
    const { container } = render(
      <MemoryRouter>
        <TauntCopySheet />
      </MemoryRouter>,
    )
    expect(container.querySelector('[data-sheet-branch="albescent"]')?.textContent).toContain('players get the default')
  })
})

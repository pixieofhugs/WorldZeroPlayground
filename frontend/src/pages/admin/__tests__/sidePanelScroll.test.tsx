// @vitest-environment jsdom
/** Seam: SidePanel mount + useSelection. Phone shows the panel as a sheet, so it takes focus, Esc closes it, focus returns to the row; opening pushes one history entry that closing pops. */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigationType } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import '../../../i18n'
import { SidePanel, useSelection } from '../AdminList'

afterEach(cleanup)

it('focuses the sheet, closes on Esc, returns focus to the row, never scrolls itself', () => {
  const scroll = vi.fn()
  Element.prototype.scrollIntoView = scroll
  const onClose = vi.fn()
  const row = document.createElement('button')
  document.body.append(row)
  row.focus()
  const view = render(<SidePanel label="P" badge={<b>P</b>} onClose={onClose}>x</SidePanel>)
  expect(document.activeElement).toBe(screen.getByLabelText('P'))
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(onClose).toHaveBeenCalledTimes(1)
  view.unmount()
  expect(document.activeElement).toBe(row)
  expect(scroll).not.toHaveBeenCalled()
  row.remove()
})

it('open pushes, switching replaces, close pops back to the list', () => {
  let sel: ReturnType<typeof useSelection> | undefined
  function Probe() {
    sel = useSelection('task')
    const loc = useLocation()
    return <i data-testid="s">{`${loc.search}|${useNavigationType()}`}</i>
  }
  render(<MemoryRouter initialEntries={['/a']}><Probe /></MemoryRouter>)
  const at = () => screen.getByTestId('s').textContent
  act(() => sel![1](1))
  expect(at()).toBe('?task=1|PUSH')
  act(() => sel![1](2))
  expect(at()).toBe('?task=2|REPLACE')
  act(() => sel![1](null))
  expect(at()).toBe('|POP')
})

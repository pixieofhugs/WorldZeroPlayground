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

let sel: ReturnType<typeof useSelection> | undefined
function Probe() {
  sel = useSelection('task')
  const loc = useLocation()
  return <i data-testid="s">{`${loc.search}|${useNavigationType()}`}</i>
}

it('open pushes, switching replaces, close pops back to the list', () => {
  render(<MemoryRouter initialEntries={['/a']}><Probe /></MemoryRouter>)
  const at = () => screen.getByTestId('s').textContent
  act(() => sel![1](1))
  expect(at()).toBe('?task=1|PUSH')
  act(() => sel![1](2))
  expect(at()).toBe('?task=2|REPLACE')
  act(() => sel![1](null))
  expect(at()).toBe('|POP')
})

it('a deep-linked panel closes by replacing, never navigating back', () => {
  render(<MemoryRouter initialEntries={['/a', '/a?task=1']} initialIndex={1}><Probe /></MemoryRouter>)
  act(() => sel![1](null))
  expect(screen.getByTestId('s').textContent).toBe('|REPLACE')
})

it('closing returns focus to the row last opened, not the first', () => {
  function PanelProbe() {
    sel = useSelection('task')
    return sel[0] ? <SidePanel key={sel[0]} label="P" badge={<b>P</b>} onClose={() => sel![1](null)}>x</SidePanel> : null
  }
  const [a, b] = [document.createElement('button'), document.createElement('button')]
  document.body.append(a, b)
  render(<MemoryRouter><PanelProbe /></MemoryRouter>)
  a.focus()
  act(() => sel![1](1))
  b.focus()
  act(() => sel![1](2))
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(document.activeElement).toBe(b)
  a.remove()
  b.remove()
})

it('Esc inside a form field leaves the panel open', () => {
  const onClose = vi.fn()
  render(<SidePanel label="P" badge={<b>P</b>} onClose={onClose}><input aria-label="f" /></SidePanel>)
  fireEvent.keyDown(screen.getByLabelText('f'), { key: 'Escape' })
  expect(onClose).not.toHaveBeenCalled()
})

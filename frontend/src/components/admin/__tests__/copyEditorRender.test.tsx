// @vitest-environment jsdom
/** `CopyEditor` mounted with effects: arming must not loop, Revert must revert (#3081). */
import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useTranslation } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { deleteCopyOverride } from '../../../api/copy'
import i18n from '../../../i18n'
import CopyEditor, { shippedValue } from '../CopyEditor'
import { MARK } from '../copyProbe'

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
  // jsdom has no matchMedia. Desktop.
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
  vi.mocked(deleteCopyOverride).mockResolvedValue(undefined)
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

  it('a stray page click keeps an unsaved draft, and cancel clears the notice', async () => {
    render(
      <>
        <Page />
        <span>not copy</span>
        <CopyEditor />
      </>,
    )
    fireEvent.click(screen.getByText('edit copy'))
    await screen.findByText('stop editing copy')
    fireEvent.click(screen.getByText('Overridden Zero'))
    const box = await screen.findByLabelText('Replacement wording')
    fireEvent.change(box, { target: { value: 'My unsaved words' } })

    fireEvent.click(screen.getByText('not copy'))

    expect(screen.getByLabelText('Replacement wording')).toHaveProperty('value', 'My unsaved words')
    expect(screen.getByRole('status').textContent).toMatch(/unsaved/)
    fireEvent.click(screen.getByText('cancel'))
    expect(screen.queryByRole('status')).toBeNull()
  })
})


function SameWording() {
  const { t } = useTranslation(['common', 'home', 'feed'])
  return (
    <>
      <a href="/tasks">{t('common:nav.tasks')}</a>
      <span>{t('home:signedIn.browse.tabs.tasks')}</span>
      <i>{t('feed:taskCard.pointsUnit', { count: 2 })}</i>
      <b>{t('common:leaderboard.points')}</b>
    </>
  )
}

describe('CopyEditor, one wording from several keys', () => {
  it('opens the key that renders in the clicked spot, without asking', async () => {
    const { container } = render(
      <>
        <SameWording />
        <CopyEditor />
      </>,
    )
    fireEvent.click(screen.getByText('edit copy'))
    await screen.findByText('stop editing copy')

    const opened = (selector: string) => {
      fireEvent.click(container.querySelector(selector)!)
      const key = screen.queryByText(/^\w+:[\w.]+$/)?.textContent
      fireEvent.click(screen.getByText('cancel'))
      return key
    }
    expect(opened('a')).toBe('common:nav.tasks')
    expect(opened('span')).toBe('home:signedIn.browse.tabs.tasks')
    // Its rival is plural-only: no string of its own, so the forms get marked.
    expect(opened('b')).toBe('common:leaderboard.points')
    expect(screen.queryByText(/Several keys/)).toBeNull()

    fireEvent.click(container.querySelector('i')!)
    expect(screen.getByText(/form for each count/)).toBeTruthy()
    expect(container.textContent).not.toContain(MARK)
  })
})

describe('CopyEditor, edit box over the spot (#3453)', () => {
  const open = async (mobile: boolean) => {
    vi.stubGlobal('matchMedia', () => ({
      matches: mobile,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
    render(
      <>
        <Page />
        <CopyEditor />
      </>,
    )
    const spot = screen.getByText('Overridden Zero')
    spot.getBoundingClientRect = () => new DOMRect(30, 50, 200, 24)
    fireEvent.click(screen.getByText('edit copy'))
    await screen.findByText('stop editing copy')
    fireEvent.click(spot)
    return (await screen.findByLabelText('Replacement wording')) as HTMLTextAreaElement
  }

  it('desktop: the textarea sits at the clicked text', async () => {
    const box = await open(false)
    expect(box.style.position).toBe('fixed')
    expect([box.style.left, box.style.top, box.style.minWidth]).toEqual(['30px', '50px', '200px'])
  })

  it('phone: it stays in the panel', async () => {
    expect((await open(true)).style.position).not.toBe('fixed')
  })
})

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useModal } from '../useModal'

afterEach(cleanup)

function Modal({ onClose }: { onClose?: () => void }) {
  const ref = useModal(onClose)
  return (
    <div ref={ref} role="dialog" aria-label="m">
      <button>first</button>
      <button>last</button>
    </div>
  )
}

function Host({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>opener</button>
      <button>outside</button>
      {open && <Modal onClose={onClose ?? (() => setOpen(false))} />}
    </>
  )
}

const tab = (shiftKey = false) => fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey })

describe('useModal', () => {
  it('moves focus in, wraps Tab both ways, and restores focus on close', () => {
    render(<Host />)
    const opener = screen.getByText('opener')
    opener.focus()
    fireEvent.click(opener)
    expect(document.activeElement).toBe(screen.getByText('first'))

    const notPrevented = fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey: true })
    expect(notPrevented).toBe(false)
    expect(document.activeElement).toBe(screen.getByText('last'))
    tab()
    expect(document.activeElement).toBe(screen.getByText('first'))

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it('pulls focus back in if it strayed outside', () => {
    render(<Host />)
    fireEvent.click(screen.getByText('opener'))
    screen.getByText('outside').focus()
    tab()
    expect(document.activeElement).toBe(screen.getByText('first'))
  })

  it('does nothing on Escape without onClose, and only the top modal answers', () => {
    const outer = vi.fn()
    const inner = vi.fn()
    render(
      <>
        <Modal onClose={outer} />
        <Modal onClose={inner} />
      </>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(inner).toHaveBeenCalledTimes(1)
    expect(outer).not.toHaveBeenCalled()
    cleanup()
    render(<Modal />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('a keyed queue hands the first opener down and keeps each autoFocus', () => {
    function Queued({ id, next }: { id: number; next: () => void }) {
      const ref = useModal(next)
      return (
        <div ref={ref} role="dialog" aria-label="q">
          <button>skip{id}</button>
          <button autoFocus onClick={next}>apply{id}</button>
        </div>
      )
    }
    function Queue() {
      const [n, setN] = useState(0)
      return (
        <>
          <button onClick={() => setN(3)}>add</button>
          {n > 0 && <Queued key={n} id={n} next={() => setN(n - 1)} />}
        </>
      )
    }
    render(<Queue />)
    const add = screen.getByText('add')
    add.focus()
    fireEvent.click(add)
    expect(document.activeElement).toBe(screen.getByText('apply3'))
    fireEvent.click(screen.getByText('apply3'))
    expect(document.activeElement).toBe(screen.getByText('apply2'))
    fireEvent.click(screen.getByText('apply2'))
    expect(document.activeElement).toBe(screen.getByText('apply1'))
    fireEvent.click(screen.getByText('apply1'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(add)
  })

  it('an inactive (preview) modal does not trap Tab or answer Escape', () => {
    function Preview({ onClose }: { onClose: () => void }) {
      const ref = useModal(onClose, false)
      return (
        <div ref={ref} role="dialog" aria-label="p">
          <button>inside</button>
        </div>
      )
    }
    const onClose = vi.fn()
    render(
      <>
        <button>editor</button>
        <Preview onClose={onClose} />
      </>,
    )
    screen.getByText('editor').focus()
    expect(fireEvent.keyDown(document.activeElement!, { key: 'Tab' })).toBe(true)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByText('editor'))
  })
})

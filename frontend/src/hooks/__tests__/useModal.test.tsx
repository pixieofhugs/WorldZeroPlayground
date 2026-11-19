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
})

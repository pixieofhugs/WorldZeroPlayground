import { useEffect, useRef } from 'react'

// Disabled nodes excluded or the Tab wrap lands on a dead node.
const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

// Open modals, topmost last: only the top one answers Escape and Tab.
const open: object[] = []

/**
 * The one modal behaviour every `role="dialog"` uses (#3568): focus moves in
 * (unless something inside already took it, e.g. `autoFocus`), Tab wraps inside,
 * Escape calls `onClose`, focus returns to the opener on unmount. Attach the
 * returned ref to the `role="dialog"` element. Omit `onClose` for a dialog that
 * must not be dismissed with Escape; pass `active=false` while a gated dialog is
 * closed. Guarded by `modalDialogs.test.ts`.
 */
export function useModal<T extends HTMLElement = HTMLDivElement>(
  onClose?: () => void,
  active = true,
) {
  const ref = useRef<T>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  // Read in render: `autoFocus` moves focus during commit, before any effect.
  const opener = useRef<Element | null>(null)
  if (active && !opener.current && typeof document !== 'undefined') {
    opener.current = document.activeElement
  }

  useEffect(() => {
    const panel = ref.current
    if (!active || !panel) return
    const token = {}
    open.push(token)
    if (!panel.contains(document.activeElement)) {
      const first = panel.querySelector<HTMLElement>(FOCUSABLE)
      if (first) first.focus()
      else {
        panel.tabIndex = -1
        panel.focus()
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (open[open.length - 1] !== token) return
      if (event.key === 'Escape') {
        closeRef.current?.()
        return
      }
      if (event.key !== 'Tab') return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const at = document.activeElement
      const edge = event.shiftKey ? first : last
      if (!panel.contains(at) || at === panel || at === edge) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      open.splice(open.indexOf(token), 1)
      const back = opener.current
      opener.current = null
      if (back instanceof HTMLElement) back.focus()
    }
  }, [active])

  return ref
}

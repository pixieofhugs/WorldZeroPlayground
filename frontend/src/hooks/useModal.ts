import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href],[tabindex]:not([tabindex="-1"]),:is(button,input,select,textarea):not(:disabled)'

// Open modals, topmost last: only the top one answers Escape and Tab.
const open: object[] = []

/**
 * Shared modal behaviour (#3568); attach the ref to the `role="dialog"` element.
 * Omit `onClose` for a dialog Escape must not dismiss; `active=false` while a
 * gated dialog is closed. Guarded by `modalDialogs.test.ts`.
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
    const items = () => [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)]
    if (!panel.contains(document.activeElement)) {
      panel.tabIndex = -1
      ;(items()[0] ?? panel).focus()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (open[open.length - 1] !== token) return
      if (e.key === 'Escape') return closeRef.current?.()
      if (e.key !== 'Tab') return
      const list = items()
      const at = document.activeElement
      const edge = list[e.shiftKey ? 0 : list.length - 1]
      if (!list.length || at === panel || at === edge || !panel.contains(at)) {
        e.preventDefault()
        list[e.shiftKey ? list.length - 1 : 0]?.focus()
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

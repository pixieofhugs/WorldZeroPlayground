import { useEffect, useState } from 'react'

/**
 * Debounces a rapidly-changing value (e.g. a search box) so downstream effects —
 * a `useResource` refetch keyed on it — fire once the value settles rather than
 * on every keystroke. Precedent: the mention autocomplete's `DEBOUNCE_MS = 200`
 * (`components/comments/useMentionAutocomplete.tsx`). Kept as its own 8-line
 * hook rather than sharing that one — its debounce is tangled with caret/token
 * logic, so prying it out is a bigger diff than this (#644).
 */
export function useDebouncedValue<T>(value: T, delayMs = 200): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

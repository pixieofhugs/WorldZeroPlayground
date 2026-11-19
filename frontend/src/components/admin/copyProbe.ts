import { flushSync } from 'react-dom'
import i18n from '../../i18n'
import type { CopyTarget } from '../../utils/copyRegistry'

/** Invisible separator: marks a value without moving the layout. */
export const MARK = String.fromCharCode(0x2063)
const PLURALS = ['zero', 'one', 'two', 'few', 'many', 'other']

const rerender = () => flushSync(() => i18n.emit('languageChanged', i18n.language))

/** The stored strings behind a key: itself, or its plural forms. */
function storedKeys({ ns, key }: CopyTarget): string[] {
  const own = [key, ...PLURALS.map((form) => `${key}_${form}`)]
  return own.filter((stored) => typeof i18n.getResource('en', ns, stored) === 'string')
}

/** Marks each candidate's value and re-renders: those whose mark lands in `el`
 * are on screen there. No hit (memoised copy) keeps all. */
export function candidatesShownIn(el: Element, candidates: CopyTarget[]): CopyTarget[] {
  const shown = candidates.filter((candidate) => {
    const { ns } = candidate
    const originals = storedKeys(candidate).map((key) => [key, i18n.getResource('en', ns, key) as string])
    try {
      for (const [key, value] of originals) i18n.addResource('en', ns, key, MARK + value, { silent: true })
      rerender()
      return el.textContent?.includes(MARK) ?? false
    } finally {
      for (const [key, value] of originals) i18n.addResource('en', ns, key, value, { silent: true })
    }
  })
  rerender()
  return shown.length > 0 ? shown : candidates
}

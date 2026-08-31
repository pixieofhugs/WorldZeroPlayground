// LanguageSection preview cell — the account's language, read from `useAuth()`
// and written with a POST. In the harness it renders against the provider's mock
// authed UA user, so the current-language row is that user's.
//
// ONE CELL: the picker's selection and the sending/error states are internal
// useState with no prop to pose them, so a second cell would be this card again.
import { LanguageSection } from 'worldzero-frontend'

export function Language() {
  return (
    <div style={{ padding: 24, maxWidth: 760, background: 'var(--color-bg-page)' }}>
      <LanguageSection sectionId="sec-language" />
    </div>
  )
}

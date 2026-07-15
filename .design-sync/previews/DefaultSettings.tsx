// DefaultSettings mobile screen — real controls: account identity, dark-mode
// switch (reflects the live [data-theme] cascade), and sign-out.
import { DefaultSettings } from 'worldzero-frontend'
import { makeCharacter, noop } from './_fixtures'

/** Settings for a signed-in UA life, light theme. */
export function Settings() {
  return (
    <DefaultSettings
      character={makeCharacter()}
      dark={false}
      onToggleTheme={noop}
      onSignOut={noop}
    />
  )
}

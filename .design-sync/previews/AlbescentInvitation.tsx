// AlbescentInvitation preview cells — the order's standing correspondence (#395).
// A vellum letter (always-light Albescent tokens): surveyor's-mark sigil, a
// "terms, plainly" slip, a life-picker, and the "Accept the order" CTA. It takes
// the account roster and renders only when at least one active, non-Albescent
// life could take up the work.
//
// Copy lives in factions.json under albescent.invitation.* (resolved via i18next).
import { AlbescentInvitation } from 'worldzero-frontend'
import type { CharacterOut } from '../../frontend/src/api/auth'
import { characterFor, noop } from './_fixtures'

// A small roster of eligible lives — active and not already Albescent, so the
// order will consider each. Distinct ids so the life-picker chips are stable.
const roster: CharacterOut[] = [
  characterFor('ua', { id: 7, display_name: 'Ada Reed', username: 'ada_reed', status: 'active' }),
  characterFor('wow', { id: 8, display_name: 'Pip Marigold', username: 'pip_marigold', status: 'active' }),
  characterFor('everymen', { id: 9, display_name: 'Sam Okafor', username: 'sam_okafor', status: 'active' }),
]

/** The full letter: three eligible lives, first selected, awaiting an answer. */
export function StandingLetter() {
  return <AlbescentInvitation lives={roster} onJoined={noop} />
}

/** A single eligible life — the shortest life-picker (one chip, pre-selected). */
export function SingleLife() {
  const one: CharacterOut[] = [
    characterFor('snide', { id: 12, display_name: 'Rax Vandal', username: 'rax_vandal', status: 'active' }),
  ]
  return <AlbescentInvitation lives={one} onJoined={noop} />
}

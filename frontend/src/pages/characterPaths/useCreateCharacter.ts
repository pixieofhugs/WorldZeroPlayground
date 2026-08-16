import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { createCharacter, uploadCharacterAvatar, type CharacterCreate } from '../../api/characters'
import { getInvitedFactions } from '../../api/me'
import { extractError } from '../../utils/errors'
import { resolveHandoffDestination } from '../../utils/onboardingHandoff'
import { useAvatarPicker } from './useAvatarPicker'

/**
 * Shared read/write model for Adaptive Character Creation (#273, ADR-0019),
 * lifted out of CreateCharacter so the desktop screen and the mobile skin
 * (#516) render the same one submit path. Presentation-only skins consume this;
 * no faction is ever sent unless the account holds a matching invitation, so a
 * brand-new account is born unaffiliated ("na").
 */

export const NAME_MAX = 22
export const BIO_MAX = 160
/**
 * Mirror of the server's cap (`schemas.character`, #1628). The server is the
 * authority — this only stops the field growing past what the profile header's
 * identity slot can hold before the request is spent.
 *
 * Shared with the edit path, which imports it from here: unlike NAME_MAX and
 * BIO_MAX, whose edit-side twins are different numbers (50 and 500), one cap
 * governs a tagline wherever it is typed, and two literals would be free to
 * drift apart.
 */
export const TAGLINE_MAX = 140

/**
 * A tagline is one line, whatever it was typed into.
 *
 * Desktop create offers a two-row `textarea` — 140 characters want more than one
 * row to read — while both edit surfaces are single-line `input`s. That makes
 * create the only branch that can put a literal newline on the wire, and #1629
 * lays this value into a 30px `max-width: 22ch` slot where it is meant to WRAP,
 * not to carry breaks the author chose. `bio` is the field that keeps typed line
 * breaks; that is the whole reason the two are separate (#1628).
 *
 * So the rows are an affordance for reading, not a promise about the value, and
 * any run of whitespace collapses to a single space before it is sent.
 */
export function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/**
 * The submit gate both character forms share: a name that is more than
 * whitespace, and no request already in flight.
 *
 * `display_name` is `StringConstraints(strip_whitespace=True, min_length=1)` on
 * the wire (`backend/schemas/character.py`, #1686), so a blank name is a 422 —
 * and a 422 renders Pydantic's own English ("String should have at least 1
 * character"), copy that never passed through the i18n catalogue (ADR-0032).
 * Closing the control is the whole answer (#1697): it makes that response
 * unreachable from the UI rather than translating it.
 *
 * Lives here, exported, because the edit hook is the second caller and one rule
 * stated twice drifts — and because the frontend harness has no DOM, so a rule
 * inlined in a hook body cannot be driven by a test.
 */
export function canSubmitName(displayName: string, busy: boolean): boolean {
  return displayName.trim().length > 0 && !busy
}

/** Mirror of the server @handle derivation (services/character._derive_unique_username). */
export function previewHandle(displayName: string): string {
  return displayName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) || 'wanderer'
}

/**
 * Build the create payload. A faction is only ever carried when the account was
 * invited to it; otherwise `faction_slug` is undefined → born unaffiliated.
 */
export function buildCreatePayload(
  displayName: string,
  bio: string,
  tagline: string,
  factionSlug: string,
  invited: string[],
): CharacterCreate {
  const picked = factionSlug && invited.includes(factionSlug) ? factionSlug : undefined
  return {
    display_name: displayName.trim(),
    bio: bio || undefined,
    tagline: oneLine(tagline) || undefined,
    faction_slug: picked,
  }
}

export interface CreateCharacterState {
  displayName: string
  setDisplayName: (value: string) => void
  bio: string
  setBio: (value: string) => void
  tagline: string
  setTagline: (value: string) => void
  factionSlug: string
  setFactionSlug: (value: string) => void
  invited: string[]
  /**
   * The cropped portrait awaiting upload. Exposed (#1149) because it is the only
   * honest answer to "has a photo been chosen?" — the file input is cleared as
   * soon as it hands the file over, so its own `files` list always says no.
   */
  avatarFile: File | null
  avatarPreview: string | null
  avatarSource: File | null
  setAvatarSource: (file: File | null) => void
  avatarError: string
  /** Set the avatar-scoped error — the crop modal reports failures here (#1527). */
  setAvatarError: (message: string) => void
  handleAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleAvatarConfirm: (blob: Blob) => void
  error: string | null
  submitting: boolean
  canSubmit: boolean
  handleSubmit: (event: React.FormEvent) => void | Promise<void>
  handle: string
  showPicker: boolean
}

export function useCreateCharacter(): CreateCharacterState {
  const { refetch } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [tagline, setTagline] = useState('')
  const [factionSlug, setFactionSlug] = useState<string>('') // '' = born na
  const [invited, setInvited] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Avatar pick/crop/preview/validate — shared with edit (#985).
  const {
    avatarFile,
    avatarSource,
    setAvatarSource,
    avatarPreview,
    avatarError,
    setAvatarError,
    handleAvatarChange,
    handleAvatarConfirm,
  } = useAvatarPicker()

  useEffect(() => {
    void getInvitedFactions().then(setInvited).catch(() => setInvited([]))
  }, [])

  const canSubmit = canSubmitName(displayName, submitting)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const character = await createCharacter(
        buildCreatePayload(displayName, bio, tagline, factionSlug, invited),
      )
      if (avatarFile) {
        await uploadCharacterAvatar(character.id, avatarFile)
      }
      await refetch() // server already set the new life active
      // THE HAND-OFF (#1861, SPEC-onboarding § The hand-off). A brand-new
      // character lands on their one takeable task, framed — not on their own
      // empty profile, which is where the arc used to stop with nothing to do.
      // It never CLAIMS: a claim enters the task bank and unwinding it means
      // finding the withdraw path on day one.
      //
      // DERIVED from the character's own state via `task.start_here`, never
      // from a flag onboarding passes in, so it holds however they arrived —
      // sticker, search engine, or a second character years from now. The
      // profile stays the destination for anyone with no marked task, which is
      // anyone who has already completed the onboarding one.
      navigate(await resolveHandoffDestination(`/characters/${character.id}`))
    } catch (err) {
      setError(extractError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return {
    displayName,
    setDisplayName,
    bio,
    setBio,
    tagline,
    setTagline,
    factionSlug,
    setFactionSlug,
    invited,
    avatarFile,
    avatarPreview,
    avatarSource,
    setAvatarSource,
    avatarError,
    setAvatarError,
    handleAvatarChange,
    handleAvatarConfirm,
    error,
    submitting,
    canSubmit,
    handleSubmit,
    handle: previewHandle(displayName),
    showPicker: invited.length > 0,
  }
}

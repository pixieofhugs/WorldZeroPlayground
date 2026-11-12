import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { createCharacter, uploadCharacterAvatar, type CharacterCreate } from '../../api/characters'
import { getInvitedFactions } from '../../api/me'
import { extractError } from '../../utils/errors'
import { resolveHandoffDestination } from '../../utils/onboardingHandoff'
import { useAvatarPicker } from './useAvatarPicker'

/**
 * Character-creation state for every skin (#273, ADR-0019). A faction is sent
 * only with a matching invitation; otherwise the life is born "na".
 */

export const NAME_MAX = 22
export const BIO_MAX = 160
/**
 * Mirrors the server cap (#1628). Shared with edit, unlike NAME_MAX/BIO_MAX
 * (edit's are 50/500).
 */
export const TAGLINE_MAX = 140

/**
 * A tagline is one line even if typed in a textarea: its profile slot wraps and
 * must not carry author line breaks (#1629). `bio` keeps breaks (#1628).
 */
export function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/**
 * Submit gate for both forms: a non-blank name and nothing in flight. A blank
 * name is a 422 with untranslated Pydantic copy, so the UI makes it unreachable
 * (#1697). Exported so edit shares it and tests can drive it without a DOM.
 */
export function canSubmitName(displayName: string, busy: boolean): boolean {
  return displayName.trim().length > 0 && !busy
}

/** Mirror of the server @handle derivation (services/character._derive_unique_username). */
export function previewHandle(displayName: string): string {
  return displayName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) || 'wanderer'
}

/** A faction is carried only if invited; otherwise born unaffiliated. */
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
  /** Exposed (#1149): the file input is cleared on pick, so only this says
   * whether a photo was chosen. */
  avatarFile: File | null
  avatarPreview: string | null
  avatarSource: File | null
  setAvatarSource: (file: File | null) => void
  avatarError: string
  /** The crop modal reports failures here (#1527). */
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
      // The hand-off (#1861, SPEC-onboarding): land on the one takeable task,
      // never claiming it. Derived from `task.start_here`, not an onboarding
      // flag, so it holds however they arrived. Fallback: the task board (#1972).
      navigate(await resolveHandoffDestination('/tasks'))
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

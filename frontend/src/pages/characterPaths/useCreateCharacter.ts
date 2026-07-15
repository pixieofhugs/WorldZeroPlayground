import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { createCharacter, uploadCharacterAvatar, type CharacterCreate } from '../../api/characters'
import { getInvitedFactions } from '../../api/me'
import { extractError } from '../../utils/errors'
import { blobToFile } from '../../components/imageEdit/imageEditHelpers'

/**
 * Shared read/write model for Adaptive Character Creation (#273, ADR-0019),
 * lifted out of CreateCharacter so the desktop screen and the mobile skin
 * (#516) render the same one submit path. Presentation-only skins consume this;
 * no faction is ever sent unless the account holds a matching invitation, so a
 * brand-new account is born unaffiliated ("na").
 */

export const NAME_MAX = 22
export const BIO_MAX = 160
const MAX_AVATAR_SIZE = 10 * 1024 * 1024 // 10 MB

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
  factionSlug: string,
  invited: string[],
): CharacterCreate {
  const picked = factionSlug && invited.includes(factionSlug) ? factionSlug : undefined
  return {
    display_name: displayName.trim(),
    bio: bio || undefined,
    faction_slug: picked,
  }
}

export interface CreateCharacterState {
  displayName: string
  setDisplayName: (value: string) => void
  bio: string
  setBio: (value: string) => void
  factionSlug: string
  setFactionSlug: (value: string) => void
  invited: string[]
  avatarPreview: string | null
  avatarSource: File | null
  setAvatarSource: (file: File | null) => void
  handleFile: (event: React.ChangeEvent<HTMLInputElement>) => void
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
  const [factionSlug, setFactionSlug] = useState<string>('') // '' = born na
  const [invited, setInvited] = useState<string[]>([])
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarSource, setAvatarSource] = useState<File | null>(null) // in the crop modal
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void getInvitedFactions().then(setInvited).catch(() => setInvited([]))
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_AVATAR_SIZE) {
      setError('Portrait must be under 10 MB.')
      return
    }
    setError(null)
    // Crop/rotate to a square before it becomes the portrait (#514).
    setAvatarSource(file)
  }

  const handleAvatarConfirm = (blob: Blob) => {
    const file = blobToFile(blob, avatarSource?.name ?? 'avatar')
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setAvatarSource(null)
  }

  const trimmedName = displayName.trim()
  const canSubmit = trimmedName.length > 0 && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const character = await createCharacter(buildCreatePayload(displayName, bio, factionSlug, invited))
      if (avatarFile) {
        await uploadCharacterAvatar(character.id, avatarFile)
      }
      await refetch() // server already set the new life active
      navigate(`/characters/${character.id}`)
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
    factionSlug,
    setFactionSlug,
    invited,
    avatarPreview,
    avatarSource,
    setAvatarSource,
    handleFile,
    handleAvatarConfirm,
    error,
    submitting,
    canSubmit,
    handleSubmit,
    handle: previewHandle(displayName),
    showPicker: invited.length > 0,
  }
}

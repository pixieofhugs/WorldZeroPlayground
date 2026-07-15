import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getCharacter,
  updateCharacter,
  uploadCharacterAvatar,
  deleteCharacter,
  type CharacterOut,
} from '../../api/characters'
import { useAuth } from '../../auth/AuthContext'
import { extractError } from '../../utils/errors'
import { blobToFile } from '../../components/imageEdit/imageEditHelpers'

/**
 * Shared read/write model for Edit Character, lifted out of EditCharacter so the
 * desktop screen and the mobile skin (#516) share one persist path. The three
 * editable fields (display_name, bio, location), the avatar upload, delete, and
 * validation live here; skins are presentation-only. `@handle` is the
 * auto-derived unique username (ADR-0019) — read-only, never an input.
 */

const MAX_AVATAR_SIZE = 10 * 1024 * 1024 // 10 MB

export interface EditCharacterState {
  id: string | undefined
  character: CharacterOut | null
  loading: boolean
  isOwner: boolean
  displayName: string
  setDisplayName: (value: string) => void
  bio: string
  setBio: (value: string) => void
  location: string
  setLocation: (value: string) => void
  avatarFile: File | null
  avatarSource: File | null
  setAvatarSource: (file: File | null) => void
  avatarError: string
  handleAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleAvatarConfirm: (blob: Blob) => void
  saving: boolean
  error: string
  handleSubmit: (event: React.FormEvent) => void | Promise<void>
  deleting: boolean
  handleDelete: () => void | Promise<void>
}

export function useEditCharacter(): EditCharacterState {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, refetch } = useAuth()
  const [character, setCharacter] = useState<CharacterOut | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarSource, setAvatarSource] = useState<File | null>(null) // in the crop modal
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [avatarError, setAvatarError] = useState('')

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    e.target.value = ''
    if (!f) return
    if (f.size > MAX_AVATAR_SIZE) {
      setAvatarError('Avatar must be under 10 MB.')
      return
    }
    setAvatarError('')
    // Crop/rotate to a square before it becomes the avatar (#514).
    setAvatarSource(f)
  }

  const handleAvatarConfirm = (blob: Blob) => {
    setAvatarFile(blobToFile(blob, avatarSource?.name ?? 'avatar'))
    setAvatarSource(null)
  }

  useEffect(() => {
    if (!id) return
    getCharacter(parseInt(id, 10))
      .then((c) => {
        setCharacter(c)
        setDisplayName(c.display_name)
        setBio(c.bio || '')
        setLocation(c.location || '')
      })
      .catch((err) => setError(extractError(err, 'Could not load character.')))
      .finally(() => setLoading(false))
  }, [id])

  // Only allow editing your own character
  const isOwner = user?.character?.id === character?.id

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !character) return
    setSaving(true)
    setError('')
    try {
      const characterId = parseInt(id, 10)
      if (avatarFile) {
        await uploadCharacterAvatar(characterId, avatarFile)
      }
      const updated = await updateCharacter(characterId, {
        display_name: displayName,
        bio: bio || undefined,
        location: location || undefined,
      })
      setCharacter(updated)
      await refetch()
      navigate(`/characters/${characterId}`)
    } catch (err) {
      setError(extractError(err, 'Could not save changes.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !character) return
    setDeleting(true)
    setError('')
    try {
      await deleteCharacter(parseInt(id, 10))
      await refetch() // server re-resolves the active life (or none)
      navigate('/')
    } catch (err) {
      setError(extractError(err, 'Could not delete character.'))
      setDeleting(false)
    }
  }

  return {
    id,
    character,
    loading,
    isOwner,
    displayName,
    setDisplayName,
    bio,
    setBio,
    location,
    setLocation,
    avatarFile,
    avatarSource,
    setAvatarSource,
    avatarError,
    handleAvatarChange,
    handleAvatarConfirm,
    saving,
    error,
    handleSubmit,
    deleting,
    handleDelete,
  }
}

import { useEffect, useRef, useState } from 'react'
import { blobToFile } from '../../components/imageEdit/imageEditHelpers'

/**
 * The whole avatar pick/crop/preview/validate lifecycle, in ONE place (#985).
 *
 * Character creation and character editing both let you choose a portrait, crop
 * it square, and see it before it is persisted. That logic used to be
 * copy-pasted across {@link useCreateCharacter} and useEditCharacter, and the two
 * copies drifted: the edit copy never built an `avatarPreview`, so a freshly
 * picked avatar only appeared after Save → refetch → navigate ("the refresh").
 * Consolidating here is what keeps the two flows from diverging again.
 *
 * The one subtlety is the object URL: `handleAvatarConfirm` creates a `blob:` URL
 * for instant preview, and every URL must be revoked exactly once — when it is
 * replaced by a newer crop and when the screen unmounts — or the browser leaks
 * the backing blob. {@link createObjectUrlSlot} owns that bookkeeping.
 *
 * NOTE: praxis-media uploads (useEditPraxis / CollabSuccess) are a separate
 * concern and deliberately do NOT share this hook.
 */

const MAX_AVATAR_SIZE = 10 * 1024 * 1024 // 10 MB
const TOO_LARGE_MESSAGE = 'Portrait must be under 10 MB.'

/**
 * A single-slot holder for an object URL. `set` revokes whatever URL it was
 * holding, mints a fresh one for the given blob, and returns it; `revoke`
 * releases the current one. Extracted (and exported) so the preview lifecycle is
 * unit-testable without a DOM.
 */
interface ObjectUrlSlot {
  set: (source: Blob) => string
  revoke: () => void
  current: () => string | null
}

export function createObjectUrlSlot(): ObjectUrlSlot {
  let url: string | null = null
  return {
    set(source: Blob): string {
      if (url) URL.revokeObjectURL(url)
      url = URL.createObjectURL(source)
      return url
    },
    revoke(): void {
      if (url) URL.revokeObjectURL(url)
      url = null
    },
    current(): string | null {
      return url
    },
  }
}

interface AvatarPicker {
  /** The cropped file awaiting upload (null until a crop is confirmed). */
  avatarFile: File | null
  /** The raw file currently open in the crop modal (null when closed). */
  avatarSource: File | null
  setAvatarSource: (file: File | null) => void
  /** Object URL of the just-cropped file — render this for instant feedback. */
  avatarPreview: string | null
  /** Avatar-scoped error (>10 MB, or an upload failure the caller reports). */
  avatarError: string
  setAvatarError: (message: string) => void
  /** Hidden file-input onChange: validates size, then opens the crop modal. */
  handleAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  /** Crop-modal confirm: stores the cropped file and its preview URL. */
  handleAvatarConfirm: (blob: Blob) => void
}

export function useAvatarPicker(): AvatarPicker {
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarSource, setAvatarSource] = useState<File | null>(null) // in the crop modal
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState('')

  // One object-URL slot per mounted picker; revoked on unmount.
  const slotRef = useRef<ObjectUrlSlot | null>(null)
  if (slotRef.current === null) slotRef.current = createObjectUrlSlot()

  useEffect(() => {
    const slot = slotRef.current!
    return () => slot.revoke()
  }, [])

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''
    if (!file) return
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError(TOO_LARGE_MESSAGE)
      return
    }
    setAvatarError('')
    // Crop/rotate to a square before it becomes the portrait (#514).
    setAvatarSource(file)
  }

  const handleAvatarConfirm = (blob: Blob) => {
    const file = blobToFile(blob, avatarSource?.name ?? 'avatar')
    setAvatarFile(file)
    setAvatarPreview(slotRef.current!.set(file)) // revokes the prior preview
    setAvatarSource(null)
  }

  return {
    avatarFile,
    avatarSource,
    setAvatarSource,
    avatarPreview,
    avatarError,
    setAvatarError,
    handleAvatarChange,
    handleAvatarConfirm,
  }
}

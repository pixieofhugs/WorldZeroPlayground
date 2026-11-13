import { useEffect, useRef, useState } from 'react'
import { blobToFile } from '../../components/imageEdit/imageEditHelpers'

/**
 * Avatar pick/crop/preview/validate, shared by create and edit (#985).
 * Each preview `blob:` URL must be revoked exactly once (on replace and unmount);
 * {@link createObjectUrlSlot} owns that. Praxis-media uploads deliberately don't use this.
 */

const MAX_AVATAR_SIZE = 10 * 1024 * 1024 // 10 MB
const TOO_LARGE_MESSAGE = 'Portrait must be under 10 MB.'

/** One object URL at a time: `set` revokes the old and mints a new one.
 * Exported so it's testable without a DOM. */
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
  /** Cropped file awaiting upload. */
  avatarFile: File | null
  /** Raw file open in the crop modal. */
  avatarSource: File | null
  setAvatarSource: (file: File | null) => void
  avatarPreview: string | null
  /** >10 MB, or an upload failure the caller reports. */
  avatarError: string
  setAvatarError: (message: string) => void
  handleAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleAvatarConfirm: (blob: Blob) => void
}

export function useAvatarPicker(): AvatarPicker {
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarSource, setAvatarSource] = useState<File | null>(null) // in the crop modal
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState('')

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
    // Square crop first (#514).
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

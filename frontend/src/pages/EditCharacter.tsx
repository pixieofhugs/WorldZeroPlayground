import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCharacter, updateCharacter, uploadCharacterAvatar, type CharacterOut } from '../api/characters'
import { useAuth } from '../auth/AuthContext'
import { extractError } from '../utils/errors'
import { mediaUrl } from '../utils/media'

export default function EditCharacter() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, refetch } = useAuth()
  const [character, setCharacter] = useState<CharacterOut | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

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

  if (loading) return <div className="page font-body text-muted">Loading...</div>
  if (!character) return <div className="page font-body text-muted">Character not found.</div>
  if (!isOwner) return <div className="page font-body text-muted">You can only edit your own character.</div>

  return (
    <div className="page max-w-xl">
      <h1 className="page-heading">Edit Character</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Avatar preview */}
        <div className="flex items-center gap-4">
          {character.avatar_url ? (
            <img
              src={mediaUrl(character.avatar_url)}
              alt={character.username}
              className="w-16 h-16 rounded-full border-2 border-border shadow-sketch-sm object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full border-2 border-border shadow-sketch-sm bg-paper flex items-center justify-center font-display text-2xl font-bold">
              {character.username[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="font-body text-sm font-bold">Avatar</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              className="font-body text-sm"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-body text-sm font-bold">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="border-2 border-border px-3 py-2 font-body text-sm bg-card shadow-sketch-sm focus:outline-none"
            maxLength={50}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-body text-sm font-bold">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="border-2 border-border px-3 py-2 font-body text-sm bg-card shadow-sketch-sm focus:outline-none resize-none"
            maxLength={500}
            placeholder="Tell people about your character..."
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-body text-sm font-bold">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="border-2 border-border px-3 py-2 font-body text-sm bg-card shadow-sketch-sm focus:outline-none"
            maxLength={100}
            placeholder="Where are you based?"
          />
        </div>

        {error && <p className="font-body text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => navigate(`/characters/${id}`)} className="btn-outline">
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

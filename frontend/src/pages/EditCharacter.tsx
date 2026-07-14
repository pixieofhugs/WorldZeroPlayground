import { useEffect, useState, useRef, type CSSProperties } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getCharacter, updateCharacter, uploadCharacterAvatar, type CharacterOut } from '../api/characters'
import { useAuth } from '../auth/AuthContext'
import { extractError } from '../utils/errors'
import { mediaUrl } from '../utils/media'
import DefaultSigil from '../components/cards/DefaultSigil'

/**
 * Edit Character — themed in the spectrum default skin for EVERYONE, regardless
 * of the character's faction (#434). "Your character is yours before any faction
 * is": a spectrum hero band + card-wrapped sections (Portrait / Identity / Your
 * story) on the --faction-default-* tokens. Retheme only — the three editable
 * fields (display_name, bio, location), the avatar upload, and validation are
 * unchanged. `@handle` is the auto-derived, unique username (ADR-0019): shown
 * read-only, never an input. No pronouns field (a separate feature — new column).
 */
const DISPLAY = 'var(--faction-default-card-font)'

const inputStyle: CSSProperties = {
  width: '100%',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 8,
  background: 'var(--color-bg-page)',
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  color: 'var(--color-text-primary)',
  padding: '10px 13px',
  outline: 'none',
  boxSizing: 'border-box',
}

export default function EditCharacter() {
  const { t } = useTranslation('forms')
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
  const [avatarError, setAvatarError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const MAX_AVATAR_SIZE = 10 * 1024 * 1024 // 10 MB

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    if (f && f.size > MAX_AVATAR_SIZE) {
      setAvatarError('Avatar must be under 10 MB.')
      e.target.value = ''
      return
    }
    setAvatarError('')
    setAvatarFile(f)
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

  if (loading) return <div className="py-8 font-body text-muted">{t('editCharacter.loading')}</div>
  if (!character) return <div className="py-8 font-body text-muted">{t('editCharacter.notFound')}</div>
  if (!isOwner) return <div className="py-8 font-body text-muted">{t('editCharacter.notOwner')}</div>

  // Monogram tracks the display name as you type (falls back to the handle).
  const initial = (displayName.trim()[0] || character.username[0] || '?').toUpperCase()

  return (
    <div className="py-8" style={{ maxWidth: 640, margin: '0 auto' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Hero band — spectrum, always unaffiliated skin ── */}
        <div style={{ borderRadius: 12, padding: 5, background: 'var(--faction-default-rainbow)' }}>
          <div
            style={{
              background: 'var(--faction-default-card-bg)',
              color: 'var(--faction-default-card-text)',
              borderRadius: 8,
              padding: '24px 28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <DefaultSigil size={34} />
              <div>
                <div
                  className="eyebrow"
                  style={{ color: 'var(--faction-default-card-muted)', marginBottom: 0 }}
                >
                  {t('editCharacter.eyebrow')}
                </div>
                <h1
                  style={{
                    fontFamily: DISPLAY,
                    fontStyle: 'italic',
                    fontWeight: 700,
                    fontSize: 32,
                    lineHeight: 1,
                    margin: '4px 0 0',
                    color: 'var(--faction-default-card-text)',
                  }}
                >
                  {t('editCharacter.heading')}
                </h1>
              </div>
            </div>
            <p
              style={{
                fontSize: 12,
                lineHeight: 1.6,
                color: 'var(--faction-default-card-muted)',
                margin: '16px 0 0',
                maxWidth: 440,
              }}
            >
              {t('editCharacter.intro')}
            </p>
          </div>
        </div>

        {/* ── Portrait ── */}
        <section className="sidebar-card" style={{ padding: '22px 24px' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>{t('editCharacter.portraitHeading')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            {/* Spectrum-framed portrait — the DefaultAvatar look at portrait size
                (reuses DefaultSigil for the corner mark). Every path still open. */}
            <div
              style={{
                position: 'relative',
                width: 82,
                height: 82,
                borderRadius: '50%',
                padding: 3,
                boxSizing: 'border-box',
                background: 'var(--faction-default-rainbow)',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'var(--faction-default-card-bg)',
                  color: 'var(--faction-default-card-text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: DISPLAY,
                  fontStyle: 'italic',
                  fontSize: 34,
                  lineHeight: 1,
                }}
              >
                {character.avatar_url ? (
                  <img
                    src={mediaUrl(character.avatar_url)}
                    alt={character.username}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  initial
                )}
              </div>
              <div
                style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'var(--faction-default-card-bg)',
                  boxShadow: '0 0 0 1.5px var(--faction-default-card-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DefaultSigil size={22} />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="font-body text-sm font-bold" style={{ display: 'block', marginBottom: 6 }}>
                {t('editCharacter.avatarLabel')}
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="font-body text-sm"
              />
              {avatarError && <p className="font-body text-xs text-red-600 mt-1">{avatarError}</p>}
              <p
                style={{
                  fontSize: 10.5,
                  fontStyle: 'italic',
                  fontFamily: DISPLAY,
                  color: 'var(--color-text-tertiary)',
                  margin: '11px 0 0',
                  lineHeight: 1.5,
                }}
              >
                {t('editCharacter.avatarHint', { initial })}
              </p>
            </div>
          </div>
        </section>

        {/* ── Identity ── */}
        <section className="sidebar-card" style={{ padding: '22px 24px' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>{t('editCharacter.identityHeading')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <label style={{ display: 'block' }}>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 7 }}>
                {t('editCharacter.displayNameLabel')}
              </span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                placeholder={t('editCharacter.displayNamePlaceholder')}
                style={inputStyle}
              />
              <span
                className={`font-body text-xs ${displayName.length >= 45 ? 'text-red-600' : 'text-muted'}`}
                style={{ display: 'block', textAlign: 'right', marginTop: 4 }}
              >
                {t('editCharacter.displayNameCount', { count: displayName.length })}
              </span>
            </label>
            <div>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 7 }}>
                {t('editCharacter.handleLabel')}
              </span>
              {/* Read-only: `username` is the auto-derived, unique handle (ADR-0019). */}
              <div
                style={{
                  ...inputStyle,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  background: 'var(--color-bg-surface-alt)',
                  color: 'var(--color-text-tertiary)',
                  cursor: 'not-allowed',
                }}
              >
                <span style={{ fontFamily: 'var(--font-body)' }}>@{character.username}</span>
              </div>
              <span className="eyebrow" style={{ display: 'block', marginTop: 6, color: 'var(--color-text-tertiary)' }}>
                {t('editCharacter.handleHint')}
              </span>
            </div>
          </div>
        </section>

        {/* ── Your story ── */}
        <section className="sidebar-card" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            <span className="eyebrow">{t('editCharacter.storyLabel')}</span>
            <span className={`font-body text-xs ${bio.length >= 450 ? 'text-red-600' : 'text-muted'}`}>
              {t('editCharacter.storyCount', { count: bio.length })}
            </span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder={t('editCharacter.storyPlaceholder')}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }}
          />
          <div style={{ marginTop: 18 }}>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 7 }}>
              {t('editCharacter.basedLabel')} <span style={{ color: 'var(--color-text-tertiary)' }}>{t('editCharacter.optional')}</span>
            </span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={100}
              placeholder={t('editCharacter.basedPlaceholder')}
              style={{ ...inputStyle, maxWidth: 280 }}
            />
            <span
              className={`font-body text-xs ${location.length >= 90 ? 'text-red-600' : 'text-muted'}`}
              style={{ display: 'block', marginTop: 4 }}
            >
              {t('editCharacter.basedCount', { count: location.length })}
            </span>
          </div>
        </section>

        {error && <p className="font-body text-sm text-red-600">{error}</p>}

        {/* ── Actions ── */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? t('editCharacter.saveBusy') : t('editCharacter.saveIdle')}
          </button>
          <button type="button" onClick={() => navigate(`/characters/${id}`)} className="btn-outline">
            {t('editCharacter.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}

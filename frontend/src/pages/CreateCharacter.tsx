import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { createCharacter, uploadCharacterAvatar } from '../api/characters'
import { getInvitedFactions } from '../api/me'
import { factionCssVar, factionName } from '../utils/factions'
import { extractError } from '../utils/errors'
import CredentialCard from '../components/CredentialCard'

/**
 * Adaptive Character Creation (#273, ADR-0019). One screen, two renderings: the
 * faction picker appears iff the account holds invitations; otherwise a brand-new
 * account creates a born-unaffiliated ("na") life. One submit path either way.
 */

const NAME_MAX = 22
const BIO_MAX = 160
const MAX_AVATAR_SIZE = 10 * 1024 * 1024 // 10 MB

/** Mirror of the server @handle derivation (services/character._derive_unique_username). */
function previewHandle(displayName: string): string {
  return displayName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) || 'wanderer'
}

export default function CreateCharacter() {
  const { t } = useTranslation('forms')
  const { refetch } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [factionSlug, setFactionSlug] = useState<string>('') // '' = born na
  const [invited, setInvited] = useState<string[]>([])
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void getInvitedFactions().then(setInvited).catch(() => setInvited([]))
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (file && file.size > MAX_AVATAR_SIZE) {
      setError('Portrait must be under 10 MB.')
      e.target.value = ''
      return
    }
    setError(null)
    setAvatarFile(file)
    setAvatarPreview(file ? URL.createObjectURL(file) : null)
  }

  const trimmedName = displayName.trim()
  const canSubmit = trimmedName.length > 0 && !submitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      // Never send a faction the account wasn't invited to; '' → born na.
      const picked = factionSlug && invited.includes(factionSlug) ? factionSlug : undefined
      const character = await createCharacter({
        display_name: trimmedName,
        bio: bio || undefined,
        faction_slug: picked,
      })
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

  const handle = previewHandle(displayName)
  const showPicker = invited.length > 0

  return (
    <div className="page">
      <button onClick={() => navigate('/')} style={backLink}>{t('createCharacter.back')}</button>

      <div style={twoCol}>
        {/* Left — form */}
        <form onSubmit={handleSubmit} style={{ flex: '1 1 320px', maxWidth: 440 }}>
          <h1 style={titleStyle}>{t('createCharacter.heading')}</h1>

          {/* Chosen name */}
          <label style={eyebrow}>{t('createCharacter.nameLabel')}</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={NAME_MAX}
            placeholder={t('createCharacter.namePlaceholder')}
            autoFocus
            style={nameInput}
          />
          <div style={metaRow}>
            <span style={{ color: 'var(--color-text-tertiary)' }}>@{handle}</span>
            <span style={{ color: displayName.length >= NAME_MAX ? 'var(--color-danger)' : 'var(--color-text-tertiary)' }}>
              {t('createCharacter.charsLeft', { count: NAME_MAX - displayName.length })}
            </span>
          </div>

          {/* About */}
          <label style={{ ...eyebrow, marginTop: 20 }}>{t('createCharacter.aboutLabel')}</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={BIO_MAX}
            placeholder={t('createCharacter.aboutPlaceholder')}
            rows={3}
            style={bioInput}
          />
          <div style={metaRow}>
            <span />
            <span style={{ color: 'var(--color-text-tertiary)' }}>{t('createCharacter.charsLeft', { count: BIO_MAX - bio.length })}</span>
          </div>

          {/* Portrait — reuses the existing avatar uploader (POST /characters/{id}/avatar) */}
          <label style={{ ...eyebrow, marginTop: 20 }}>{t('createCharacter.portraitLabel')} <span style={{ textTransform: 'none', letterSpacing: 0 }}>{t('createCharacter.optional')}</span></label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="font-body text-sm"
            style={{ marginTop: 6 }}
          />

          {/* Faction picker — only when the account holds invitations (ADR-0019) */}
          {showPicker && (
            <>
              <label style={{ ...eyebrow, marginTop: 22 }}>
                {t('createCharacter.callingLabel')} <span style={{ textTransform: 'none', letterSpacing: 0 }}>{t('createCharacter.callingOptional')}</span>
              </label>
              <div style={pickerGrid}>
                {invited.map((slug) => {
                  const selected = factionSlug === slug
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => setFactionSlug(selected ? '' : slug)}
                      style={{
                        ...pickerCell,
                        boxShadow: selected ? `0 0 0 2px ${factionCssVar(slug)}` : 'none',
                      }}
                    >
                      <span style={{ ...dot, background: factionCssVar(slug) }} />
                      <span style={{ fontFamily: factionCssVar(slug, 'card-font'), fontSize: 13, color: 'var(--color-text-primary)' }}>
                        {factionName(slug)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {error && <p style={errorBox}>{error}</p>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 24 }}>
            <button type="submit" disabled={!canSubmit} style={primaryBtn}>
              {submitting ? t('createCharacter.submitBusy') : t('createCharacter.submitIdle')}
            </button>
            <button type="button" onClick={() => navigate('/')} style={cancelBtn}>{t('createCharacter.cancel')}</button>
            <span style={{ fontSize: 8, color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
              {t('createCharacter.startsAt')}
            </span>
          </div>
        </form>

        {/* Right — live credential preview */}
        <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
          <CredentialCard
            displayName={displayName || t('createCharacter.previewFallbackName')}
            handle={handle}
            bio={bio}
            factionSlug={factionSlug || null}
            level={1}
            score={0}
            avatarUrl={avatarPreview}
            onAvatarClick={() => fileInputRef.current?.click()}
          />
        </div>
      </div>
    </div>
  )
}

// --- styles (token-driven) --------------------------------------------------

const backLink: CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 9, color: 'var(--color-text-secondary)', padding: 0, marginBottom: 16,
}
const twoCol: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 48, alignItems: 'flex-start' }
const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 700,
  fontSize: 38, lineHeight: 1.02, color: 'var(--color-text-primary)', margin: '0 0 24px',
}
const eyebrow: CSSProperties = {
  display: 'block', fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase',
  color: 'var(--color-text-secondary)',
}
const nameInput: CSSProperties = {
  display: 'block', width: '100%', marginTop: 8, background: 'transparent', border: 'none',
  borderBottom: '1.5px solid var(--color-text-primary)', outline: 'none',
  fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 30,
  color: 'var(--color-text-primary)', padding: '2px 0 8px',
}
const bioInput: CSSProperties = {
  display: 'block', width: '100%', marginTop: 6, boxSizing: 'border-box', resize: 'none',
  background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-strong)',
  borderRadius: 5, outline: 'none', fontFamily: 'var(--font-body)', fontSize: 11,
  lineHeight: 1.6, color: 'var(--color-text-primary)', padding: '10px 12px',
}
const metaRow: CSSProperties = {
  display: 'flex', justifyContent: 'space-between', marginTop: 6,
  fontFamily: 'var(--font-body)', fontSize: 9,
}
const pickerGrid: CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10,
}
const pickerCell: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
  background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-strong)',
  borderRadius: 6, padding: '10px 12px', textAlign: 'left',
}
const dot: CSSProperties = { width: 12, height: 12, borderRadius: '50%', flexShrink: 0 }
const errorBox: CSSProperties = {
  marginTop: 16, fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-danger)',
  border: '1px solid var(--color-danger)', borderRadius: 4, padding: '8px 10px',
}
const primaryBtn: CSSProperties = {
  cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--color-bg-page)', background: 'var(--color-text-primary)',
  border: 'none', padding: '12px 24px', borderRadius: 5,
}
const cancelBtn: CSSProperties = {
  cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'var(--font-body)',
  fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-secondary)',
}

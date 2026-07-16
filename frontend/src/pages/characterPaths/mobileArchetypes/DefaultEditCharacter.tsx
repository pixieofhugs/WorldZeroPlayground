import { useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { mediaUrl } from '../../../utils/media'
import { factionName } from '../../../utils/factions'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import type { EditCharacterState } from '../useEditCharacter'

/**
 * Default (na) MOBILE edit-character skin (#516). Single column: a photo ring
 * with Change photo, name + tagline (the real `bio` field) inputs, a read-only
 * faction row that links out to the Factions tab, a delete affordance (two-tap
 * confirm), and a sticky Save bar. Presentation-only — persist/delete live in
 * {@link useEditCharacter}; every faction falls through here.
 *
 * Layout is flex/relative single-column — no fixed-px grid drives the page
 * (SPEC-faction-ui-profile §1a).
 */
export default function DefaultEditCharacter({ state }: { state: EditCharacterState }) {
  const { t } = useTranslation('forms')
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const {
    id,
    character,
    loading,
    isOwner,
    displayName,
    setDisplayName,
    bio,
    setBio,
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
  } = state

  if (loading) return <p className="font-body text-muted">{t('editCharacter.loading')}</p>
  if (!character) return <p className="font-body text-muted">{t('editCharacter.notFound')}</p>
  if (!isOwner) return <p className="font-body text-muted">{t('editCharacter.notOwner')}</p>

  const initial = (displayName.trim()[0] || character.username[0] || '?').toUpperCase()
  const factionSlug = character.faction_slug
  const factionHref = factionSlug ? `/factions/${factionSlug}` : '/factions'

  return (
    <form data-skin="default" data-testid="mobile-edit-character" onSubmit={handleSubmit} style={page}>
      {/* Top row — back + title */}
      <div style={topRow}>
        <button type="button" onClick={() => navigate(`/characters/${id}`)} style={backBtn} aria-label={t('editCharacter.cancel')}>
          ‹
        </button>
        <span className="eyebrow" style={{ fontSize: 10 }}>{t('editCharacter.heading')}</span>
        <span style={{ width: 28 }} />
      </div>

      {/* Photo */}
      <div style={{ textAlign: 'center' }}>
        <button type="button" onClick={() => fileRef.current?.click()} style={ringBtn}>
          <span style={ringInner}>
            {character.avatar_url ? (
              <img src={mediaUrl(character.avatar_url)} alt={character.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontFamily: 'var(--faction-default-card-font)', fontStyle: 'italic', fontSize: 34, color: 'var(--color-text-primary)' }}>
                {initial}
              </span>
            )}
          </span>
        </button>
        <div className="eyebrow" style={{ marginTop: 12, color: 'var(--faction-default-card-muted)' }}>
          {t('editCharacter.mobile.changePhoto')}
        </div>
        {avatarError && <p style={{ ...errorBox, marginTop: 8 }}>{avatarError}</p>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />

      {/* Name */}
      <div>
        <label style={label}>{t('editCharacter.displayNameLabel')}</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={50}
          placeholder={t('editCharacter.displayNamePlaceholder')}
          style={field}
        />
      </div>

      {/* Tagline — the real bio field */}
      <div>
        <label style={label}>{t('editCharacter.mobile.taglineLabel')}</label>
        <input
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          placeholder={t('editCharacter.storyPlaceholder')}
          style={field}
        />
      </div>

      {/* Faction — read-only link out to Factions */}
      <div>
        <label style={label}>{t('editCharacter.mobile.factionLabel')}</label>
        <Link to={factionHref} style={factionRow}>
          <span>{factionSlug ? factionName(factionSlug) : t('editCharacter.mobile.unaffiliated')}</span>
          <span aria-hidden style={{ color: 'var(--color-text-tertiary)' }}>›</span>
        </Link>
        <p style={help}>{t('editCharacter.mobile.factionHelp')}</p>
      </div>

      {/* Delete — two-tap confirm */}
      {confirmingDelete ? (
        <div style={confirmRow}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {t('editCharacter.mobile.deleteConfirm')}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => setConfirmingDelete(false)} style={confirmCancel}>
              {t('editCharacter.cancel')}
            </button>
            <button type="button" onClick={handleDelete} disabled={deleting} style={confirmDelete}>
              {deleting ? t('editCharacter.mobile.deleteBusy') : t('editCharacter.mobile.deleteConfirmYes')}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirmingDelete(true)} style={deleteBtn}>
          {t('editCharacter.mobile.delete')}
        </button>
      )}

      {error && <p style={errorBox}>{error}</p>}

      {/* Sticky Save bar */}
      <div style={stickyBar}>
        <button type="submit" disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.5 : 1 }}>
          {saving ? t('editCharacter.saveBusy') : t('editCharacter.saveIdle')}
        </button>
      </div>

      {/* Avatar crop/rotate — locked square (#514). */}
      {avatarSource && (
        <ImageEditModal
          key={`${avatarSource.name}-${avatarSource.lastModified}`}
          file={avatarSource}
          aspect={AVATAR_ASPECT}
          onConfirm={handleAvatarConfirm}
          onCancel={() => setAvatarSource(null)}
        />
      )}
    </form>
  )
}

// --- token-driven styles (single column, no hardcoded hex) ------------------

const page: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 96 }
const topRow: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
const backBtn: CSSProperties = {
  width: 28, height: 28, background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 24, lineHeight: 1, color: 'var(--color-text-primary)', padding: 0,
}
const ringBtn: CSSProperties = {
  width: 96, height: 96, borderRadius: '50%', padding: 3, cursor: 'pointer',
  border: 'none', background: 'var(--faction-default-rainbow)',
}
const ringInner: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
  background: 'var(--faction-default-card-bg)',
}
const label: CSSProperties = {
  display: 'block', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
  color: 'var(--color-text-secondary)', marginBottom: 8,
}
const field: CSSProperties = {
  display: 'block', width: '100%', boxSizing: 'border-box',
  background: 'var(--color-bg-page)', border: '1px solid var(--color-border-strong)',
  borderRadius: 8, outline: 'none', fontFamily: 'var(--font-body)', fontSize: 15,
  color: 'var(--color-text-primary)', padding: '12px 13px',
}
const factionRow: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  background: 'var(--color-bg-surface-alt)', border: '1px solid var(--color-border-strong)',
  borderRadius: 8, padding: '12px 13px', textDecoration: 'none',
  fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--color-text-secondary)',
}
const help: CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: 11, lineHeight: 1.6,
  color: 'var(--color-text-tertiary)', margin: '8px 0 0',
}
const deleteBtn: CSSProperties = {
  width: '100%', cursor: 'pointer', background: 'none', textAlign: 'center',
  border: '1px solid var(--color-danger)', borderRadius: 8, padding: '12px',
  fontFamily: 'var(--font-body)', fontSize: 12, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: 'var(--color-danger)',
}
const confirmRow: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 12,
  border: '1px solid var(--color-danger)', borderRadius: 8, padding: '14px',
}
const confirmCancel: CSSProperties = {
  flex: 1, cursor: 'pointer', background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border-strong)', borderRadius: 8, padding: '10px',
  fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text-primary)',
}
const confirmDelete: CSSProperties = {
  flex: 1, cursor: 'pointer', background: 'var(--color-danger)', border: 'none',
  borderRadius: 8, padding: '10px', fontFamily: 'var(--font-body)', fontSize: 12,
  letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-bg-page)',
}
const errorBox: CSSProperties = {
  fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-danger)',
  border: '1px solid var(--color-danger)', borderRadius: 6, padding: '10px 12px', margin: 0,
}
const stickyBar: CSSProperties = {
  position: 'sticky',
  bottom: 'calc(3.5rem + env(safe-area-inset-bottom))',
  marginTop: 'auto',
  paddingTop: 8,
}
const primaryBtn: CSSProperties = {
  width: '100%', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13,
  letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700,
  color: 'var(--color-bg-page)', background: 'var(--color-text-primary)',
  border: 'none', padding: '15px 24px', borderRadius: 12,
}

import { useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionCssVar, factionName } from '../utils/factions'
import CredentialCard from '../components/CredentialCard'
import ImageEditModal from '../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../components/imageEdit/imageEditHelpers'
import { useFormFactor } from '../hooks/useFormFactor'
import {
  useCreateCharacter,
  NAME_MAX,
  BIO_MAX,
  TAGLINE_MAX,
  type CreateCharacterState,
} from './characterPaths/useCreateCharacter'
import PortraitPicker from './characterPaths/PortraitPicker'
import DefaultCreateCharacter from './characterPaths/mobileArchetypes/DefaultCreateCharacter'

/**
 * Adaptive Character Creation (#273, ADR-0019). One screen, two renderings: the
 * faction picker appears iff the account holds invitations; otherwise a brand-new
 * account creates a born-unaffiliated ("na") life. One submit path either way.
 *
 * On a phone (#516) the same {@link useCreateCharacter} state drives a mobile
 * skin (full-column form + sticky Create). No faction ever claimed the
 * `mobileCreateCharacter` surface, so the dispatch was retired with the slot:
 * mobile renders the Default skin directly. Desktop unchanged.
 */

export default function CreateCharacter() {
  const state = useCreateCharacter()
  const formFactor = useFormFactor()

  if (formFactor === 'mobile') return <DefaultCreateCharacter state={state} />

  return <DesktopCreateCharacter state={state} />
}

function DesktopCreateCharacter({ state }: { state: CreateCharacterState }) {
  const { t } = useTranslation('forms')
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
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
    handle,
    showPicker,
  } = state

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
          <label style={{ ...eyebrow, marginTop: 'var(--space-xl)' }}>{t('createCharacter.aboutLabel')}</label>
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

          {/* Tagline — a slogan line, not a short bio (#1628). Its counter turns
              danger on the cap the way the name field's does: this is the field
              the profile header's identity slot is laid out against, so running
              out of room is worth seeing before the text stops appearing. */}
          <label style={{ ...eyebrow, marginTop: 'var(--space-xl)' }}>{t('createCharacter.taglineLabel')}</label>
          <textarea
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={TAGLINE_MAX}
            placeholder={t('createCharacter.taglinePlaceholder')}
            rows={2}
            style={bioInput}
          />
          <div style={metaRow}>
            <span />
            <span style={{ color: tagline.length >= TAGLINE_MAX ? 'var(--color-danger)' : 'var(--color-text-tertiary)' }}>
              {t('createCharacter.charsLeft', { count: TAGLINE_MAX - tagline.length })}
            </span>
          </div>

          {/* Portrait — reuses the existing avatar uploader (POST /characters/{id}/avatar).
              The picker owns the hidden input and the "what's chosen" readout (#1149);
              the credential card on the right opens the same input through fileInputRef. */}
          <label style={{ ...eyebrow, marginTop: 'var(--space-xl)' }}>{t('createCharacter.portraitLabel')} <span style={{ textTransform: 'none', letterSpacing: 0 }}>{t('createCharacter.optional')}</span></label>
          <PortraitPicker
            inputRef={fileInputRef}
            onChange={handleAvatarChange}
            chosenFile={avatarFile}
            error={avatarError}
            style={{ marginTop: 'var(--space-sm)' }}
          />

          {/* Faction picker — only when the account holds invitations (ADR-0019) */}
          {showPicker && (
            <>
              <label style={{ ...eyebrow, marginTop: 'var(--space-xl)' }}>
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
                      <span style={{ fontFamily: factionCssVar(slug, 'card-font'), fontSize: 'var(--text-content)', color: 'var(--color-text-primary)' }}>
                        {factionName(slug)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {error && <p style={errorBox}>{error}</p>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', marginTop: 'var(--space-xl)' }}>
            <button type="submit" disabled={!canSubmit} style={primaryBtn}>
              {submitting ? t('createCharacter.submitBusy') : t('createCharacter.submitIdle')}
            </button>
            <button type="button" onClick={() => navigate('/')} style={cancelBtn}>{t('createCharacter.cancel')}</button>
            <span style={{ fontSize: 'var(--text-content)', color: 'var(--color-text-tertiary)', letterSpacing: '0.06em' }}>
              {t('createCharacter.startsAt')}
            </span>
          </div>
        </form>

        {/* Right — live credential preview */}
        <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
          <CredentialCard
            displayName={displayName || t('createCharacter.previewFallbackName')}
            handle={handle}
            factionSlug={factionSlug || null}
            level={1}
            score={0}
            avatarUrl={avatarPreview}
            onAvatarClick={() => fileInputRef.current?.click()}
          />
        </div>
      </div>

      {/* Portrait crop/rotate — locked square (#514). */}
      {avatarSource && (
        <ImageEditModal
          key={`${avatarSource.name}-${avatarSource.lastModified}`}
          file={avatarSource}
          aspect={AVATAR_ASPECT}
          onConfirm={handleAvatarConfirm}
          onCancel={() => setAvatarSource(null)}
          onError={setAvatarError}
        />
      )}
    </div>
  )
}

// --- styles (token-driven) --------------------------------------------------

const backLink: CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 'var(--text-lg)', color: 'var(--color-text-secondary)', padding: 0, marginBottom: 'var(--space-lg)',
}
const twoCol: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4xl)', alignItems: 'flex-start' }
const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 700,
  fontSize: 'var(--text-heading)', lineHeight: 1.02, color: 'var(--color-text-primary)', margin: '0 0 var(--space-xl)',
}
const eyebrow: CSSProperties = {
  display: 'block', fontSize: 'var(--text-md)', letterSpacing: '0.16em', textTransform: 'uppercase',
  color: 'var(--color-text-secondary)',
}
const nameInput: CSSProperties = {
  display: 'block', width: '100%', marginTop: 'var(--space-sm)', background: 'transparent', border: 'none',
  borderBottom: '1.5px solid var(--color-text-primary)', outline: 'none',
  fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'var(--text-title)',
  color: 'var(--color-text-primary)', padding: 'var(--space-xs) 0 var(--space-sm)',
}
const bioInput: CSSProperties = {
  display: 'block', width: '100%', marginTop: 'var(--space-sm)', boxSizing: 'border-box', resize: 'none',
  background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-strong)',
  borderRadius: 5, outline: 'none', fontFamily: 'var(--font-body)', fontSize: 'var(--text-content)',
  lineHeight: 1.6, color: 'var(--color-text-primary)', padding: 'var(--space-md)',
}
const metaRow: CSSProperties = {
  display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-sm)',
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)',
}
const pickerGrid: CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginTop: 'var(--space-md)',
}
const pickerCell: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer',
  background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-strong)',
  borderRadius: 6, padding: 'var(--space-md)', textAlign: 'left',
}
const dot: CSSProperties = { width: 12, height: 12, borderRadius: '50%', flexShrink: 0 }
const errorBox: CSSProperties = {
  marginTop: 'var(--space-lg)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-content)', color: 'var(--color-danger)',
  border: '1px solid var(--color-danger)', borderRadius: 4, padding: 'var(--space-sm) var(--space-md)',
}
const primaryBtn: CSSProperties = {
  cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--color-bg-page)', background: 'var(--color-text-primary)',
  border: 'none', padding: 'var(--space-md) var(--space-xl)', borderRadius: 5,
}
const cancelBtn: CSSProperties = {
  cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-md)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-secondary)',
}

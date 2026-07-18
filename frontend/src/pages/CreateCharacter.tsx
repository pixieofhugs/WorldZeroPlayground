import { useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionCssVar, factionName } from '../utils/factions'
import CredentialCard from '../components/CredentialCard'
import ImageEditModal from '../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../components/imageEdit/imageEditHelpers'
import { useFormFactor } from '../hooks/useFormFactor'
import { pickVariant } from '../utils/factionDispatch'
import {
  useCreateCharacter,
  NAME_MAX,
  BIO_MAX,
  type CreateCharacterState,
} from './characterPaths/useCreateCharacter'
import DefaultCreateCharacter from './characterPaths/mobileArchetypes/DefaultCreateCharacter'

/**
 * Adaptive Character Creation (#273, ADR-0019). One screen, two renderings: the
 * faction picker appears iff the account holds invitations; otherwise a brand-new
 * account creates a born-unaffiliated ("na") life. One submit path either way.
 *
 * On a phone (#516) the same {@link useCreateCharacter} state drives a mobile
 * skin (full-column form + sticky Create), dispatched through the parallel
 * registry; every faction falls through to the Default skin. Desktop unchanged.
 */

type MobileSkin = (props: { state: CreateCharacterState }) => JSX.Element

// Only factions with a bespoke mobile create screen register here; na and the
// rest fall through to DefaultCreateCharacter (mirrors Tasks/FieldDesk).
export const MOBILE_ARCHETYPE_BY_SLUG: Record<string, MobileSkin> = {}

export default function CreateCharacter() {
  const state = useCreateCharacter()
  const formFactor = useFormFactor()

  if (formFactor === 'mobile') {
    const Mobile = pickVariant(MOBILE_ARCHETYPE_BY_SLUG, null, DefaultCreateCharacter)
    return <Mobile state={state} />
  }

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

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 24 }}>
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
            bio={bio}
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
        />
      )}
    </div>
  )
}

// --- styles (token-driven) --------------------------------------------------

const backLink: CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', padding: 0, marginBottom: 16,
}
const twoCol: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 48, alignItems: 'flex-start' }
const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 700,
  fontSize: 'var(--text-heading)', lineHeight: 1.02, color: 'var(--color-text-primary)', margin: '0 0 24px',
}
const eyebrow: CSSProperties = {
  display: 'block', fontSize: 'var(--text-sm)', letterSpacing: '0.16em', textTransform: 'uppercase',
  color: 'var(--color-text-secondary)',
}
const nameInput: CSSProperties = {
  display: 'block', width: '100%', marginTop: 8, background: 'transparent', border: 'none',
  borderBottom: '1.5px solid var(--color-text-primary)', outline: 'none',
  fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'var(--text-title)',
  color: 'var(--color-text-primary)', padding: '2px 0 8px',
}
const bioInput: CSSProperties = {
  display: 'block', width: '100%', marginTop: 6, boxSizing: 'border-box', resize: 'none',
  background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-strong)',
  borderRadius: 5, outline: 'none', fontFamily: 'var(--font-body)', fontSize: 'var(--text-content)',
  lineHeight: 1.6, color: 'var(--color-text-primary)', padding: '10px 12px',
}
const metaRow: CSSProperties = {
  display: 'flex', justifyContent: 'space-between', marginTop: 6,
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)',
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
  marginTop: 16, fontFamily: 'var(--font-body)', fontSize: 'var(--text-content)', color: 'var(--color-danger)',
  border: '1px solid var(--color-danger)', borderRadius: 4, padding: '8px 10px',
}
const primaryBtn: CSSProperties = {
  cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', letterSpacing: '0.12em',
  textTransform: 'uppercase', color: 'var(--color-bg-page)', background: 'var(--color-text-primary)',
  border: 'none', padding: '12px 24px', borderRadius: 5,
}
const cancelBtn: CSSProperties = {
  cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-sm)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-secondary)',
}

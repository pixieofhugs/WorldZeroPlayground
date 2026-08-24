import { useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { mediaUrl } from '../utils/media'
import DefaultSigil from '../components/sigil/DefaultSigil'
import ImageEditModal from '../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../components/imageEdit/imageEditHelpers'
import { useFormFactor } from '../hooks/useFormFactor'
import { useEditCharacter, type EditCharacterState } from './characterPaths/useEditCharacter'
import { TAGLINE_MAX } from './characterPaths/useCreateCharacter'
import PortraitPicker from './characterPaths/PortraitPicker'
import DefaultEditCharacter from './characterPaths/mobileArchetypes/DefaultEditCharacter'

/**
 * Edit Character — themed in the spectrum default skin for EVERYONE, regardless
 * of the character's faction (#434). "Your character is yours before any faction
 * is": a spectrum hero band + card-wrapped sections (Portrait / Identity / Your
 * story) on the --faction-default-* tokens. Retheme only — the three editable
 * fields (display_name, bio, location), the avatar upload, and validation are
 * unchanged. `@handle` is the auto-derived, unique username (ADR-0019): shown
 * read-only, never an input. No pronouns field (a separate feature — new column).
 *
 * On a phone (#516) the same {@link useEditCharacter} state drives a mobile skin
 * (single-column form + Change photo, faction link-out, delete, sticky Save),
 * dispatched through the parallel registry; every faction falls through to the
 * Default skin. Desktop unchanged.
 */
const DISPLAY = 'var(--faction-default-card-font)'

const inputStyle: CSSProperties = {
  width: '100%',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 8,
  background: 'var(--color-bg-page)',
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-content)',
  color: 'var(--color-text-primary)',
  padding: 'var(--space-md)',
  outline: 'none',
  boxSizing: 'border-box',
}

// Form field labels — read to fill the form in, so they sit on the content
// floor, not the label ramp (#623). Static, hoisted per #586.
const fieldLabel: CSSProperties = {
  display: 'block',
  fontSize: 'var(--text-content)',
  color: 'var(--color-text-secondary)',
  marginBottom: 'var(--space-sm)',
}

const headingStyle: CSSProperties = {
  fontFamily: DISPLAY,
  fontStyle: 'italic',
  // No fontWeight: Bebas Neue ships exactly one face, upright 400, and Google
  // Fonts has no bold of it to request — so `700` here bought a synthesised
  // fake-bold over an already-condensed display face, not a heavier cut (#1294).
  fontSize: 'var(--text-heading)',
  lineHeight: 1,
  margin: 'var(--space-xs) 0 0',
  color: 'var(--faction-default-card-text)',
}

const introStyle: CSSProperties = {
  fontSize: 'var(--text-content)',
  lineHeight: 1.6,
  color: 'var(--faction-default-card-muted)',
  margin: 'var(--space-lg) 0 0',
  maxWidth: 440,
}

const avatarHintStyle: CSSProperties = {
  fontSize: 'var(--text-content)',
  fontStyle: 'italic',
  fontFamily: DISPLAY,
  color: 'var(--color-text-tertiary)',
  margin: 'var(--space-md) 0 0',
  lineHeight: 1.5,
}

export default function EditCharacter() {
  const state = useEditCharacter()
  const formFactor = useFormFactor()

  // No faction ever claimed `mobileEditCharacter`, so the slot and its dispatch
  // are gone: mobile renders the Default skin directly.
  if (formFactor === 'mobile') return <DefaultEditCharacter state={state} />

  return <DesktopEditCharacter state={state} />
}

function DesktopEditCharacter({ state }: { state: EditCharacterState }) {
  const { t } = useTranslation(['forms', 'common'])
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const {
    id,
    character,
    loading,
    isOwner,
    displayName,
    setDisplayName,
    bio,
    setBio,
    tagline,
    setTagline,
    location,
    setLocation,
    avatarFile,
    avatarPreview,
    avatarSource,
    setAvatarSource,
    avatarError,
    setAvatarError,
    handleAvatarChange,
    handleAvatarConfirm,
    saving,
    canSubmit,
    error,
    handleSubmit,
  } = state

  if (loading) return <div className="py-8 font-body text-muted">{t('common:loading')}</div>
  if (!character) return <div className="py-8 font-body text-muted">{t('editCharacter.notFound')}</div>
  if (!isOwner) return <div className="py-8 font-body text-muted">{t('editCharacter.notOwner')}</div>

  // Monogram tracks the display name as you type (falls back to the handle).
  const initial = (displayName.trim()[0] || character.username[0] || '?').toUpperCase()
  // A freshly cropped portrait (object URL) shows immediately, before Save (#985);
  // otherwise fall back to the persisted avatar.
  const portraitSrc = avatarPreview ?? (character.avatar_url ? mediaUrl(character.avatar_url) : null)

  return (
    <div className="py-8" style={{ maxWidth: 640, margin: '0 auto' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>

        {/* ── Hero band — spectrum, always unaffiliated skin. A rounded BAND, so
             it keeps the 90deg linear ramp; only the circular portrait ring
             below takes the conic (#1127). ── */}
        <div style={{ borderRadius: 12, padding: 'var(--space-xs)', background: 'var(--faction-default-rainbow)' }}>
          <div
            style={{
              background: 'var(--faction-default-card-bg)',
              color: 'var(--faction-default-card-text)',
              borderRadius: 8,
              padding: 'var(--space-xl) var(--space-2xl)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <DefaultSigil size={34} />
              <div>
                <div
                  className="label-heading"
                  style={{ color: 'var(--faction-default-card-muted)', marginBottom: 0 }}
                >
                  {t('editCharacter.eyebrow')}
                </div>
                <h1 style={headingStyle}>{t('editCharacter.heading')}</h1>
              </div>
            </div>
            <p style={introStyle}>{t('editCharacter.intro')}</p>
          </div>
        </div>

        {/* ── Portrait ── */}
        <section className="sidebar-card" style={{ padding: 'var(--space-xl)' }}>
          <div className="label-heading" style={{ marginBottom: 'var(--space-lg)' }}>{t('editCharacter.portraitHeading')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)', flexWrap: 'wrap' }}>
            {/* Spectrum-framed portrait — the DefaultAvatar look at portrait size
                (reuses DefaultSigil for the corner mark). Every path still open. */}
            <div
              style={{
                position: 'relative',
                width: 82,
                height: 82,
                borderRadius: '50%',
                padding: 'var(--space-xs)',
                boxSizing: 'border-box',
                background: 'var(--faction-default-rainbow-conic)',
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
                  // eslint-disable-next-line local/no-raw-style-values -- ornament: monogram glyph scaled to the 82px portrait ring, not read text
                  fontSize: 34,
                  lineHeight: 1,
                }}
              >
                {portraitSrc ? (
                  <img
                    src={portraitSrc}
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
              <label className="font-body text-sm font-bold" style={{ display: 'block', marginBottom: 'var(--space-sm)' }}>
                {t('editCharacter.avatarLabel')}
              </label>
              {/* The picker owns the hidden input and the readout (#1149). On this
                  screen there may already be a saved portrait, so "nothing new
                  chosen" reads as keeping it rather than as having none. */}
              <PortraitPicker
                inputRef={fileRef}
                onChange={handleAvatarChange}
                chosenFile={avatarFile}
                hasCurrentPortrait={Boolean(character.avatar_url)}
                error={avatarError}
              />
              <p style={avatarHintStyle}>{t('editCharacter.avatarHint', { initial })}</p>
            </div>
          </div>
        </section>

        {/* ── Identity ── */}
        <section className="sidebar-card" style={{ padding: 'var(--space-xl)' }}>
          <div className="label-heading" style={{ marginBottom: 'var(--space-lg)' }}>{t('editCharacter.identityHeading')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <label style={{ display: 'block' }}>
              <span style={fieldLabel}>
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
                className={`font-body text-xs ${displayName.length >= 45 ? 'warning-text' : 'text-muted'}`}
                style={{ display: 'block', textAlign: 'right', marginTop: 'var(--space-xs)' }}
              >
                {t('editCharacter.displayNameCount', { count: displayName.length })}
              </span>
            </label>
            <div>
              <span style={fieldLabel}>
                {t('editCharacter.handleLabel')}
              </span>
              {/* Read-only: `username` is the auto-derived, unique handle (ADR-0019). */}
              <div
                style={{
                  ...inputStyle,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-xs)',
                  background: 'var(--color-bg-surface-alt)',
                  color: 'var(--color-text-tertiary)',
                  cursor: 'not-allowed',
                }}
              >
                <span style={{ fontFamily: 'var(--font-body)' }}>@{character.username}</span>
              </div>
              <span className="label-caption" style={{ display: 'block', marginTop: 'var(--space-sm)' }}>
                {t('editCharacter.handleHint')}
              </span>
            </div>
          </div>
        </section>

        {/* ── Your story ── */}
        <section className="sidebar-card" style={{ padding: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
            <span className="label-heading">{t('editCharacter.storyLabel')}</span>
            <span className={`font-body text-xs ${bio.length >= 450 ? 'warning-text' : 'text-muted'}`}>
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

          {/* Tagline — the slogan line (#1628). It sits inside this card rather
              than in one of its own so the two read as the pair they are: the
              paragraph, and the line that goes above it. */}
          <div style={{ marginTop: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={fieldLabel}>{t('editCharacter.taglineLabel')}</span>
              <span className={`font-body text-xs ${tagline.length >= TAGLINE_MAX ? 'warning-text' : 'text-muted'}`}>
                {t('editCharacter.taglineCount', { count: tagline.length })}
              </span>
            </div>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={TAGLINE_MAX}
              placeholder={t('editCharacter.taglinePlaceholder')}
              style={inputStyle}
            />
          </div>

          <div style={{ marginTop: 'var(--space-lg)' }}>
            <span style={fieldLabel}>
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
              className={`font-body text-xs ${location.length >= 90 ? 'warning-text' : 'text-muted'}`}
              style={{ display: 'block', marginTop: 'var(--space-xs)' }}
            >
              {t('editCharacter.basedCount', { count: location.length })}
            </span>
          </div>
        </section>

        {error && <p className="font-body content-text danger-text">{error}</p>}

        {/* ── Actions ── */}
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <button type="submit" disabled={!canSubmit} className="btn-primary">
            {saving ? t('editCharacter.saveBusy') : t('editCharacter.saveIdle')}
          </button>
          <button type="button" onClick={() => navigate(`/characters/${id}`)} className="btn-outline">
            {t('editCharacter.cancel')}
          </button>
        </div>
      </form>

      {/* Avatar crop/rotate — locked square (#514). */}
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

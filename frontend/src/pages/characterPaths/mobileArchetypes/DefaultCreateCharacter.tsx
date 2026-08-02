import { useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionCssVar, factionName } from '../../../utils/factions'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import { NAME_MAX, type CreateCharacterState } from '../useCreateCharacter'

/**
 * Default (na) MOBILE character-creation skin (#516). First-run, single-column:
 * a centred photo-add ring, name field, the born-unaffiliated explainer, an
 * optional calling picker (only when invited), and a sticky Create bar reachable
 * one-handed. Presentation-only — the whole submit path lives in
 * {@link useCreateCharacter}; every faction falls through here.
 *
 * Layout is flex/relative single-column — no fixed-px grid drives the page
 * (SPEC-faction-ui-profile §1a).
 */
export default function DefaultCreateCharacter({ state }: { state: CreateCharacterState }) {
  const { t } = useTranslation('forms')
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const {
    displayName,
    setDisplayName,
    factionSlug,
    setFactionSlug,
    invited,
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

  // One string for the ring's accessible name and its visible caption (#1149).
  // The ring never showed the browser's "No file chosen" — its input has always
  // been hidden — but it had no accessible name either: the name fell through to
  // the "+" glyph, or to the portrait's alt text once one was picked. Naming it
  // with the caption is what makes what is announced and what is on screen agree.
  const photoAction = avatarPreview
    ? t('createCharacter.mobile.changePhoto')
    : t('createCharacter.mobile.addPhoto')

  return (
    <form data-skin="default" data-testid="mobile-create-character" onSubmit={handleSubmit} style={page}>
      {/* Top row — back + title */}
      <div style={topRow}>
        <button type="button" onClick={() => navigate('/')} style={backBtn} aria-label={t('createCharacter.cancel')}>
          ‹
        </button>
        <span className="eyebrow">{t('createCharacter.mobile.title')}</span>
        <span style={{ width: 28 }} />
      </div>

      {/* Photo add */}
      <div style={{ textAlign: 'center' }}>
        <button type="button" onClick={() => fileRef.current?.click()} aria-label={photoAction} style={ringBtn}>
          <span style={ringInner}>
            {avatarPreview ? (
              <img src={avatarPreview} alt={handle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span
                aria-hidden
                style={{
                  // eslint-disable-next-line local/no-raw-style-values -- ornament: "+" is a glyph-as-icon, sized to the 104px photo ring, not text
                  fontSize: 26,
                  color: 'var(--color-text-secondary)',
                }}
              >
                +
              </span>
            )}
          </span>
        </button>
        <div className="eyebrow" style={{ marginTop: 'var(--space-md)', color: 'var(--faction-default-card-muted)' }}>
          {photoAction}
        </div>
        <div className="eyebrow" style={{ marginTop: 'var(--space-sm)', color: 'var(--color-text-tertiary)' }}>
          {t('createCharacter.mobile.step')}
        </div>
        {avatarError && <p className="content-text" style={{ ...errorBox, marginTop: 'var(--space-sm)' }}>{avatarError}</p>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />

      {/* Name */}
      <div>
        <label style={label}>{t('createCharacter.nameLabel')}</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={NAME_MAX}
          placeholder={t('createCharacter.namePlaceholder')}
          autoFocus
          className="content-text"
          style={field}
        />
        <div style={metaRow}>
          <span style={{ color: 'var(--color-text-tertiary)' }}>@{handle}</span>
          <span style={{ color: displayName.length >= NAME_MAX ? 'var(--color-danger)' : 'var(--color-text-tertiary)' }}>
            {t('createCharacter.charsLeft', { count: NAME_MAX - displayName.length })}
          </span>
        </div>
      </div>

      {/* Faction picker — only when the account holds invitations (ADR-0019) */}
      {showPicker && (
        <div>
          <label style={label}>{t('createCharacter.callingLabel')}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
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
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: factionCssVar(slug), flexShrink: 0 }} />
                  <span className="content-text" style={{ fontFamily: factionCssVar(slug, 'card-font'), color: 'var(--color-text-primary)' }}>
                    {factionName(slug)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Born-unaffiliated explainer */}
      <p className="content-text" style={help}>{t('createCharacter.mobile.help')}</p>

      {error && <p className="content-text" style={errorBox}>{error}</p>}

      {/* Sticky Create bar */}
      <div style={stickyBar}>
        <button type="submit" disabled={!canSubmit} style={{ ...primaryBtn, opacity: canSubmit ? 1 : 0.5 }}>
          {submitting ? t('createCharacter.submitBusy') : t('createCharacter.mobile.submit')}
        </button>
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
    </form>
  )
}

// --- token-driven styles (single column, no hardcoded hex) ------------------

const page: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', paddingBottom: 'var(--space-6xl)' }
const topRow: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
const backBtn: CSSProperties = {
  width: 28, height: 28, background: 'none', border: 'none', cursor: 'pointer',
  // eslint-disable-next-line local/no-raw-style-values -- ornament: the back chevron is a glyph-as-icon sized to its 28px hit target
  fontSize: 24,
  lineHeight: 1, color: 'var(--color-text-primary)', padding: 0,
}
const ringBtn: CSSProperties = {
  width: 104, height: 104, borderRadius: '50%',
  // eslint-disable-next-line local/no-raw-style-values -- ornament: rainbow ring thickness drawn around the 104px photo well; the nearest rung (4px) thickens the band by a third.
  padding: 3,
  cursor: 'pointer',
  border: 'none', background: 'var(--faction-default-rainbow-conic)',
}
const ringInner: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
  background: 'var(--color-bg-surface-alt)',
}
const label: CSSProperties = {
  display: 'block', fontSize: 'var(--text-sm)', letterSpacing: '0.16em', textTransform: 'uppercase',
  color: 'var(--color-text-secondary)',
}
const field: CSSProperties = {
  display: 'block', width: '100%', marginTop: 'var(--space-sm)', boxSizing: 'border-box',
  background: 'var(--color-bg-page)', border: '1px solid var(--color-border-strong)',
  borderRadius: 8, outline: 'none', fontFamily: 'var(--font-body)',
  color: 'var(--color-text-primary)', padding: 'var(--space-md)',
}
const metaRow: CSSProperties = {
  display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-sm)',
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)',
}
const pickerCell: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-md)', cursor: 'pointer', width: '100%',
  background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-strong)',
  borderRadius: 8, padding: 'var(--space-md) var(--space-lg)', textAlign: 'left',
}
const help: CSSProperties = {
  fontFamily: 'var(--font-body)', lineHeight: 1.6,
  color: 'var(--color-text-tertiary)', margin: 0,
}
const errorBox: CSSProperties = {
  fontFamily: 'var(--font-body)', color: 'var(--color-danger)',
  border: '1px solid var(--color-danger)', borderRadius: 6, padding: 'var(--space-md)', margin: 0,
}
const stickyBar: CSSProperties = {
  position: 'sticky',
  bottom: 'var(--tab-bar-clearance)',
  marginTop: 'auto',
  paddingTop: 'var(--space-sm)',
}
const primaryBtn: CSSProperties = {
  width: '100%', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 'var(--text-xl)',
  letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700,
  color: 'var(--color-bg-page)', background: 'var(--color-text-primary)',
  border: 'none', padding: 'var(--space-lg) var(--space-xl)', borderRadius: 12,
}

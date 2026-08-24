import { useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { mediaUrl } from '../../../utils/media'
import { UNAFFILIATED_FACTION_SLUG, factionName } from '../../../utils/factions'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import type { EditCharacterState } from '../useEditCharacter'
import { TAGLINE_MAX } from '../useCreateCharacter'

/**
 * Default (na) MOBILE edit-character skin (#516). Single column: a photo ring
 * with Change photo, name / story (`bio`) / tagline inputs, a read-only faction
 * row that links out to the Factions tab, a delete affordance (two-tap
 * confirm), and a sticky Save bar. Presentation-only — persist/delete live in
 * {@link useEditCharacter}; every faction falls through here.
 *
 * Layout is flex/relative single-column — no fixed-px grid drives the page
 * (SPEC-faction-ui-profile §1a).
 */
export default function DefaultEditCharacter({ state }: { state: EditCharacterState }) {
  const { t } = useTranslation(['forms', 'common'])
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
    tagline,
    setTagline,
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
    deleting,
    handleDelete,
  } = state

  if (loading) return <p className="font-body text-muted">{t('common:loading')}</p>
  if (!character) return <p className="font-body text-muted">{t('editCharacter.notFound')}</p>
  if (!isOwner) return <p className="font-body text-muted">{t('editCharacter.notOwner')}</p>

  const initial = (displayName.trim()[0] || character.username[0] || '?').toUpperCase()
  const factionSlug = character.faction_slug
  // `na` goes to the directory, not to `/factions/na`. The column is
  // `nullable=False` and every life starts unaffiliated, so the old `slug ? … :`
  // test never fired — but `na` is seeded HIDDEN (`backend/seed.py`), `GET
  // /factions` returns visible rows only, and `FactionDetail` derives from that
  // list. So `/factions/na` renders "Faction not found" for the one population
  // this branch exists to serve.
  const factionHref =
    factionSlug && factionSlug !== UNAFFILIATED_FACTION_SLUG
      ? `/factions/${factionSlug}`
      : '/factions'
  // A freshly cropped portrait (object URL) shows immediately, before Save (#985);
  // otherwise fall back to the persisted avatar.
  const portraitSrc = avatarPreview ?? (character.avatar_url ? mediaUrl(character.avatar_url) : null)

  return (
    <form data-skin="default" data-testid="mobile-edit-character" onSubmit={handleSubmit} style={page}>
      {/* Top row — back + title */}
      <div style={topRow}>
        <button type="button" onClick={() => navigate(`/characters/${id}`)} style={backBtn} aria-label={t('editCharacter.cancel')}>
          ‹
        </button>
        <span className="label-heading">{t('editCharacter.heading')}</span>
        <span style={{ width: 28 }} />
      </div>

      {/* Photo */}
      <div style={{ textAlign: 'center' }}>
        {/* The ring's accessible name is the caption right below it (#1149) —
            without it the name fell through to the portrait's alt text or to the
            monogram letter, neither of which says this opens a file picker. */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label={t('editCharacter.mobile.changePhoto')}
          style={ringBtn}
        >
          <span style={ringInner}>
            {portraitSrc ? (
              <img src={portraitSrc} alt={character.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span
                aria-hidden
                style={{
                  fontFamily: 'var(--faction-default-card-font)',
                  fontStyle: 'italic',
                  // eslint-disable-next-line local/no-raw-style-values -- ornament: the fallback monogram is illustration, sized to the 96px ring
                  fontSize: 34,
                  color: 'var(--color-text-primary)',
                }}
              >
                {initial}
              </span>
            )}
          </span>
        </button>
        <div className="label-caption" style={{ marginTop: 'var(--space-md)', color: 'var(--faction-default-card-muted)' }}>
          {t('editCharacter.mobile.changePhoto')}
        </div>
        {avatarError && <p className="content-text" style={{ ...errorBox, marginTop: 'var(--space-sm)' }}>{avatarError}</p>}
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
          className="content-text"
          style={field}
        />
      </div>

      {/* Your story — the long-form bio. It wore the label "Tagline" until #1628
          gave that name to a real, much shorter field one block down; it now
          takes the desktop label so both surfaces call the same field the same
          thing. */}
      <div>
        <label style={label}>{t('editCharacter.storyLabel')}</label>
        <input
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          placeholder={t('editCharacter.storyPlaceholder')}
          className="content-text"
          style={field}
        />
      </div>

      {/* Tagline — the slogan line (#1628), capped far below the bio above it. */}
      <div>
        <label style={label}>{t('editCharacter.taglineLabel')}</label>
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={TAGLINE_MAX}
          placeholder={t('editCharacter.taglinePlaceholder')}
          className="content-text"
          style={field}
        />
        <div style={counterRow}>
          {t('editCharacter.taglineCount', { count: tagline.length })}
        </div>
      </div>

      {/* Faction — read-only link out to Factions */}
      <div>
        <label style={label}>{t('editCharacter.mobile.factionLabel')}</label>
        <Link to={factionHref} className="content-text" style={factionRow}>
          <span>{factionSlug ? factionName(factionSlug) : t('editCharacter.mobile.unaffiliated')}</span>
          <span aria-hidden style={{ color: 'var(--color-text-tertiary)' }}>›</span>
        </Link>
        <p className="content-text" style={help}>{t('editCharacter.mobile.factionHelp')}</p>
      </div>

      {/* Delete — two-tap confirm */}
      {confirmingDelete ? (
        <div style={confirmRow}>
          <span className="content-text" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)' }}>
            {t('editCharacter.mobile.deleteConfirm')}
          </span>
          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
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

      {error && <p className="content-text" style={errorBox}>{error}</p>}

      {/* Sticky Save bar */}
      <div style={stickyBar}>
        {/* Same gate, same treatment as the create bar (#2486): Save is
            disabled until something has changed, so this too is how the page
            opens. The delete button below stays as it is — `disabled={deleting}`
            is a transient busy state, not a state a reader arrives in. */}
        <button type="submit" disabled={!canSubmit} className="control-off" style={primaryBtn}>
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
  width: 96, height: 96, borderRadius: '50%',
  // eslint-disable-next-line local/no-raw-style-values -- ornament: rainbow ring thickness drawn around the 96px avatar well; the nearest rung (4px) thickens the band by a third.
  padding: 3,
  cursor: 'pointer',
  border: 'none', background: 'var(--faction-default-rainbow-conic)',
}
const ringInner: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
  background: 'var(--faction-default-card-bg)',
}
const label: CSSProperties = {
  display: 'block', fontSize: 'var(--text-md)', letterSpacing: '0.16em', textTransform: 'uppercase',
  color: 'var(--color-text-secondary)', marginBottom: 'var(--space-sm)',
}
const field: CSSProperties = {
  display: 'block', width: '100%', boxSizing: 'border-box',
  background: 'var(--color-bg-page)', border: '1px solid var(--color-border-strong)',
  borderRadius: 8, outline: 'none', fontFamily: 'var(--font-body)',
  color: 'var(--color-text-primary)', padding: 'var(--space-md)',
}
const factionRow: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  background: 'var(--color-bg-surface-alt)', border: '1px solid var(--color-border-strong)',
  borderRadius: 8, padding: 'var(--space-md)', textDecoration: 'none',
  fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)',
}
const counterRow: CSSProperties = {
  textAlign: 'right', fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)',
  color: 'var(--color-text-tertiary)', marginTop: 'var(--space-sm)',
}
const help: CSSProperties = {
  fontFamily: 'var(--font-body)', lineHeight: 1.6,
  color: 'var(--color-text-tertiary)', margin: 'var(--space-sm) 0 0',
}
const deleteBtn: CSSProperties = {
  width: '100%', cursor: 'pointer', background: 'none', textAlign: 'center',
  border: '1px solid var(--color-danger)', borderRadius: 8, padding: 'var(--space-md)',
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)', letterSpacing: '0.1em',
  textTransform: 'uppercase', color: 'var(--color-danger)',
}
const confirmRow: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 'var(--space-md)',
  border: '1px solid var(--color-danger)', borderRadius: 8, padding: 'var(--space-lg)',
}
const confirmCancel: CSSProperties = {
  flex: 1, cursor: 'pointer', background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border-strong)', borderRadius: 8, padding: 'var(--space-md)',
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)',
}
const confirmDelete: CSSProperties = {
  flex: 1, cursor: 'pointer', background: 'var(--color-danger)', border: 'none',
  borderRadius: 8, padding: 'var(--space-md)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)',
  letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-danger)',
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

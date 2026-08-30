/**
 * The Default (na) edit-character archetype — the unaffiliated kit, and the
 * skin every unregistered slug lands on (#2537).
 *
 * ONE RESPONSIVE COMPONENT, no mobile twin. It reads `useFormFactor()` itself,
 * exactly as `DefaultCreateCharacter` does since #2346, and both branches — the
 * desktop card stack and the phone column (#516) — are in this one file. The
 * phone-only surface this page used to have is RETIRED and does not come back:
 * a mobile-only slot no faction ever filled is how the page went undressed for
 * six months, and `src/__tests__/retiredSurfaces.test.ts` is what holds its name
 * out of shipped source.
 *
 * THE SLUG THAT PICKS THIS ARCHETYPE IS THE EDITED CHARACTER'S, not the
 * viewer's. They are usually the same life and not always, and the page is about
 * the one it edits. `''` / `na` is an unaffiliated life and renders this, full
 * stop — never UA and never the viewer's faction, which is the guard
 * `FactionSelectCard` did not have when its `UaSelectCard` fallback "dressed
 * every unaffiliated and unknown slug in UA's costume" (#796).
 *
 * THE TWO SLOTS A CREATE DRESS HAS NO ROOM FOR are not drawn here. The faction
 * row and the destructive action live in `../editCharacterSlots`, designed once
 * so the seven faction archetypes inherit them rather than each bolting a
 * delete somewhere arbitrary (owner ruling, 2026-08-27). This file decides only
 * WHERE they sit: mid-column on the phone, in a hairline-separated tail on the
 * desktop — below Save, outside the card stack, so the irreversible act cannot
 * be read as part of the form.
 *
 * PRESENTATION ONLY. `useEditCharacter` is the single source of state for every
 * archetype; nothing here touches the persist path, the delete path, the
 * portrait picker or the avatar hook. The load / not-found / not-yours guards
 * are hoisted to the dispatcher below so the two branches cannot drift on them.
 *
 * PLACEHOLDER-ONLY, AND EVERY FIELD NAMES ITSELF (#2793). No field on this page
 * wears a visible label: the owner ruling unified the two character forms'
 * vocabulary AROUND THE CHARACTER — "Character name", "Character bio" — and put
 * those words inside the boxes rather than above them. On an edit form every
 * box is already full, so a returning player reads their own contents rather
 * than a placeholder; that cost is known and was accepted (the #2772 trade).
 * What is NOT optional is the accessible name the deleted `<label>` used to
 * supply: `namedField()` sets `placeholder` and `aria-label` from one string at
 * every field on both branches, and both registries are swept for it.
 *
 * THE FIELDS TAKE THE COMPOSER'S SHARED FOCUS RING, not one of their own
 * (#2825). Both style objects below used to set `outline: 'none'` inline with
 * nothing in its place, and an inline declaration beats any stylesheet — so
 * every field on this page took focus invisibly on both widths, which is
 * WCAG 2.4.7 at the tier this repo already enforces. The two suppressions are
 * DELETED and each field carries `data-composer-field`
 * (`[data-composer-field]:focus-visible` in `index.css`, #2266): `currentColor`
 * at a negative offset, so the ring is this page's own ink on the ground that
 * ink was measured against, and costs no token. It is the same defect and the
 * same fix #2488 shipped on the create plates; that issue was scoped to
 * creation, so this surface kept it. `editCharacterDispatch.test.tsx` sweeps
 * the edit registry for both halves — no suppression, and the shared ring.
 *
 * INKS ARE THE APP'S OWN NEUTRALS, and that is measured rather than inherited —
 * the same exemption `DefaultCreateCharacter` carries, for the same reason and
 * on the same ground. `local/no-global-ink-on-faction-surface` reads a DIRECTORY
 * NAME and cannot see a ground; this page has no faction sheet, so what is
 * behind its type is `--color-bg-page` under the `.na-backdrop` wash, where the
 * neutrals clear AA and the `--faction-default-card-*` text tiers do not.
 * `__tests__/createCharacterContrast.test.ts` is the measurement, and
 * `eslint.config.js` names both files in the one paired exemption.
 */
import { useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { mediaUrl } from '../../../utils/media'
import DefaultSigil from '../../../components/sigil/DefaultSigil'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import { useFormFactor } from '../../../hooks/useFormFactor'
import PortraitPicker from '../PortraitPicker'
import { DeleteCharacter, FactionRow } from '../editCharacterSlots'
import { namedField } from '../characterFields'
import type { EditCharacterState } from '../useEditCharacter'
import { TAGLINE_MAX } from '../useCreateCharacter'

const DISPLAY = 'var(--faction-default-card-font)'

export default function DefaultEditCharacter({ state }: { state: EditCharacterState }) {
  const { t } = useTranslation(['forms', 'common'])
  const formFactor = useFormFactor()

  // Hoisted out of both branches: three one-line states that were duplicated
  // with different markup and no reason for the difference.
  if (state.loading) return <div className="py-8 font-body text-muted">{t('common:loading')}</div>
  if (!state.character) return <div className="py-8 font-body text-muted">{t('editCharacter.notFound')}</div>
  if (!state.isOwner) return <div className="py-8 font-body text-muted">{t('editCharacter.notOwner')}</div>

  return formFactor === 'mobile' ? <MobileColumn state={state} /> : <DesktopPlate state={state} />
}

/* -------------------------------------------------------------------------- */
/* Desktop — the hero band and the card stack.                                  */
/* -------------------------------------------------------------------------- */

function DesktopPlate({ state }: { state: EditCharacterState }) {
  const { t } = useTranslation(['forms', 'common'])
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const {
    id,
    character,
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
    deleting,
    handleDelete,
  } = state
  // Narrowed by the dispatcher's guards; the branch components are never
  // rendered without a loaded, owned character.
  if (!character) return null

  // Monogram tracks the display name as you type (falls back to the handle).
  const initial = (displayName.trim()[0] || character.username[0] || '?').toUpperCase()
  // A freshly cropped portrait (object URL) shows immediately, before Save (#985);
  // otherwise fall back to the persisted avatar.
  const portraitSrc = avatarPreview ?? (character.avatar_url ? mediaUrl(character.avatar_url) : null)

  return (
    <div className="py-8" data-skin="default" style={{ maxWidth: 640, margin: '0 auto' }}>
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
          <div className="label-heading" style={{ marginBottom: 'var(--space-lg)' }}>{t('character.portrait')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)', flexWrap: 'wrap' }}>
            {/* Spectrum-framed portrait — the DefaultAvatar look at portrait size
                (reuses DefaultSigil for the corner mark). Every path still open.
                `.spectrum-dial` is the ring's paint (#2497): the conic cut of the
                na spectrum, said once in index.css rather than inline here — and
                the one mark on this page a dresser can reach. */}
            <div
              className="spectrum-dial"
              style={{
                position: 'relative',
                width: 82,
                height: 82,
                borderRadius: '50%',
                padding: 'var(--space-xs)',
                boxSizing: 'border-box',
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
              {/* A SPAN, not a <label>: this heads the picker's BUTTON, and a
                  <label> with nothing to point at is an accessible name
                  attached to nothing — the #2834 defect class, on the width
                  that issue's guard did not sweep. */}
              <span className="font-body text-sm font-bold" style={{ display: 'block', marginBottom: 'var(--space-sm)' }}>
                {t('editCharacter.avatarLabel')}
              </span>
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
            {/* A DIV, not a <label>: this form is placeholder-only since #2793,
                so the wrapper has no visible text to lend and the field names
                itself. */}
            <div>
              <input
                data-composer-field
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                {...namedField(t('character.namePlaceholder'))}
                style={inputStyle}
              />
              <span
                className={`font-body text-xs ${displayName.length >= 45 ? 'warning-text' : 'text-muted'}`}
                style={{ display: 'block', textAlign: 'right', marginTop: 'var(--space-xs)' }}
              >
                {t('editCharacter.displayNameCount', { count: displayName.length })}
              </span>
            </div>
            <div>
              {/* Read-only: `username` is the auto-derived, unique handle
                  (ADR-0019). A real `readOnly` input rather than the styled
                  <div> it used to be — the div could not carry an accessible
                  name at all (`aria-label` on a role-less element is ignored),
                  and with the visible "Handle" label deleted by #2793 that left
                  the readout announcing a bare handle and nothing else. */}
              <input
                data-composer-field
                type="text"
                readOnly
                value={`@${character.username}`}
                {...namedField(t('character.handlePlaceholder'))}
                style={{
                  ...inputStyle,
                  background: 'var(--color-bg-surface-alt)',
                  color: 'var(--color-text-tertiary)',
                }}
              />
              <span className="label-caption" style={{ display: 'block', marginTop: 'var(--space-sm)' }}>
                {t('editCharacter.handleHint')}
              </span>
            </div>
          </div>
        </section>

        {/* ── Your story ── */}
        <section className="sidebar-card" style={{ padding: 'var(--space-xl)' }}>
          {/* The counter keeps the row the deleted heading used to share with it
              (#2793), so it stays where it has always been: hard right, above
              the field it counts. */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', marginBottom: 'var(--space-lg)' }}>
            <span className={`font-body text-xs ${bio.length >= 450 ? 'warning-text' : 'text-muted'}`}>
              {t('editCharacter.storyCount', { count: bio.length })}
            </span>
          </div>
          <textarea
            data-composer-field
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={500}
            {...namedField(t('character.bioPlaceholder'))}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }}
          />

          {/* Tagline — the slogan line (#1628). It sits inside this card rather
              than in one of its own so the two read as the pair they are: the
              paragraph, and the line that goes above it. */}
          <div style={{ marginTop: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end' }}>
              <span className={`font-body text-xs ${tagline.length >= TAGLINE_MAX ? 'warning-text' : 'text-muted'}`}>
                {t('editCharacter.taglineCount', { count: tagline.length })}
              </span>
            </div>
            <input
              data-composer-field
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={TAGLINE_MAX}
              {...namedField(t('character.taglinePlaceholder'))}
              style={inputStyle}
            />
          </div>

          <div style={{ marginTop: 'var(--space-lg)' }}>
            {/* An AIRPORT CODE, and the placeholder is the only thing that says
                so (owner ruling on #2793): close enough for two players to find
                each other, too coarse to track anyone. Nothing validates the
                format — the column is free text to 100 chars — so the hint is
                the whole of the convention. */}
            <input
              data-composer-field
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={100}
              {...namedField(t('character.locationPlaceholder'))}
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
          <button type="submit" disabled={!canSubmit} className="btn-primary control-off">
            {saving ? t('editCharacter.saveBusy') : t('editCharacter.saveIdle')}
          </button>
          <button type="button" onClick={() => navigate(`/characters/${id}`)} className="btn-outline">
            {t('common:actions.cancel')}
          </button>
        </div>
      </form>

      {/* ── The tail: the calling this life already has, and the one act that
           cannot be undone. Outside the <form> and below Save, behind a
           hairline — the placement half of "delete must not read at the same
           weight as Save"; the treatment half is in `editCharacterSlots`. ── */}
      <div style={tail}>
        <FactionRow slug={character.faction_slug} />
        <DeleteCharacter slug={character.faction_slug} deleting={deleting} onDelete={handleDelete} />
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
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Phone — single column, sticky Save reachable one-handed (#516).             */
/* -------------------------------------------------------------------------- */

function MobileColumn({ state }: { state: EditCharacterState }) {
  const { t } = useTranslation(['forms', 'common'])
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const {
    id,
    character,
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
  if (!character) return null

  const initial = (displayName.trim()[0] || character.username[0] || '?').toUpperCase()
  // A freshly cropped portrait (object URL) shows immediately, before Save (#985);
  // otherwise fall back to the persisted avatar.
  const portraitSrc = avatarPreview ?? (character.avatar_url ? mediaUrl(character.avatar_url) : null)

  return (
    <form data-skin="default" data-testid="mobile-edit-character" onSubmit={handleSubmit} style={page}>
      {/* Top row — back + title */}
      <div style={topRow}>
        <button type="button" onClick={() => navigate(`/characters/${id}`)} style={backBtn} aria-label={t('common:actions.cancel')}>
          ‹
        </button>
        <span className="label-heading">{t('editCharacter.heading')}</span>
        <span style={{ width: 28 }} />
      </div>

      {/* Photo */}
      <div style={{ textAlign: 'center' }}>
        {/* The ring's accessible name is the caption right below it (#1149) —
            without it the name fell through to the portrait's alt text or to the
            monogram letter, neither of which says this opens a file picker.
            `.spectrum-dial` carries the conic ramp (#2497). */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label={t('character.changePhoto')}
          className="spectrum-dial"
          style={ringBtn}
        >
          <span style={ringInner}>
            {portraitSrc ? (
              <img src={portraitSrc} alt={character.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span
                aria-hidden
                style={{
                  fontFamily: DISPLAY,
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
          {t('character.changePhoto')}
        </div>
        {avatarError && <p className="content-text" style={{ ...errorBox, marginTop: 'var(--space-sm)' }}>{avatarError}</p>}
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />

      {/* Name */}
      <div>
        <input
          data-composer-field
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={50}
          {...namedField(t('character.namePlaceholder'))}
          className="content-text"
          style={field}
        />
      </div>

      {/* The long-form bio. It wore the label "Tagline" until #1628 gave that
          name to a real, much shorter field one block down; since #2793 neither
          wears a label at all, and the two are told apart by the words inside
          them — "Character bio" here, "Character Catchphrase" below. */}
      <div>
        <input
          data-composer-field
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          {...namedField(t('character.bioPlaceholder'))}
          className="content-text"
          style={field}
        />
      </div>

      {/* Tagline — the slogan line (#1628), capped far below the bio above it. */}
      <div>
        <input
          data-composer-field
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={TAGLINE_MAX}
          {...namedField(t('character.taglinePlaceholder'))}
          className="content-text"
          style={field}
        />
        <div style={counterRow}>
          {t('editCharacter.taglineCount', { count: tagline.length })}
        </div>
      </div>

      {/* The two edit-only slots, in the column where the phone has always put
          them. The treatment is `editCharacterSlots`'; only the place is here. */}
      <FactionRow slug={character.faction_slug} />
      <DeleteCharacter slug={character.faction_slug} deleting={deleting} onDelete={handleDelete} />

      {error && <p className="content-text" style={errorBox}>{error}</p>}

      {/* Sticky Save bar */}
      <div style={stickyBar}>
        {/* Same gate, same treatment as the create bar (#2486): Save is
            disabled until something has changed, so this too is how the page
            opens. The delete control keeps its own answer — `disabled={deleting}`
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

// --- desktop styles (token-driven) ------------------------------------------

const inputStyle: CSSProperties = {
  width: '100%',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 8,
  background: 'var(--color-bg-page)',
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-content)',
  color: 'var(--color-text-primary)',
  padding: 'var(--space-md)',
  boxSizing: 'border-box',
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

const tail: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)',
  borderTop: '1px solid var(--color-border)',
  marginTop: 'var(--space-3xl)', paddingTop: 'var(--space-xl)',
}

// --- phone styles (single column, no hardcoded hex) -------------------------

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
  // The ramp is `.spectrum-dial`'s at the mount above, not a declaration here
  // (#2497). Geometry stays at the call site.
  border: 'none',
}
const ringInner: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
  background: 'var(--faction-default-card-bg)',
}
const field: CSSProperties = {
  display: 'block', width: '100%', boxSizing: 'border-box',
  background: 'var(--color-bg-page)', border: '1px solid var(--color-border-strong)',
  borderRadius: 8, fontFamily: 'var(--font-body)',
  color: 'var(--color-text-primary)', padding: 'var(--space-md)',
}
const counterRow: CSSProperties = {
  textAlign: 'right', fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)',
  color: 'var(--color-text-tertiary)', marginTop: 'var(--space-sm)',
}
/* NOT `--color-danger`, and this is a fix rather than a preference. The neutral
   functional red is 3.42:1 on this page's washed ground in light — a fail, and
   it is what this branch shipped. `-card-alarm` is already measured here at
   5.89 / 7.85 (`__tests__/createCharacterContrast.test.ts`), and it is the same
   swap #2346 made on the sibling create page for the same reason (#1302). */
const errorBox: CSSProperties = {
  fontFamily: 'var(--font-body)', color: 'var(--faction-default-card-alarm)',
  border: '1px solid var(--faction-default-card-alarm)', borderRadius: 6, padding: 'var(--space-md)', margin: 0,
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

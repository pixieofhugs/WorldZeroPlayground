/**
 * The Default (na) character-creation archetype — the unaffiliated kit, and the
 * fallback every unregistered slug lands on (#2346).
 *
 * ONE RESPONSIVE COMPONENT, no mobile twin. It reads `useFormFactor()` itself,
 * the way `editPraxis` and the profile bodies do, and the two branches below are
 * the two skins that used to be two files: the desktop two-column form that
 * lived in `pages/CreateCharacter.tsx`, and the first-run phone column that
 * lived in `characterPaths/mobileArchetypes/DefaultCreateCharacter.tsx` (#516).
 * That second file is gone rather than left beside this one — a second mobile
 * path is exactly what the `mobileCreateCharacter` retirement note in
 * `factions/manifest.ts` forbids re-creating.
 *
 * THE DEFAULT IS THE `na` KIT, NOT UA AND NOT THE VIEWER'S FACTION. An empty
 * `factionSlug` means born unaffiliated and renders this, full stop. The
 * precedent is `FactionSelectCard`, whose fallback used to be `UaSelectCard` and
 * so "dressed every unaffiliated and unknown slug in UA's costume" (#796, the
 * third instance of #418/#636). `albescent` reaches here too, and deliberately:
 * it is pickable at creation since #2399, and every Albescent registration is a
 * WRAPPER rather than a skin (ADR-0027), so the na kit is the floor that pattern
 * is built on rather than a gap. How an aurora should wash an `na` ground is
 * #2401, and is a design question.
 *
 * PRESENTATION ONLY. `useCreateCharacter` is the single source of state for all
 * eight archetypes; nothing here touches the submit path, the payload, the
 * portrait picker or the avatar hook.
 *
 * THE PHONE BRANCH CARRIES NO PROSE FIELDS, deliberately and unchanged: it is
 * "Step 1 of 2 · Identity" and has never offered `bio`, which mobile players
 * write on the edit screen instead. `tagline` (#1628) follows `bio` for exactly
 * that reason, so the two stay a pair rather than one of them quietly becoming
 * the phone's only first-run prose field.
 *
 * INKS ARE UNCHANGED FROM WHAT BOTH FILES SHIPPED — the app's own neutral
 * tiers, kept because they are what this page's real ground was measured
 * against. See the constant block below for the numbers and for the lint
 * exemption they justify. Layout is flex/relative single-column on the phone —
 * no fixed-px grid drives the page (SPEC-faction-ui-profile §1a).
 */
import { useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionCssVar, factionName } from '../../../utils/factions'
import CredentialCard from '../../../components/CredentialCard'
import FactionSigil from '../../../components/sigil/FactionSigil'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import { useFormFactor } from '../../../hooks/useFormFactor'
import PortraitPicker from '../PortraitPicker'
import {
  NAME_MAX,
  BIO_MAX,
  TAGLINE_MAX,
  type CreateCharacterState,
} from '../useCreateCharacter'

/* The na kit's inks and grounds, named once.
 *
 * THE THREE TEXT TIERS ARE THE APP'S OWN NEUTRALS, AND THAT IS MEASURED RATHER
 * THAN INHERITED. `local/no-global-ink-on-faction-surface` bans `--color-text-*`
 * under an `archetypes/` directory, and this file carries the one documented
 * exemption from it (see `eslint.config.js`, and the paired measurement in
 * `__tests__/createCharacterContrast.test.ts` which is the other half of it).
 *
 * The reason is the GROUND. Every other `Default*` archetype draws on the na
 * CARD — `DefaultEditPraxis` sits on `--faction-default-card-bg` — where the na
 * card inks are the measured pair. This page has no card: it is bare app page,
 * so what is actually behind this type is `--color-bg-page` with the
 * `.na-backdrop` watercolour washed over it. Measured on that COMPOSITE in
 * light, the card family does not clear AA and the neutrals do:
 *
 *     ink                                 light   dark
 *     --color-text-secondary              6.06    6.68   ← used here
 *     --color-text-tertiary               6.10    7.17   ← used here
 *     --faction-default-card-muted        4.36    4.75
 *     --faction-default-composer-faint    3.50    4.18
 *
 * So the neutral tier is not "a real token at the wrong tier" here, which is
 * what the rule exists to catch on a faction SHEET; it is the tier this ground
 * was chosen against. #1932 recorded the same ruling for `pages/players/`:
 * widening that glob "would ban the global tiers on the surface they are right
 * for". Do not swap these for `--faction-default-*` without re-measuring over
 * the wash — the flat token reads 4.49 and the composite 3.50.
 */
const INK = 'var(--color-text-primary)'
const MUTED = 'var(--color-text-secondary)'
const FAINT = 'var(--color-text-tertiary)'
/* NOT `--color-danger`, and this is a fix rather than a preference (#2346).
 * The neutral functional red is 3.42:1 on this page's washed ground in light —
 * a fail, and it is what both source files shipped. `-card-alarm` exists for all
 * eight keys, is already measured, and reads 5.89 / 7.85 here. That is #1302's
 * shape, the same one every composer error banner follows: a shared functional
 * ink inside a faction frame takes the faction's own card family. */
const ALARM = 'var(--faction-default-card-alarm)'
const FIELD = 'var(--color-bg-surface)'
const BORDER = 'var(--color-border-strong)'
const ON_ACCENT = 'var(--color-bg-page)'
const RING = 'var(--faction-default-rainbow-conic)'

export default function DefaultCreateCharacter({ state }: { state: CreateCharacterState }) {
  const formFactor = useFormFactor()
  return formFactor === 'mobile' ? <MobileColumn state={state} /> : <DesktopPlate state={state} />
}

/* -------------------------------------------------------------------------- */
/* Desktop — the two-column form, with the live credential preview beside it.   */
/* -------------------------------------------------------------------------- */

function DesktopPlate({ state }: { state: CreateCharacterState }) {
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
    <div className="page" data-skin="default">
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
            <span style={{ color: FAINT }}>@{handle}</span>
            <span style={{ color: displayName.length >= NAME_MAX ? ALARM : FAINT }}>
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
            <span style={{ color: FAINT }}>{t('createCharacter.charsLeft', { count: BIO_MAX - bio.length })}</span>
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
            <span style={{ color: tagline.length >= TAGLINE_MAX ? ALARM : FAINT }}>
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
            errorStyle={{ color: ALARM }}
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
                      {/* The faction's own mark, from the dispatcher every
                          other chooser draws (#2223) — the 12px disc it
                          replaces was a placeholder for a mark that exists. */}
                      <FactionSigil slug={slug} size={18} />
                      <span style={{ fontFamily: factionCssVar(slug, 'card-font'), fontSize: 'var(--text-content)', color: INK }}>
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
            {/* The DESKTOP Create had the inverse of the phone bar's bug
                (#2486): no disabled treatment at all, so a control the form
                gates read exactly like a live one. `.control-off` gives the two
                the same answer. */}
            <button type="submit" disabled={!canSubmit} className="control-off" style={primaryBtn}>
              {submitting ? t('createCharacter.submitBusy') : t('createCharacter.submitIdle')}
            </button>
            <button type="button" onClick={() => navigate('/')} style={cancelBtn}>{t('createCharacter.cancel')}</button>
            <span style={{ fontSize: 'var(--text-content)', color: FAINT, letterSpacing: '0.06em' }}>
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

/* -------------------------------------------------------------------------- */
/* Phone — first-run single column, sticky Create reachable one-handed (#516).  */
/* -------------------------------------------------------------------------- */

function MobileColumn({ state }: { state: CreateCharacterState }) {
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
        <span className="label-heading">{t('createCharacter.mobile.title')}</span>
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
                  color: MUTED,
                }}
              >
                +
              </span>
            )}
          </span>
        </button>
        <div className="label-caption" style={{ marginTop: 'var(--space-md)', color: MUTED }}>
          {photoAction}
        </div>
        <div className="label-caption" style={{ marginTop: 'var(--space-sm)' }}>
          {t('createCharacter.mobile.step')}
        </div>
        {avatarError && <p className="content-text" style={{ ...mobileErrorBox, marginTop: 'var(--space-sm)' }}>{avatarError}</p>}
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
        <div style={mobileMetaRow}>
          <span style={{ color: FAINT }}>@{handle}</span>
          <span style={{ color: displayName.length >= NAME_MAX ? ALARM : FAINT }}>
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
                    ...mobilePickerCell,
                    boxShadow: selected ? `0 0 0 2px ${factionCssVar(slug)}` : 'none',
                  }}
                >
                  {/* The faction's own mark, from the dispatcher every other
                      chooser draws (#2223) — 18px, the size the propose-task
                      chips use; the 12px disc it replaces was a placeholder. */}
                  <FactionSigil slug={slug} size={18} />
                  <span className="content-text" style={{ fontFamily: factionCssVar(slug, 'card-font'), color: INK }}>
                    {factionName(slug)}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="content-text" style={{ ...help, marginTop: 'var(--space-sm)' }}>{t('createCharacter.callingHint')}</p>
        </div>
      )}

      {/* Born-unaffiliated explainer */}
      <p className="content-text" style={help}>{t('createCharacter.mobile.help')}</p>

      {error && <p className="content-text" style={mobileErrorBox}>{error}</p>}

      {/* Sticky Create bar */}
      <div style={stickyBar}>
        <button type="submit" disabled={!canSubmit} className="control-off" style={mobilePrimaryBtn}>
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

// --- desktop styles (token-driven) ------------------------------------------

const backLink: CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 'var(--text-lg)', color: MUTED, padding: 0, marginBottom: 'var(--space-lg)',
}
const twoCol: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4xl)', alignItems: 'flex-start' }
const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 700,
  fontSize: 'var(--text-heading)', lineHeight: 1.02, color: INK, margin: '0 0 var(--space-xl)',
}
const eyebrow: CSSProperties = {
  display: 'block', fontSize: 'var(--text-md)', letterSpacing: '0.16em', textTransform: 'uppercase',
  color: MUTED,
}
const nameInput: CSSProperties = {
  display: 'block', width: '100%', marginTop: 'var(--space-sm)', background: 'transparent', border: 'none',
  borderBottom: `1.5px solid ${INK}`, outline: 'none',
  fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'var(--text-title)',
  color: INK, padding: 'var(--space-xs) 0 var(--space-sm)',
}
const bioInput: CSSProperties = {
  display: 'block', width: '100%', marginTop: 'var(--space-sm)', boxSizing: 'border-box', resize: 'none',
  background: FIELD, border: `1px solid ${BORDER}`,
  borderRadius: 5, outline: 'none', fontFamily: 'var(--font-body)', fontSize: 'var(--text-content)',
  lineHeight: 1.6, color: INK, padding: 'var(--space-md)',
}
const pickerGrid: CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginTop: 'var(--space-md)',
}
const pickerCell: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer',
  background: FIELD, border: `1px solid ${BORDER}`,
  borderRadius: 6, padding: 'var(--space-md)', textAlign: 'left',
}
const primaryBtn: CSSProperties = {
  cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)', letterSpacing: '0.12em',
  textTransform: 'uppercase', color: ON_ACCENT, background: INK,
  border: 'none', padding: 'var(--space-md) var(--space-xl)', borderRadius: 5,
}
const cancelBtn: CSSProperties = {
  cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-md)', letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED,
}

const metaRow: CSSProperties = {
  display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-sm)',
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)',
}
const errorBox: CSSProperties = {
  marginTop: 'var(--space-lg)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-content)', color: ALARM,
  border: `1px solid ${ALARM}`, borderRadius: 4, padding: 'var(--space-sm) var(--space-md)',
}

// --- phone styles (single column, no hardcoded hex) -------------------------
//
// The counter row and the error box are NOT shared with the desktop pair above,
// and that is deliberate rather than a missed de-duplication: the phone sets
// them a rung apart (`--text-base` against `--text-lg`, a roomier box with no
// top margin). Folding the two files into one archetype is a dispatch change,
// not a redesign, so each branch keeps the metrics it shipped with.

const page: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)', paddingBottom: 'var(--space-6xl)' }
const topRow: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
const backBtn: CSSProperties = {
  width: 28, height: 28, background: 'none', border: 'none', cursor: 'pointer',
  // eslint-disable-next-line local/no-raw-style-values -- ornament: the back chevron is a glyph-as-icon sized to its 28px hit target
  fontSize: 24,
  lineHeight: 1, color: INK, padding: 0,
}
const ringBtn: CSSProperties = {
  width: 104, height: 104, borderRadius: '50%',
  // eslint-disable-next-line local/no-raw-style-values -- ornament: rainbow ring thickness drawn around the 104px photo well; the nearest rung (4px) thickens the band by a third.
  padding: 3,
  cursor: 'pointer',
  border: 'none', background: RING,
}
const ringInner: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
  background: 'var(--color-bg-surface-alt)',
}
const label: CSSProperties = {
  display: 'block', fontSize: 'var(--text-md)', letterSpacing: '0.16em', textTransform: 'uppercase',
  color: MUTED,
}
const field: CSSProperties = {
  display: 'block', width: '100%', marginTop: 'var(--space-sm)', boxSizing: 'border-box',
  background: 'var(--color-bg-page)', border: `1px solid ${BORDER}`,
  borderRadius: 8, outline: 'none', fontFamily: 'var(--font-body)',
  color: INK, padding: 'var(--space-md)',
}
const mobileMetaRow: CSSProperties = {
  display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-sm)',
  fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)',
}
const mobileErrorBox: CSSProperties = {
  fontFamily: 'var(--font-body)', color: ALARM,
  border: `1px solid ${ALARM}`, borderRadius: 6, padding: 'var(--space-md)', margin: 0,
}
const mobilePickerCell: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 'var(--space-md)', cursor: 'pointer', width: '100%',
  background: FIELD, border: `1px solid ${BORDER}`,
  borderRadius: 8, padding: 'var(--space-md) var(--space-lg)', textAlign: 'left',
}
const help: CSSProperties = {
  fontFamily: 'var(--font-body)', lineHeight: 1.6,
  color: FAINT, margin: 0,
}
const stickyBar: CSSProperties = {
  position: 'sticky',
  bottom: 'var(--tab-bar-clearance)',
  marginTop: 'auto',
  paddingTop: 'var(--space-sm)',
}
const mobilePrimaryBtn: CSSProperties = {
  width: '100%', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 'var(--text-xl)',
  letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700,
  color: ON_ACCENT, background: INK,
  border: 'none', padding: 'var(--space-lg) var(--space-xl)', borderRadius: 12,
}

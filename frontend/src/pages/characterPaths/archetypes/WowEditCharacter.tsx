/**
 * WOW edit-character — THE AMENDED CHARTER (#2537). Derived from
 * `WowCreateCharacter` (owner ruling): same chassis, head, field and gold band,
 * plus the edit-only fields and the two `../editCharacterSlots`, mounted not redrawn.
 *
 * The cast band is flush to the sheet's bottom (#1828), so the slots go on THE
 * CODICIL: a plainer second sheet below, outside the form, at both widths.
 * Per the slots' `ponytail:` note they are re-measured on this cream in
 * `__tests__/wowEditCharacterContrast.test.ts`, text and non-text (#2987).
 *
 * GOLD never sets type (2.24:1); MUTED is cream-only (4.24 on the plate).
 * Placeholder-only fields via `namedField()` (#2793); the na kit's eyebrow/intro/
 * avatar copy is not read (it speaks the unaffiliated page). State is `useEditCharacter`'s.
 */
import { useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionRoleVars } from '../../../utils/factionRoles'
import { factionBodyVars } from '../../../utils/factionBodyFace'
import { mediaUrl } from '../../../utils/media'
import CredentialCard from '../../../components/CredentialCard'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import { BalloonBunch, Bunting, Zig } from '../../../components/factionMarks/wowOrnament'
import { WowSpark } from '../../../components/factionMarks/wowMobile'
import PortraitPicker from '../PortraitPicker'
import { LOCATION_FIELD_MIN_WIDTH, LOCATION_CODE_LENGTH, namedField } from '../characterFields'
import { DeleteCharacter, FactionRow } from '../editCharacterSlots'
import { TAGLINE_MAX } from '../useCreateCharacter'
import type { EditCharacterState } from '../useEditCharacter'
import {
  ComposerFooter,
  ComposerMasthead,
  ComposerPage,
  ComposerSection,
  ComposerSheet,
  ErrorBanner,
  composerBandStyle,
  composerLabelStyle,
  useComposerSizes,
} from '../../editPraxis/archetypes/shared'

const SLUG = 'wow'

/* Edit caps, not create's NAME_MAX/BIO_MAX (22/160); the `*Count` strings print these. */
const NAME_LIMIT = 50
const STORY_LIMIT = 500

/* Core roles via `factionRoleVars` on the page root (#2674); no fallback arms
   (ADR-0089). Non-role names are this surface's own extras. */
const MED = 'var(--wow-edit-face)'
/** Lora — body and label. */
const LORA = 'var(--faction-wow-body-font)'

const SHEET = 'var(--wow-edit-paper)'
/** The inset plate every field sits on. */
const FIELD = 'var(--faction-wow-chronicle-panel)'
const INK = 'var(--wow-edit-ink)'
/** Quiet ink — CREAM ONLY. */
const MUTED = 'var(--wow-edit-quiet)'
/** Label ink, measured on both grounds. */
const LABEL = 'var(--faction-wow-accent-deep)'
/** Never an ink. */
const GOLD = 'var(--faction-wow-chronicle-gold)'
/** Gilt at 40%. */
const RULE = 'var(--faction-wow-rule)'
const ON_GOLD = 'var(--faction-wow-on-gold)'
const RIBBON = 'var(--faction-wow-quest-ribbon)'
const SHEET_SHADOW = 'var(--faction-wow-detail-shadow)'
/** #1449's alarm rung; `--color-danger` is 4.40:1 here. */
const ALARM = 'var(--faction-wow-card-alarm)'

/* Ornament geometry (§4a). */
const BUNCH = { desktop: 38, mobile: 30 }
const RADIUS = 6

export default function WowEditCharacter({ state }: { state: EditCharacterState }) {
  const { t } = useTranslation(['forms', 'common'])
  const navigate = useNavigate()
  const sizes = useComposerSizes()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const factor = sizes.isMobile ? 'mobile' : 'desktop'
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
    deleting,
    handleDelete,
  } = state

  // na's guards, in neutral chrome: don't flash a charter then say "not yours".
  if (loading) return <div className="py-8 font-body text-muted">{t('common:loading')}</div>
  if (!character) return <div className="py-8 font-body text-muted">{t('editCharacter.notFound')}</div>
  if (!isOwner) return <div className="py-8 font-body text-muted">{t('editCharacter.notOwner')}</div>

  const sectionLabel: CSSProperties = { fontFamily: LORA, color: LABEL }
  const fieldBox = {
    width: '100%',
    background: FIELD,
    color: INK,
    border: `1.5px solid ${GOLD}`,
    borderRadius: RADIUS,
    padding: 'var(--space-md)',
    boxSizing: 'border-box',
    fontFamily: LORA,
    fontSize: 'var(--text-content)',
  } as const

  const counter = (text: string, spent: boolean) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: LORA, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: spent ? ALARM : MUTED }}>{text}</span>
    </div>
  )

  /* Codicil plate (#2987): the slots' neutral plate is 1.06:1 / 1.41:1 on this
     cream, under 1.4.11's 3:1. No fill can clear 3:1 without reading as a hole,
     so the EDGE carries it: LABEL (5.32 / 8.83), not GOLD (2.24). Via #2956's seam. */
  const codicilPlate: CSSProperties = {
    background: FIELD,
    border: `1.5px solid ${LABEL}`,
    borderRadius: RADIUS,
  }

  const sheetStyle = {
    background: SHEET,
    border: `1.5px solid ${GOLD}`,
    borderRadius: RADIUS,
    boxShadow: SHEET_SHADOW,
  }

  /* The decree's head: ribbon then pennants (#2032); the sheet clips them. */
  const masthead = (
    <>
      <ComposerMasthead background={RIBBON} height={7} />
      <Bunting />
    </>
  )

  // Fresh crop shows before Save (#985).
  const portraitSrc = avatarPreview ?? (character.avatar_url ? mediaUrl(character.avatar_url) : null)

  return (
    <ComposerPage
      sizes={sizes}
      style={{ ...factionBodyVars("wow"), ...factionRoleVars('wow', 'wow-edit'), fontFamily: LORA, color: INK }}
    >
      {/* Real form so Enter submits; handleSubmit preventDefaults. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        <ComposerSheet
          sizes={sizes}
          style={sheetStyle}
          masthead={masthead}
          // One gap before the codicil, not two stacked.
          pageStyle={{ paddingBottom: 'var(--space-xl)' }}
        >
          {/* Hero row; wraps on a phone. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontFamily: MED, fontSize: 'var(--text-heading)', lineHeight: 1 }}>
              <WowSpark />
            </span>
            <h1
              style={{
                fontFamily: MED,
                fontSize: sizes.titleSize,
                lineHeight: 1.1,
                color: INK,
                margin: 0,
              }}
            >
              {t('editCharacter.heading')}
            </h1>
            <Zig id="amend-head" style={{ flex: 1, minWidth: 0 }} />
            <BalloonBunch size={BUNCH[factor]} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <CredentialCard
              displayName={displayName || character.display_name}
              handle={character.username}
              factionSlug={character.faction_slug}
              level={character.level}
              score={character.score}
              avatarUrl={portraitSrc}
              onAvatarClick={() => fileInputRef.current?.click()}
            />
          </div>

          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={NAME_LIMIT}
              {...namedField(t('character.namePlaceholder'))}
              style={{ ...fieldBox, fontFamily: MED }}
            />
            {counter(
              t('editCharacter.displayNameCount', { count: displayName.length }),
              displayName.length >= NAME_LIMIT,
            )}
          </ComposerSection>

          {/* Permanent handle (ADR-0019): a real readOnly input so it has a name
              (#2793); quiet gold marks it uneditable. */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              readOnly
              value={`@${character.username}`}
              {...namedField(t('character.handlePlaceholder'))}
              style={{ ...fieldBox, border: `1.5px solid ${RULE}`, color: INK }}
            />
            <p style={{ fontFamily: LORA, fontStyle: 'italic', fontSize: 'var(--text-content)', color: MUTED, margin: 'var(--space-sm) 0 0', lineHeight: 1.55 }}>
              {t('editCharacter.handleHint')}
            </p>
          </ComposerSection>

          <ComposerSection rule={false}>
            <textarea
              data-composer-field
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={STORY_LIMIT}
              {...namedField(t('character.bioPlaceholder'))}
              rows={4}
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.7 }}
            />
            {counter(t('editCharacter.storyCount', { count: bio.length }), bio.length >= STORY_LIMIT)}
          </ComposerSection>

          {/* Catchphrase: a slogan, not a short bio (#1628). */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={TAGLINE_MAX}
              {...namedField(t('character.taglinePlaceholder'))}
              style={fieldBox}
            />
            {counter(
              t('editCharacter.taglineCount', { count: tagline.length }),
              tagline.length >= TAGLINE_MAX,
            )}
          </ComposerSection>

          {/* Airport code by convention only; free text (#2793). */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={LOCATION_CODE_LENGTH}
              {...namedField(t('character.locationPlaceholder'))}
              style={{ ...fieldBox, maxWidth: LOCATION_FIELD_MIN_WIDTH }}
            />
          </ComposerSection>

          {/* Picker owns the hidden input (#1149); `hasCurrentPortrait` makes
              "nothing chosen" read as keeping the saved one. */}
          <ComposerSection rule={false} label={t('character.portrait')} labelStyle={sectionLabel}>
            {/* Dressed: `.btn-outline` reads as a browser control on parchment. */}
            <PortraitPicker
              inputRef={fileInputRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
              hasCurrentPortrait={Boolean(character.avatar_url)}
              error={avatarError}
              buttonStyle={composerLabelStyle({
                fontFamily: MED,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                borderRadius: RADIUS,
                padding: 'var(--space-sm) var(--space-lg)',
                background: FIELD,
                color: INK,
                border: `1.5px solid ${GOLD}`,
              })}
              statusStyle={{ fontFamily: LORA, fontStyle: 'italic', color: MUTED }}
              errorStyle={{ color: ALARM }}
            />
          </ComposerSection>

          <ErrorBanner message={error} style={{ color: ALARM }} />

          {/* One zigzag above the footer (#1707). */}
          <Zig id="amend-footer" />

          {/* [Cancel] … [Save] (#646), full-bleed band (#1828). */}
          <ComposerFooter
            band
            start={
              <button
                type="button"
                onClick={() => navigate(`/characters/${id}`)}
                style={composerLabelStyle({
                  fontFamily: LORA,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: LABEL,
                  textDecoration: 'underline',
                })}
              >
                {t('common:actions.cancel')}
              </button>
            }
            end={
              <button
                type="submit"
                disabled={!canSubmit}
                className="control-off"
                style={{
                  ...composerBandStyle(sizes, {
                    /* Display face, matching the writ's band. */
                    fontFamily: MED,
                    fontSize: 'var(--text-content)',
                    letterSpacing: '0.14em',
                    frame: GOLD,
                    color: ON_GOLD,
                    background: GOLD,
                  }),
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                {saving ? t('editCharacter.saveBusy') : t('editCharacter.saveIdle')}
                <WowSpark color={ON_GOLD} />
              </button>
            }
          />
        </ComposerSheet>
      </form>

      {/* The codicil (see header): no ribbon or cast, so it never reads as a
          second charter. */}
      <ComposerSheet sizes={sizes} style={sheetStyle} pageStyle={{ paddingTop: 0 }}>
        <Zig id="amend-codicil" />
        <FactionRow slug={character.faction_slug} picker={state.faction} rowStyle={codicilPlate} />
        <DeleteCharacter
          slug={character.faction_slug}
          deleting={deleting}
          onDelete={handleDelete}
          // Cancel gets the same plate; Delete keeps danger/on-danger (a ground
          // and its ink, 2026-08-27 ruling).
          cancelStyle={codicilPlate}
        />
      </ComposerSheet>

      {/* Crop locked square (#514). */}
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
    </ComposerPage>
  )
}

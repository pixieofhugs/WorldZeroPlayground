/**
 * Default (na) character edit: the unaffiliated kit and the skin for any
 * unregistered slug (#2537, on the composer chassis since #2991). One responsive
 * tree, so phone and desktop cannot disagree on fields. Dress is
 * `DefaultEditPraxis`'s (ADR-0065's reference kit); its own tree, not a merge.
 *
 * The slug is the EDITED character's, not the viewer's; `''` / `na` renders this,
 * never UA (#796).
 *
 * The `../editCharacterSlots` tail sits behind the sheet's hairline, below Save
 * (#2991), inside the `<form>`: neither slot can submit (`type="button"`, `<Link>`).
 *
 * Inks are na's composer tokens, since the ground is the aurora sheet, not the
 * page (rows: `composerGround.test.ts`, `createCharacterContrast.test.ts`). The
 * slots take the same tokens through #2956's style seam. Tier split is by ground
 * (#2485): FAINT on the washed sheet, MUTED on the opaque field well.
 *
 * `useEditCharacter` owns all state; the load guards render outside the sheet in
 * app chrome. Placeholder-only via `namedField()` (#2793), with
 * `data-composer-field` for the shared focus ring. `ep-drift` is a class so the
 * reduced-motion guard applies (#1003).
 */
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { mediaUrl } from '../../../utils/media'
import CredentialCard from '../../../components/CredentialCard'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import PortraitPicker from '../PortraitPicker'
import { DeleteCharacter, FactionRow } from '../editCharacterSlots'
import { LOCATION_CODE_LENGTH, namedField } from '../characterFields'
import {
  ComposerFooter,
  ComposerPage,
  ComposerRule,
  ComposerSection,
  ComposerSheet,
  ErrorBanner,
  composerLabelStyle,
  useComposerSizes,
} from '../../editPraxis/archetypes/shared'
import {
  ALARM,
  EDGE,
  FAINT,
  FIELD,
  HAIR,
  INK,
  MUTED,
  TITLE_FACE,
  composerGround,
  fieldBox,
  labelStyle,
  primaryStyle,
  sheetStyle,
} from '../../editPraxis/archetypes/defaultComposerDress'
import type { EditCharacterState } from '../useEditCharacter'
import { TAGLINE_MAX } from '../useCreateCharacter'

/* Edit caps, not create's (22/160); only TAGLINE_MAX is shared. */
const NAME_MAX = 50
const BIO_MAX = 500

/* Slot dress (#2956's seam). Alarm ink stays default (`-default-card-alarm`,
 * measured on this composite). Both plates are controls, so their edge is
 * {@link EDGE} (WCAG 1.4.11), not the hairline. */
const slotLabel = { color: FAINT }
const slotRow = {
  background: FIELD,
  border: `1px solid ${EDGE}`,
  borderRadius: 10,
  color: INK,
}
const slotQuiet = { color: FAINT }
const slotCancel = {
  background: FIELD,
  border: `1px solid ${EDGE}`,
  borderRadius: 10,
  color: INK,
}

export default function DefaultEditCharacter({ state }: { state: EditCharacterState }) {
  const { t } = useTranslation(['forms', 'common'])
  const navigate = useNavigate()
  const sizes = useComposerSizes()
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
    deleting,
    handleDelete,
  } = state

  // No sheet yet, so app chrome.
  if (loading) return <div className="py-8 font-body text-muted">{t('common:loading')}</div>
  if (!character) return <div className="py-8 font-body text-muted">{t('editCharacter.notFound')}</div>
  if (!isOwner) return <div className="py-8 font-body text-muted">{t('editCharacter.notOwner')}</div>

  // A fresh crop shows before Save (#985).
  const portraitSrc = avatarPreview ?? (character.avatar_url ? mediaUrl(character.avatar_url) : null)

  const counter = (label: string, used: number, max: number) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)' }}>
      <span style={{ color: used >= max ? ALARM : FAINT }}>{label}</span>
    </div>
  )

  return (
    <ComposerPage sizes={sizes} style={{ fontFamily: TITLE_FACE, color: INK }}>
      {/* Real `<form>` so Enter commits; `handleSubmit` prevents default. */}
      <form onSubmit={handleSubmit} data-skin="default">
        <ComposerSheet sizes={sizes} style={sheetStyle} ground={composerGround}>
          <h1
            style={{
              fontFamily: TITLE_FACE,
              fontStyle: 'italic',
              fontWeight: 700,
              fontSize: sizes.titleSize,
              lineHeight: 1.1,
              color: INK,
              margin: 0,
            }}
          >
            {t('editCharacter.heading')}
          </h1>

          {/* What an unaffiliated life is (cf. #2992). */}
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-content)', color: FAINT, margin: 0, lineHeight: 1.6 }}>
            {t('editCharacter.intro')}
          </p>

          {/* The card's `.spectrum-dial` is what Albescent sets turning (#783). */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <CredentialCard
              displayName={displayName || character.username}
              handle={character.username}
              factionSlug={character.faction_slug}
              level={character.level}
              score={character.score}
              avatarUrl={portraitSrc}
              onAvatarClick={() => fileRef.current?.click()}
            />
          </div>

          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={NAME_MAX}
              {...namedField(t('character.namePlaceholder'))}
              style={{ ...fieldBox, fontFamily: TITLE_FACE, fontStyle: 'italic', fontSize: 'var(--text-title)' }}
            />
            {counter(
              t('editCharacter.displayNameCount', { count: displayName.length }),
              displayName.length,
              NAME_MAX,
            )}
          </ComposerSection>

          {/* Handle is permanent (ADR-0019). A `readOnly` input, not a div: a
              role-less div ignores `aria-label`. */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              readOnly
              value={`@${character.username}`}
              {...namedField(t('character.handlePlaceholder'))}
              /* MUTED: type on the opaque well (6.05 / 5.23:1, #2992). */
              style={{ ...fieldBox, color: MUTED }}
            />
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)', color: FAINT, margin: 0 }}>
              {t('editCharacter.handleHint')}
            </p>
          </ComposerSection>

          <ComposerSection rule={false}>
            <textarea
              data-composer-field
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={BIO_MAX}
              {...namedField(t('character.bioPlaceholder'))}
              rows={4}
              style={fieldBox}
            />
            {counter(t('editCharacter.storyCount', { count: bio.length }), bio.length, BIO_MAX)}
          </ComposerSection>

          {/* Tagline: a slogan line, not a short bio (#1628). */}
          <ComposerSection rule={false}>
            <textarea
              data-composer-field
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={TAGLINE_MAX}
              {...namedField(t('character.taglinePlaceholder'))}
              rows={2}
              style={fieldBox}
            />
            {counter(
              t('editCharacter.taglineCount', { count: tagline.length }),
              tagline.length,
              TAGLINE_MAX,
            )}
          </ComposerSection>

          {/* Airport code; only the placeholder says so (#2793), nothing
              validates it. Deliberately uncapped width: a 280 cap clipped the
              placeholder (#2990); `LOCATION_FIELD_MIN_WIDTH` is a floor. */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={LOCATION_CODE_LENGTH}
              {...namedField(t('character.locationPlaceholder'))}
              style={fieldBox}
            />
          </ComposerSection>

          {/* Picker owns the hidden input (#1149); `hasCurrentPortrait` reads
              "nothing chosen" as keeping the saved one. */}
          <ComposerSection rule={false} label={t('character.portrait')} labelStyle={labelStyle}>
            <PortraitPicker
              inputRef={fileRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
              hasCurrentPortrait={Boolean(character.avatar_url)}
              error={avatarError}
              buttonStyle={composerLabelStyle({
                cursor: 'pointer',
                borderRadius: 10,
                padding: 'var(--space-sm) var(--space-lg)',
                background: FIELD,
                color: INK,
                border: `1px solid ${EDGE}`,
              })}
              statusStyle={{ color: FAINT }}
              errorStyle={{ color: ALARM }}
            />
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)', color: FAINT, margin: 'var(--space-md) 0 0', lineHeight: 1.5 }}>
              {t('editCharacter.avatarHint', { initial: (displayName.trim()[0] || character.username[0] || '?').toUpperCase() })}
            </p>
          </ComposerSection>

          <ErrorBanner message={error} style={{ color: ALARM }} />

          {/* The form's one rule (#1707), right above the footer. */}
          <ComposerRule style={{ background: HAIR }} />

          {/* [Cancel] … [Save] (#646); inline button, not band (#1828). */}
          <ComposerFooter
            start={
              <button
                type="button"
                onClick={() => navigate(`/characters/${id}`)}
                style={composerLabelStyle({
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: FAINT,
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
                /* `.control-off`, not an opacity fade (#2486). */
                className="control-off"
                style={{ ...primaryStyle, cursor: saving ? 'wait' : 'pointer' }}
              >
                {saving ? t('editCharacter.saveBusy') : t('editCharacter.saveIdle')}
              </button>
            }
          />

          {/* The tail, below Save (#2991). This hairline is the tail's own,
              marking where the form stops, not a second #1707 rule. */}
          <ComposerRule style={{ background: HAIR }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
            <FactionRow
              slug={character.faction_slug}
              labelStyle={slotLabel}
              rowStyle={slotRow}
              chevronStyle={slotQuiet}
              promptStyle={slotQuiet}
              picker={state.faction}
            />
            <DeleteCharacter
              slug={character.faction_slug}
              deleting={deleting}
              onDelete={handleDelete}
              buttonStyle={{ borderRadius: 10 }}
              promptStyle={slotQuiet}
              cancelStyle={slotCancel}
            />
          </div>
        </ComposerSheet>
      </form>

      {/* Locked square (#514). */}
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

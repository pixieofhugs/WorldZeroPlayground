/**
 * UA edit-character archetype (#2537): `UaCreateCharacter`'s dress, derived (owner
 * ruling), plus location, handle readout and the two `../editCharacterSlots`.
 *
 * The slots sit in a tail OFF the leaf, below Save — and for UA that is forced:
 * the slot's translucent `--color-bg-surface-alt` over the washed leaf puts its
 * `--color-text-secondary` at 4.15:1 in dark; on the page ground it reads
 * 5.58–7.31. So the slots' `ponytail:` re-measure note does not fire here.
 * Measured in `__tests__/editCharacterTailContrast.test.ts`.
 *
 * No masthead; quiet tier `-card-body` and alarm `-card-alarm` for the reasons
 * `UaCreateCharacter` records. Placeholder-only fields via `namedField()` (#2793);
 * no orphan label element (#2834); focus takes the shared ring (#2266). State is
 * `useEditCharacter`'s.
 */
import { useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionRoleVars } from '../../../utils/factionRoles'
import { factionBodyVars } from '../../../utils/factionBodyFace'
import CredentialCard from '../../../components/CredentialCard'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import { mediaUrl } from '../../../utils/media'
import PortraitPicker from '../PortraitPicker'
import { DeleteCharacter, FactionRow } from '../editCharacterSlots'
import { LOCATION_CODE_LENGTH, namedField } from '../characterFields'
import type { EditCharacterState } from '../useEditCharacter'
import { TAGLINE_MAX } from '../useCreateCharacter'
import {
  ComposerFooter,
  ComposerGround,
  ComposerPage,
  ComposerRule,
  ComposerSection,
  ComposerSheet,
  ErrorBanner,
  composerBandStyle,
  composerLabelStyle,
  useComposerSizes,
} from '../../editPraxis/archetypes/shared'
import { Lotus } from '../../../components/factionMarks'
import { UaSigil } from '../../../components/sigil/UaSigil'
import { UA_DISPLAY, UA_TEXT } from '../../../components/factionMarks/uaAtoms'

const SLUG = 'ua'

const SHEET = 'var(--leaf-edit-character-paper)'
const FIELD = 'var(--faction-ua-panel)'
const INK = 'var(--leaf-edit-character-ink)'
/* Not `-card-muted`: see UaCreateCharacter. */
const BODY = 'var(--faction-ua-card-body)'
const ACCENT = 'var(--leaf-edit-character-accent)'
const RULE = 'var(--faction-ua-rule)'
const HAIR = 'var(--faction-ua-hair)'
const FILL = 'var(--leaf-edit-character-fill)'
const ON_FILL = 'var(--leaf-edit-character-on-fill)'
const ALARM = 'var(--faction-ua-card-alarm)'

/**
 * Tail plate edge (#3009): the slots' neutral plate misses 1.4.11's 3:1 on this
 * ground; no fill clears it, so only the edge moves (5.38:1 worst). Fill stays FIELD.
 */
const TAIL_EDGE = 'var(--faction-ua-card-accent)'

const RADIUS = 7
const BORDER_WIDTH = 2

const GROUND_SPIN = '200s'

/**
 * Edit caps, not create's (22/160 would truncate existing names).
 *
 * ponytail: literals repeated per kit; hoist beside `TAGLINE_MAX` once the fan-out lands.
 */
const NAME_MAX = 50
const BIO_MAX = 500

/** Counters alarm on the last tenth, as na. */
const WARN_AT = 0.9

export default function UaEditCharacter({ state }: { state: EditCharacterState }) {
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

  /* na's three guards, in this kit's ink. */
  const quietLine = { fontFamily: UA_TEXT, color: BODY, padding: 'var(--space-2xl) 0' }
  if (loading) return <div style={quietLine}>{t('common:loading')}</div>
  if (!character) return <div style={quietLine}>{t('editCharacter.notFound')}</div>
  if (!isOwner) return <div style={quietLine}>{t('editCharacter.notOwner')}</div>

  const initial = (displayName.trim()[0] || character.username[0] || '?').toUpperCase()
  // Fresh crop shows before Save (#985).
  const portraitSrc = avatarPreview ?? (character.avatar_url ? mediaUrl(character.avatar_url) : null)

  /* Ornament px (§4a), the composer's own pair. */
  const groundGeometry = sizes.isMobile
    ? { lotus: 300, lotusLeft: -122, lotusTop: -94, enso: 208, ensoRight: -66, ensoBottom: -58 }
    : { lotus: 420, lotusLeft: -170, lotusTop: -130, enso: 300, ensoRight: -96, ensoBottom: -84 }

  const labelStyle = { fontFamily: UA_TEXT, color: BODY }

  const fieldBox = {
    width: '100%',
    background: FIELD,
    color: INK,
    border: `1px solid ${RULE}`,
    borderRadius: RADIUS,
    padding: 'var(--space-md)',
    boxSizing: 'border-box',
    fontFamily: UA_TEXT,
    fontSize: 'var(--text-content)',
  } as const

  const counter = (text: string, used: number, max: number) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        fontFamily: UA_TEXT,
        fontSize: 'var(--text-lg)',
        color: used >= max * WARN_AT ? ALARM : BODY,
      }}
    >
      {text}
    </div>
  )

  const sheetStyle = {
    background: SHEET,
    border: `${BORDER_WIDTH}px solid ${ACCENT}`,
    borderRadius: RADIUS,
  }

  const tailPlate: CSSProperties = {
    background: FIELD,
    border: `1px solid ${TAIL_EDGE}`,
    borderRadius: RADIUS,
  }

  /* No masthead: the ground is the identity. */
  const ground = (
    <ComposerGround inset={0} opacity="var(--faction-ua-card-lotus-opacity)">
      <Lotus
        size={groundGeometry.lotus}
        color="var(--faction-ua-card-lotus)"
        style={{ position: 'absolute', left: groundGeometry.lotusLeft, top: groundGeometry.lotusTop }}
      />
      {/* A class, so the reduced-motion guard governs it. */}
      <span
        className="ep-spin"
        style={
          {
            position: 'absolute',
            right: groundGeometry.ensoRight,
            bottom: groundGeometry.ensoBottom,
            '--ep-spin-dur': GROUND_SPIN,
          } as CSSProperties
        }
      >
        <UaSigil width={groundGeometry.enso} height={groundGeometry.enso} />
      </span>
    </ComposerGround>
  )

  return (
    <ComposerPage
      sizes={sizes}
      style={{
        /* Roles on the page root (#2659). */
        ...factionBodyVars("ua"), ...factionRoleVars(SLUG, 'leaf-edit-character'),
        fontFamily: UA_TEXT,
        color: INK,
      }}
    >
      {/* Real form so Enter submits; handleSubmit preventDefaults. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        <ComposerSheet sizes={sizes} style={sheetStyle} ground={ground}>
          <h1
            style={{
              fontFamily: UA_DISPLAY,
              fontWeight: 600,
              fontSize: sizes.titleSize,
              color: INK,
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {t('editCharacter.heading')}
          </h1>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <CredentialCard
              displayName={displayName || character.display_name}
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
              style={{ ...fieldBox, fontFamily: UA_DISPLAY, fontWeight: 600 }}
            />
            {counter(
              t('editCharacter.displayNameCount', { count: displayName.length }),
              displayName.length,
              NAME_MAX,
            )}
          </ComposerSection>

          {/* Permanent handle (ADR-0019). A real readOnly input: `aria-label` on a
              role-less div is ignored (#2793). */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              readOnly
              value={`@${character.username}`}
              {...namedField(t('character.handlePlaceholder'))}
              style={{ ...fieldBox, color: BODY }}
            />
            <p style={hintStyle}>{t('editCharacter.handleHint')}</p>
          </ComposerSection>

          <ComposerSection rule={false}>
            <textarea
              data-composer-field
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={BIO_MAX}
              {...namedField(t('character.bioPlaceholder'))}
              rows={4}
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.7 }}
            />
            {counter(t('editCharacter.storyCount', { count: bio.length }), bio.length, BIO_MAX)}
          </ComposerSection>

          {/* Tagline: a slogan, not a short bio (#1628). */}
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
              tagline.length,
              TAGLINE_MAX,
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
              style={fieldBox}
            />
          </ComposerSection>

          {/* Picker owns the hidden input (#1149); dressed because `.btn-outline`
              reads as a browser control on the leaf. */}
          <ComposerSection rule={false} label={t('character.portrait')} labelStyle={labelStyle}>
            <PortraitPicker
              inputRef={fileRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
              hasCurrentPortrait={Boolean(character.avatar_url)}
              error={avatarError}
              buttonStyle={composerLabelStyle({
                fontFamily: UA_TEXT,
                cursor: 'pointer',
                borderRadius: RADIUS,
                padding: 'var(--space-sm) var(--space-lg)',
                background: FIELD,
                color: INK,
                border: `1px solid ${RULE}`,
              })}
              statusStyle={{ fontFamily: UA_TEXT, color: BODY }}
              errorStyle={{ color: ALARM }}
            />
            <p style={hintStyle}>{t('editCharacter.avatarHint', { initial })}</p>
          </ComposerSection>

          <ErrorBanner message={error} style={{ color: ALARM }} />

          {/* One rule above the footer (#1707). */}
          <ComposerRule style={{ background: HAIR }} />

          {/* [Cancel] … [Save] (#646), full-bleed band (#1828). */}
          <ComposerFooter
            band
            start={
              <button
                type="button"
                onClick={() => navigate(`/characters/${id}`)}
                style={composerLabelStyle({
                  fontFamily: UA_TEXT,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: BODY,
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
                    fontFamily: UA_TEXT,
                    /* 600: EB Garamond loads 400/600 only (#1294). */
                    fontSize: 'var(--text-xl)',
                    fontWeight: 600,
                    frame: ACCENT,
                    color: ON_FILL,
                    background: FILL,
                  }),
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                {saving ? t('editCharacter.saveBusy') : t('editCharacter.saveIdle')}
              </button>
            }
          />
        </ComposerSheet>
      </form>

      {/* The tail: off the leaf, outside the form (see header). */}
      <div style={{ padding: `0 var(--space-lg) var(--space-3xl)` }}>
        {/* The leaf's column, so the tail lines up with the fields. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-xl)',
            maxWidth: sizes.maxWidth,
            margin: '0 auto',
            padding: `var(--space-2xl) ${sizes.padX} 0`,
          }}
        >
          <FactionRow slug={character.faction_slug} picker={state.faction} rowStyle={tailPlate} />
          <DeleteCharacter
            slug={character.faction_slug}
            deleting={deleting}
            onDelete={handleDelete}
            cancelStyle={tailPlate}
          />
        </div>
      </div>

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

const hintStyle: CSSProperties = {
  fontFamily: UA_TEXT,
  fontStyle: 'italic',
  fontSize: 'var(--text-content)',
  color: BODY,
  margin: 'var(--space-sm) 0 0',
  lineHeight: 1.55,
}

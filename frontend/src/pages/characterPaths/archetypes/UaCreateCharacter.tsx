/**
 * UA character-creation archetype — the vellum leaf (#2348). No design was drawn
 * (owner ruling): `UaTaskCard` supplies ground/inks/faces, `UaEditPraxis` the same
 * kit on a form. Mounts the composer chassis; no new mark (lotus + ensō only, §6).
 *
 * Head reserved (#2995), so the shipped `UaBand` mounts `inert` (no anchor inside
 * a form holding a draft). Ground: lotus off top-left, ensō off bottom-right,
 * clipped by `ComposerSheet` (#1028); the ensō spins via `.ep-spin` (a class, so
 * the reduced-motion guard applies, #1003).
 *
 * One responsive tree. Unlike the na phone skin, all fields show at both widths
 * (#2348 lists them unconditionally). All `--faction-ua-*` tokens; `-glow` is
 * ornament, never ink. Errors use `-card-alarm`: `--color-danger` is 3.71:1 here
 * (#1231). Contrast on the lotus composite: `__tests__/uaCreateCharacterContrast.test.ts`.
 *
 * State is `useCreateCharacter`'s; the faction picker stays visible so a player
 * can clear it (back to Default). Placeholder-only fields (#2793): `namedField()`
 * supplies the accessible name.
 */
import { useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionCssVar, factionName } from '../../../utils/factions'
import { factionRoleVars } from '../../../utils/factionRoles'
import { factionBodyVars } from '../../../utils/factionBodyFace'
import CredentialCard from '../../../components/CredentialCard'
import FactionSigil from '../../../components/sigil/FactionSigil'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import PortraitPicker from '../PortraitPicker'
import { namedField } from '../characterFields'
import {
  NAME_MAX,
  BIO_MAX,
  TAGLINE_MAX,
  type CreateCharacterState,
} from '../useCreateCharacter'
import {
  ComposerFooter,
  ComposerGround,
  ComposerHeading,
  ComposerPage,
  ComposerRule,
  ComposerSection,
  ComposerSheet,
  ErrorBanner,
  composerBandStyle,
  composerLabelStyle,
  useComposerSizes,
} from '../../editPraxis/archetypes/shared'
import { UaBand } from '../../../components/cardMasthead/factionBands'
import { Lotus } from '../../../components/factionMarks'
import { UaSigil } from '../../../components/sigil/UaSigil'
import { UA_DISPLAY, UA_TEXT } from '../../../components/factionMarks/uaAtoms'

const SLUG = 'ua'

const SHEET = 'var(--leaf-create-character-paper)'
const FIELD = 'var(--faction-ua-panel)'
const INK = 'var(--leaf-create-character-ink)'
/* Quiet tier is `-card-body`, not `-card-muted`: on the lotus-washed composite
 * muted reads 4.38 / 3.79 (under AA); body reads 5.74 / 6.78 (#2348). */
const BODY = 'var(--faction-ua-card-body)'
const ACCENT = 'var(--leaf-create-character-accent)'
const RULE = 'var(--faction-ua-rule)'
const HAIR = 'var(--faction-ua-hair)' /* fainter than -rule */
const FILL = 'var(--leaf-create-character-fill)'
const ON_FILL = 'var(--leaf-create-character-on-fill)'
const ALARM = 'var(--faction-ua-card-alarm)'

const RADIUS = 7
const BORDER_WIDTH = 2

const GROUND_SPIN = '200s'

/** Picker sigil size, as every chooser (#2223). */
const PICKER_SIGIL = 18

export default function UaCreateCharacter({ state }: { state: CreateCharacterState }) {
  const { t } = useTranslation(['forms', 'common'])
  const navigate = useNavigate()
  const sizes = useComposerSizes()
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

  const counter = (used: number, max: number) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: UA_TEXT, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: used >= max ? ALARM : BODY }}>
        {t('createCharacter.charsLeft', { count: max - used })}
      </span>
    </div>
  )

  const sheetStyle = {
    background: SHEET,
    border: `${BORDER_WIDTH}px solid ${ACCENT}`,
    borderRadius: RADIUS,
  }

  /* Shipped band in the reserved head (#2995); see header. */
  const masthead = <UaBand inert />
  const ground = (
    <ComposerGround inset={0} opacity="var(--faction-ua-card-lotus-opacity)">
      <Lotus
        size={groundGeometry.lotus}
        color="var(--faction-ua-card-lotus)"
        style={{
          position: 'absolute',
          left: groundGeometry.lotusLeft,
          top: groundGeometry.lotusTop,
        }}
      />
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
        /* Roles under this surface's prefix (#2659); the root is the whole page. */
        ...factionBodyVars("ua"), ...factionRoleVars('ua', 'leaf-create-character'),
        fontFamily: UA_TEXT,
        color: INK,
      }}
    >
      {/* Real form so Enter submits; handleSubmit preventDefaults. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        <ComposerSheet
          sizes={sizes}
          style={sheetStyle}
          masthead={masthead}
          reserveHead
          ground={ground}
        >
          {/* No mark beside the heading: the ground's ensō is the faction mark. */}
          <ComposerHeading sizes={sizes}>
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
              {t('createCharacter.heading')}
            </h1>
          </ComposerHeading>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <CredentialCard
              displayName={displayName || t('createCharacter.previewFallbackName')}
              handle={handle}
              factionSlug={factionSlug || null}
              level={0}
              score={0}
              avatarUrl={avatarPreview}
              onAvatarClick={() => fileInputRef.current?.click()}
            />
          </div>

          <ComposerSection rule={false}>
            <input
              data-composer-field
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={NAME_MAX}
              {...namedField(t('character.namePlaceholder'))}
              autoFocus
              style={{ ...fieldBox, fontFamily: UA_DISPLAY, fontWeight: 600 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: UA_TEXT, fontSize: 'var(--text-lg)' }}>
              <span style={{ color: BODY }}>@{handle}</span>
              <span style={{ color: displayName.length >= NAME_MAX ? ALARM : BODY }}>
                {t('createCharacter.charsLeft', { count: NAME_MAX - displayName.length })}
              </span>
            </div>
          </ComposerSection>

          <ComposerSection rule={false}>
            <textarea
              data-composer-field
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={BIO_MAX}
              {...namedField(t('character.bioPlaceholder'))}
              rows={3}
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.7 }}
            />
            {counter(bio.length, BIO_MAX)}
          </ComposerSection>

          {/* Tagline: a slogan, not a short bio (#1628). */}
          <ComposerSection rule={false}>
            <textarea
              data-composer-field
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={TAGLINE_MAX}
              {...namedField(t('character.taglinePlaceholder'))}
              rows={2}
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.7 }}
            />
            {counter(tagline.length, TAGLINE_MAX)}
          </ComposerSection>

          {/* Picker owns the hidden input (#1149); dressed because `.btn-outline`
              reads as a browser control on the leaf. */}
          <ComposerSection
            rule={false}
            label={
              <>
                {t('character.portrait')}{' '}
                <span style={{ textTransform: 'none', letterSpacing: 0 }}>{t('createCharacter.optional')}</span>
              </>
            }
            labelStyle={labelStyle}
          >
            <PortraitPicker
              inputRef={fileInputRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
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
          </ComposerSection>

          {/* Only with invitations (ADR-0019); stays drawn so the pick can be cleared. */}
          {showPicker && (
            <ComposerSection
              rule={false}
              label={
                <>
                  {t('createCharacter.callingLabel')}{' '}
                  <span style={{ textTransform: 'none', letterSpacing: 0 }}>{t('createCharacter.callingOptional')}</span>
                </>
              }
              labelStyle={labelStyle}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {invited.map((slug) => {
                  const selected = factionSlug === slug
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => setFactionSlug(selected ? '' : slug)}
                      /* Not `composerLabelStyle`: its uppercase would reach the name. */
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        width: '100%',
                        cursor: 'pointer',
                        textAlign: 'left',
                        borderRadius: RADIUS,
                        padding: 'var(--space-md) var(--space-lg)',
                        background: selected ? FILL : FIELD,
                        border: `1px solid ${selected ? FILL : RULE}`,
                        // Faction hue as a ring, never ink (§3).
                        boxShadow: selected ? `0 0 0 2px ${factionCssVar(slug)}` : 'none',
                      }}
                    >
                      {/* Selected sits on this kit's FILL, so the mark takes ON_FILL (#2852). */}
                      <FactionSigil slug={slug} size={PICKER_SIGIL} color={selected ? ON_FILL : undefined} />
                      <span
                        style={{
                          fontFamily: factionCssVar(slug, 'card-font'),
                          fontSize: 'var(--text-content)',
                          color: selected ? ON_FILL : INK,
                        }}
                      >
                        {factionName(slug)}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p
                style={{
                  fontFamily: UA_TEXT,
                  fontStyle: 'italic',
                  fontSize: 'var(--text-content)',
                  color: BODY,
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                {t('createCharacter.callingHint')}
              </p>
            </ComposerSection>
          )}

          <ErrorBanner message={error ?? ''} style={{ color: ALARM }} />

          {/* One rule above the footer (#1707). */}
          <ComposerRule style={{ background: HAIR }} />

          {/* [Cancel] … [Create] (#646), cast as a full-bleed band (#1828). */}
          <ComposerFooter
            band
            start={
              <>
                <button
                  type="button"
                  onClick={() => navigate('/')}
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
                <span style={{ fontFamily: UA_TEXT, fontSize: 'var(--text-content)', color: BODY }}>
                  {t('createCharacter.startsAt')}
                </span>
              </>
            }
            end={
              <button
                type="submit"
                disabled={!canSubmit}
                className="control-off"
                style={{
                  ...composerBandStyle(sizes, {
                    fontFamily: UA_TEXT,
                    /* 600, not 500: EB Garamond loads 400/600 only, and 500
                       resolves down to 400 (#1294). */
                    fontSize: 'var(--text-xl)',
                    fontWeight: 600,
                    frame: ACCENT,
                    color: ON_FILL,
                    background: FILL,
                  }),
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {submitting ? t('createCharacter.submitBusy') : t('createCharacter.submitIdle')}
              </button>
            }
          />
        </ComposerSheet>
      </form>

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

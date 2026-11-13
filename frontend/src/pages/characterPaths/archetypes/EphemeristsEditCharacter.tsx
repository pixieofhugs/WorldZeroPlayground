/**
 * Ephemerists character edit: the valley plate for an existing life (#2537).
 * Derived, not designed: `EphemeristsCreateCharacter`'s dress over the edit
 * fields. Nothing new is minted.
 *
 * vs create: no calling picker; adds location, handle, and the
 * `FactionRow` / `DeleteCharacter` slots from `../editCharacterSlots` (mounted,
 * never re-drawn; `na` links go through `factionDetailHref`).
 *
 * The tail is a SECOND plate below Save, outside the `<form>`. Not bare page:
 * the backdrop dispatches on the VIEWER's faction, this page on the edited
 * character's, so only a plate this file paints can be measured. Its inks are
 * rows in `utils/__tests__/factionContrast.test.ts` (the slot's `ponytail:`).
 *
 * Plate tokens via the cascade (#2141); `-brass` is a rule colour, never ink;
 * never mix with the codex `--eph-*` (ADR-0055). No global `--color-text-*`
 * (`local/no-global-ink-on-faction-surface`; 2.01:1 here in light).
 * Placeholder-only via `namedField()` (#2793). `useEditCharacter` owns state.
 */
import { useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { mediaUrl } from '../../../utils/media'
import CredentialCard from '../../../components/CredentialCard'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import PortraitPicker from '../PortraitPicker'
import { DeleteCharacter, FactionRow } from '../editCharacterSlots'
import { LOCATION_FIELD_MIN_WIDTH, LOCATION_CODE_LENGTH, namedField } from '../characterFields'
import type { EditCharacterState } from '../useEditCharacter'
import { TAGLINE_MAX } from '../useCreateCharacter'
import {
  ComposerFooter,
  ComposerGround,
  ComposerMasthead,
  ComposerPage,
  ComposerRule,
  ComposerSection,
  ComposerSheet,
  ErrorBanner,
  composerBandStyle,
  composerLabelStyle,
  useComposerSizes,
} from '../../editPraxis/archetypes/shared'
import {
  BAND_INK,
  BRASS,
  BRASS_LIGHT,
  CAPS,
  CAPTION,
  Cornice,
  DECO,
  DISC,
  GravityField,
  INK,
  INNER,
  LINE,
  OCHRE,
  Octagon,
  PLATE,
  QUIET,
  READING,
  SHADOW,
  Sign,
} from '../../../components/factionMarks/ephemeristsPlate'
import { EphemeristsMasthead } from '../../../components/factionMarks/EphemeristsMasthead'
import { factionBodyVars } from '../../../utils/factionBodyFace'

const SLUG = 'ephemerists'

/* Same as `EphemeristsCreateCharacter`. */
const CTA_INK = 'var(--faction-ephemerists-plate-cta-ink)'
const ALARM = 'var(--faction-ephemerists-card-alarm)'

/**
 * Tail plate edge (#3009): the slots' neutral edge misses WCAG 1.4.11's 3:1 on
 * the plate and no fill clears it, so only the edge moves: `-card-accent`, 5.09:1.
 * Measured in `ephemeristsEditCharacterContrast.test.ts`.
 */
const TAIL_EDGE = 'var(--faction-ephemerists-card-accent)'

/* Edit caps, not create's (22/160); see `DefaultEditCharacter`. */
const NAME_MAX = 50
const BIO_MAX = 500

/* Ornament geometry (WORLD_ZERO_STYLE §4a: not layout spacing) */
const EPH_BAND = { desktop: 84, mobile: 68 }
const GRAVITY_WIDTH = { desktop: 720, mobile: 360 }
const GRAVITY_HEIGHT = 2400
const MARGIN_RULE = { desktop: 22, mobile: 13 }
/** Stepped octagon on a 100-unit viewBox. */
const STATUS_MARK = 44
const STATUS_SIGN = 24
const SUBMIT_SIGN = 17

/** The create twin's ankh mark (see there). */
function StatusMark() {
  return (
    <span style={{ position: 'relative', display: 'block', width: STATUS_MARK, height: STATUS_MARK, flexShrink: 0 }}>
      <svg
        width={STATUS_MARK}
        height={STATUS_MARK}
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0 }}
      >
        <Octagon inset={0} stroke={BRASS} width={3.4} fill={DISC} />
      </svg>
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Sign name="ankh" size={STATUS_SIGN} color={BRASS} weight={1.6} />
      </span>
    </span>
  )
}

export default function EphemeristsEditCharacter({ state }: { state: EditCharacterState }) {
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

  const label = { fontFamily: CAPS, fontWeight: 500, letterSpacing: '0.24em' }
  const sectionLabel = { ...label, color: CAPTION }
  const fieldBox = {
    width: '100%',
    background: INNER,
    color: INK,
    border: `1.5px solid ${LINE}`,
    borderRadius: 0,
    padding: 'var(--space-md)',
    boxSizing: 'border-box',
    fontFamily: READING,
    fontSize: 'var(--text-content)',
  } as const

  const counter = (text: string, alarmed: boolean) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: READING, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: alarmed ? ALARM : QUIET }}>{text}</span>
    </div>
  )

  const sheetStyle = {
    background: PLATE,
    border: `1.5px solid ${LINE}`,
    borderRadius: 0,
    boxShadow: SHADOW,
  }

  const tailPlate: CSSProperties = {
    background: INNER,
    border: `1.5px solid ${TAIL_EDGE}`,
    borderRadius: 0,
  }

  if (loading) return <div className="py-8 font-body text-muted">{t('common:loading')}</div>
  if (!character) return <div className="py-8 font-body text-muted">{t('editCharacter.notFound')}</div>
  if (!isOwner) return <div className="py-8 font-body text-muted">{t('editCharacter.notOwner')}</div>

  const initial = (displayName.trim()[0] || character.username[0] || '?').toUpperCase()
  // A fresh crop shows before Save (#985).
  const portraitSrc = avatarPreview ?? (character.avatar_url ? mediaUrl(character.avatar_url) : null)

  const masthead = (
    <>
      <ComposerMasthead
        height={EPH_BAND[factor]}
        background={`linear-gradient(180deg, color-mix(in srgb, var(--faction-ephemerists-plate-band) 82%, ${BRASS_LIGHT}) 0%, var(--faction-ephemerists-plate-band) 100%)`}
        style={{
          // `height` is only a floor; the masthead sizes itself.
          height: 'auto',
          minHeight: EPH_BAND[factor],
          overflow: 'hidden',
          color: BAND_INK,
        }}
      >
        {/* Seeded per record, like every other mount. */}
        <EphemeristsMasthead slug={SLUG} scale={sizes.isMobile ? 'card' : 'page'} seed={`character:${character.id}`} />
      </ComposerMasthead>
      {/* The one motion, `.eph-cornice-glow`, gated in CSS. */}
      <Cornice glow />
    </>
  )

  const ground = (
    <ComposerGround inset={0} style={{ overflow: 'hidden' }}>
      <GravityField width={GRAVITY_WIDTH[factor]} height={GRAVITY_HEIGHT} />
      {/* Margin rule, outside the content inset. */}
      <span
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: MARGIN_RULE[factor],
          width: 1,
          background: OCHRE,
          opacity: 0.5,
        }}
      />
    </ComposerGround>
  )

  return (
    <ComposerPage
      sizes={sizes}
      style={{ ...factionBodyVars("ephemerists"), fontFamily: DECO, color: INK, ['--label-ink' as string]: QUIET } as CSSProperties}
    >
      {/* Real `<form>` so Enter commits; `handleSubmit` prevents default. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} ground={ground}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
            <StatusMark />
            <h1 style={{ fontFamily: CAPS, fontSize: sizes.titleSize, color: INK, lineHeight: 1.2, margin: 0 }}>
              {t('editCharacter.heading')}
            </h1>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <CredentialCard
              displayName={displayName || character.username}
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
              maxLength={NAME_MAX}
              {...namedField(t('character.namePlaceholder'))}
              style={{ ...fieldBox, fontFamily: CAPS }}
            />
            {counter(
              t('editCharacter.displayNameCount', { count: displayName.length }),
              displayName.length >= NAME_MAX,
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
              style={{ ...fieldBox, color: QUIET }}
            />
            <p style={{ fontFamily: READING, fontSize: 'var(--text-lg)', color: QUIET, margin: 0 }}>
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
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.85 }}
            />
            {counter(t('editCharacter.storyCount', { count: bio.length }), bio.length >= BIO_MAX)}
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
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.85 }}
            />
            {counter(t('editCharacter.taglineCount', { count: tagline.length }), tagline.length >= TAGLINE_MAX)}
          </ComposerSection>

          {/* Airport code; only the placeholder says so (#2793). */}
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

          {/* Picker owns the hidden input (#1149); `hasCurrentPortrait` reads
              "nothing chosen" as keeping the saved one. */}
          <ComposerSection rule={false} label={t('character.portrait')} labelStyle={sectionLabel}>
            <PortraitPicker
              inputRef={fileInputRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
              hasCurrentPortrait={Boolean(character.avatar_url)}
              error={avatarError}
              buttonStyle={composerLabelStyle({
                ...label,
                cursor: 'pointer',
                borderRadius: 0,
                padding: 'var(--space-sm) var(--space-lg)',
                background: INNER,
                color: INK,
                border: `1.5px solid ${BRASS}`,
              })}
              statusStyle={{ fontFamily: READING, color: QUIET }}
              errorStyle={{ color: ALARM }}
            />
            <p style={{ fontFamily: READING, fontSize: 'var(--text-content)', color: QUIET, margin: 0, lineHeight: 1.55 }}>
              {t('editCharacter.avatarHint', { initial })}
            </p>
          </ComposerSection>

          <ErrorBanner message={error ?? ''} style={{ color: ALARM }} />

          {/* The one rule (#1707), right above the footer. */}
          <ComposerRule style={{ background: BRASS, opacity: 0.5 }} />

          {/* [Cancel] … [Save] (#646). */}
          <ComposerFooter
            band
            start={
              <button
                type="button"
                onClick={() => navigate(`/characters/${id}`)}
                style={composerLabelStyle({
                  ...label,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: QUIET,
                  textDecoration: 'underline',
                })}
              >
                {t('common:actions.cancel')}
              </button>
            }
            end={
              /* No notation band here: pages wear it in the header (#2367). */
              <button
                type="submit"
                disabled={!canSubmit}
                /* `.eph-cta` paints ground + ink (#2146); `.control-off` is later
                   and `!important`, so disabled wins. */
                className="eph-cta control-off"
                style={{
                  ...composerBandStyle(sizes, {
                    // Design: 12 (--text-lg) / 500 / 0.24em.
                    fontFamily: CAPS,
                    fontWeight: 500,
                    letterSpacing: '0.24em',
                    frame: LINE,
                  }),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-sm)',
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                {saving ? t('editCharacter.saveBusy') : t('editCharacter.saveIdle')}
                <Sign name="openEye" size={SUBMIT_SIGN} color={CTA_INK} weight={1.4} />
              </button>
            }
          />
        </ComposerSheet>
      </form>

      {/* The tail plate (see the header). `paddingTop: 0` so the two plates
          read as one column. */}
      <ComposerSheet
        sizes={sizes}
        style={sheetStyle}
        pageStyle={{ paddingTop: 0 }}
        contentStyle={{ gap: 'var(--space-xl)' }}
      >
        <FactionRow slug={character.faction_slug} picker={state.faction} rowStyle={tailPlate} />
        <DeleteCharacter
          slug={character.faction_slug}
          deleting={deleting}
          onDelete={handleDelete}
          cancelStyle={tailPlate}
        />
      </ComposerSheet>

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

/**
 * Cozy Coven editing a life (#2537): `CovenCreateCharacter`'s dress over the edit
 * fields, on the same chassis and `covenSlip` marks. Nothing new is drawn.
 *
 * vs create: no calling picker or `startsAt`; adds `location`, the read-only
 * handle, and the `FactionRow` / `DeleteCharacter` slots from `../editCharacterSlots`
 * (mounted, never re-drawn; `na` links go through `factionDetailHref`).
 *
 * The slots sit BELOW the sheet, outside the `<form>`, behind a hairline
 * (`DefaultEditCharacter`'s placement). On the washed sheet their neutral ink
 * measures 4.06:1 in dark (fail); on `--color-bg-page` it passes, and
 * `-card-alarm` there is 7.57 / 9.80. Pinned in
 * `__tests__/covenEditCharacterContrast.test.ts`.
 *
 * Caps are the edit page's (50 / 500), not create's 22 / 160.
 * ponytail: edit caps restated per archetype (useEditCharacter doesn't export
 * them); ceiling seven copies, lift beside `TAGLINE_MAX` in one pass.
 *
 * No autofocus: an edit has no obvious first field. Placeholder-only fields via
 * `namedField()` (#2793), swept by `editCharacterDispatch.test.tsx`.
 * `useEditCharacter` owns all state.
 */
import { useRef, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import CredentialCard from '../../../components/CredentialCard'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import PortraitPicker from '../PortraitPicker'
import { LOCATION_FIELD_MIN_WIDTH, LOCATION_CODE_LENGTH, namedField } from '../characterFields'
import { DeleteCharacter, FactionRow } from '../editCharacterSlots'
import type { EditCharacterState } from '../useEditCharacter'
import { TAGLINE_MAX } from '../useCreateCharacter'
import {
  ComposerFooter,
  ComposerGround,
  ComposerMasthead,
  ComposerPage,
  ComposerSection,
  ComposerSheet,
  ErrorBanner,
  composerBandStyle,
  composerLabelStyle,
  useComposerSizes,
} from '../../editPraxis/archetypes/shared'
import {
  BORDER,
  Braid,
  CARD,
  CHROME,
  CTA_FROM,
  CTA_INK,
  CTA_TO,
  CovenCat,
  DEEP,
  DISPLAY,
  GOLD,
  INK,
  LABEL,
  PAGE,
  PINK,
  SHADOW,
  Spark,
} from '../../../components/factionMarks/covenSlip'
import { CovenSigil } from '../../../components/sigil/CovenSigil'
import { factionBodyVars } from '../../../utils/factionBodyFace'

const SLUG = 'coven'

/* Tokens `covenSlip` does not export (see the create slip). */
const LAV = 'var(--faction-coven-slip-lav)'
const ALARM = 'var(--faction-coven-card-alarm)'
const HAZE = 'var(--faction-coven-ward-haze)'
const CTA_BAND = `linear-gradient(180deg, ${CTA_FROM}, ${CTA_TO})`

/**
 * Tail plate edge (#3009): the slots' neutral edge is ~1.5:1 on the page, under
 * WCAG 1.4.11's 3:1. No fill clears 3:1, so only the edge changes: `-accent-ink`,
 * 4.82:1 worst case. Measured in `covenEditCharacterContrast.test.ts`.
 */
const TAIL_FILL = 'var(--faction-coven-card-bg)'
const TAIL_EDGE = 'var(--faction-coven-accent-ink)'

const RADIUS = 14
const FIELD_RADIUS = 10
const RULE = `1.5px solid ${BORDER}`

/* Edit caps; see the header. */
const EDIT_NAME_MAX = 50
const EDIT_BIO_MAX = 500

/* Ornament geometry (WORLD_ZERO_STYLE §4a: not layout spacing) */
const BADGE = 30
const MAST_SPARK = 11
const CAST_SPARK = 12
const CAT = { desktop: 320, mobile: 240 }
const CAT_INSET = 16
const CAT_OPACITY = 0.09

export default function CovenEditCharacter({ state }: { state: EditCharacterState }) {
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

  // Undressed until there is a character to dress for.
  if (loading) return <div className="py-8 font-body text-muted">{t('common:loading')}</div>
  if (!character) return <div className="py-8 font-body text-muted">{t('editCharacter.notFound')}</div>
  if (!isOwner) return <div className="py-8 font-body text-muted">{t('editCharacter.notOwner')}</div>

  const sectionLabel: CSSProperties = { fontFamily: CHROME, color: LABEL }
  /* `ComposerSheet`'s viewport inset, so the tail lines up with the sheet.
     ponytail: restated since the sheet keeps it private; add `pageInset` to
     `ComposerSizes` when a second surface needs it. */
  const pageInset = sizes.isMobile ? 'var(--space-md)' : 'var(--space-lg)'
  const fieldBox = {
    width: '100%',
    background: PAGE,
    color: INK,
    border: RULE,
    borderRadius: FIELD_RADIUS,
    padding: 'var(--space-md)',
    boxSizing: 'border-box',
    fontFamily: CHROME,
    fontSize: 'var(--text-content)',
  } as const

  const counter = (text: ReactNode, atCap: boolean) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: CHROME, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: atCap ? ALARM : LABEL }}>{text}</span>
    </div>
  )

  const sheetStyle = {
    background: CARD,
    border: `1.5px solid ${GOLD}`,
    borderRadius: RADIUS,
    boxShadow: SHADOW,
  }

  const tailPlate: CSSProperties = {
    background: TAIL_FILL,
    border: `1px solid ${TAIL_EDGE}`,
    borderRadius: FIELD_RADIUS,
  }

  // A fresh crop shows before Save (#985).
  const portraitSrc = avatarPreview ?? (character.avatar_url ? mediaUrl(character.avatar_url) : null)

  const masthead = (
    /* No `background`: the haze shows through, one sheet not a strip. */
    <ComposerMasthead
      style={{
        height: 'auto',
        padding: 'var(--space-lg) var(--space-lg) var(--space-md)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-sm)',
        }}
      >
        {/* Sparks in the row, not absolutely behind it (#1983). */}
        <Spark size={MAST_SPARK} color={GOLD} />
        <CovenSigil size={BADGE} color={DEEP} />
        <span
          style={{
            fontFamily: DISPLAY,
            fontSize: sizes.titleSize,
            lineHeight: 1,
            letterSpacing: '0.02em',
            color: INK,
            // The lower case is the lettering, not the word (#1910).
            textTransform: 'lowercase',
          }}
        >
          {factionName(SLUG)}
        </span>
        <Spark size={MAST_SPARK} color={GOLD} />
      </div>
      <Braid style={{ marginTop: 'var(--space-sm)' }} />
    </ComposerMasthead>
  )

  const ground = (
    <>
      {/* At the haze token's strength: the contrast tests measure exactly
          this. */}
      <ComposerGround
        inset={0}
        opacity={HAZE}
        background={`radial-gradient(62% 48% at 12% 0%, ${PINK}, transparent 70%), radial-gradient(58% 46% at 100% 100%, ${LAV}, transparent 72%)`}
      />
      {/* Own layer so it keeps its own opacity (#2041). */}
      <ComposerGround inset={0}>
        <CovenCat
          size={CAT[factor]}
          style={{ right: CAT_INSET, bottom: CAT_INSET, opacity: CAT_OPACITY }}
        />
      </ComposerGround>
    </>
  )

  return (
    <ComposerPage sizes={sizes} style={{ ...factionBodyVars("coven"), fontFamily: CHROME, color: INK }}>
      {/* Real `<form>` so Enter commits; `handleSubmit` prevents default. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        <ComposerSheet
          sizes={sizes}
          style={sheetStyle}
          masthead={masthead}
          ground={ground}
          // The tail follows, so the 4xl bottom inset moves below it.
          pageStyle={{ paddingBottom: 'var(--space-xl)' }}
        >
          <h1
            style={{
              fontFamily: DISPLAY,
              fontWeight: 600,
              fontSize: sizes.titleSize,
              lineHeight: 1.1,
              color: INK,
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
              onAvatarClick={() => fileInputRef.current?.click()}
            />
          </div>

          {/* Handle is permanent (ADR-0019): a readout, not a field. */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={EDIT_NAME_MAX}
              {...namedField(t('character.namePlaceholder'))}
              style={{ ...fieldBox, fontFamily: DISPLAY, fontSize: 'var(--text-title)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: CHROME, fontSize: 'var(--text-lg)' }}>
              <span style={{ color: LABEL }}>@{character.username}</span>
              <span style={{ color: displayName.length >= EDIT_NAME_MAX ? ALARM : LABEL }}>
                {t('editCharacter.displayNameCount', { count: displayName.length })}
              </span>
            </div>
          </ComposerSection>

          <ComposerSection rule={false}>
            <textarea
              data-composer-field
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={EDIT_BIO_MAX}
              {...namedField(t('character.bioPlaceholder'))}
              rows={3}
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.7 }}
            />
            {counter(
              t('editCharacter.storyCount', { count: bio.length }),
              bio.length >= EDIT_BIO_MAX,
            )}
          </ComposerSection>

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
            {counter(
              t('editCharacter.taglineCount', { count: tagline.length }),
              tagline.length >= TAGLINE_MAX,
            )}
          </ComposerSection>

          {/* Airport code; only the placeholder says so (#2793). */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={LOCATION_CODE_LENGTH}
              {...namedField(t('character.locationPlaceholder'))}
              style={{ ...fieldBox, maxWidth: LOCATION_FIELD_MIN_WIDTH }}
            />
          </ComposerSection>

          {/* Picker owns the hidden input (#1149); `hasCurrentPortrait` reads
              "nothing chosen" as keeping the current one. */}
          <ComposerSection
            rule={false}
            label={t('character.portrait')}
            labelStyle={sectionLabel}
          >
            <PortraitPicker
              inputRef={fileInputRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
              hasCurrentPortrait={Boolean(character.avatar_url)}
              error={avatarError}
              buttonStyle={composerLabelStyle({
                fontFamily: CHROME,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: FIELD_RADIUS,
                padding: 'var(--space-sm) var(--space-lg)',
                background: PAGE,
                color: INK,
                border: RULE,
              })}
              statusStyle={{ fontFamily: CHROME, color: LABEL }}
              errorStyle={{ color: ALARM }}
            />
          </ComposerSection>

          <ErrorBanner message={error} style={{ color: ALARM }} />

          {/* The one braid (#1707), right above the footer. */}
          <Braid />

          {/* [Cancel] … [Save] (#646); stacked, the cast is a band. */}
          <ComposerFooter
            band
            start={
              <button
                type="button"
                onClick={() => navigate(`/characters/${id}`)}
                style={composerLabelStyle({
                  fontFamily: CHROME,
                  fontWeight: 700,
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
                    // Label face here, not title. Design: 14 / 700 / 0.12em.
                    fontFamily: CHROME,
                    fontSize: 'var(--text-xl)',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    frame: GOLD,
                    color: CTA_INK,
                    background: CTA_BAND,
                  }),
                  cursor: saving ? 'wait' : 'pointer',
                  // `.control-off`, not opacity: the band is a gradient (#2486).
                }}
              >
                <Spark size={CAST_SPARK} color={CTA_INK} />
                {saving ? t('editCharacter.saveBusy') : t('editCharacter.saveIdle')}
              </button>
            }
          />
        </ComposerSheet>
      </form>

      {/* The tail: outside the form and slip, on the page ground (see the
           header), so delete never reads at Save's weight. */}
      <div data-skin={SLUG} style={{ ...tailPage, paddingLeft: pageInset, paddingRight: pageInset }}>
        <div style={{ maxWidth: sizes.maxWidth, margin: '0 auto' }}>
          <div style={tail}>
            <FactionRow slug={character.faction_slug} picker={state.faction} rowStyle={tailPlate} />
            <DeleteCharacter
              slug={character.faction_slug}
              deleting={deleting}
              onDelete={handleDelete}
              cancelStyle={tailPlate}
            />
          </div>
        </div>
      </div>

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

/* Aligned to the slip's edge (`sizes.maxWidth` + `pageInset`). */
const tailPage: CSSProperties = {
  paddingBottom: 'var(--space-4xl)',
}
const tail: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-xl)',
  borderTop: '1px solid var(--color-border)',
  paddingTop: 'var(--space-xl)',
}

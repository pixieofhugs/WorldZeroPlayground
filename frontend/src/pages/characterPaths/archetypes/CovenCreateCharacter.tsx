/**
 * Cozy Coven — the spell slip a life is written onto (#2351).
 *
 * The register comes from `CovenTaskCard` (ground, inks, faces) and
 * `CovenEditPraxis` (the same kit on a form). Every mark comes from
 * `factionMarks/covenSlip` or `sigil/CovenSigil` (#2726): no private SVG copies
 * (#1209). The chassis is the composer's blocks; its controls take an
 * `EditPraxisState`, so fields here are plain inputs in the slip's `fieldBox`.
 * One responsive tree; fixed numbers are ornament only (SPEC-faction-ui-profile
 * §1a). Copy is existing `forms:createCharacter.*` keys; all fields show at both
 * widths, as #2351 lists them.
 *
 * The cat: bottom-right, fully inside (#2041), sized to the sheet's width (240
 * phone / 320 desktop). No busy-ground alternation: that law is for cards (#2396).
 *
 * Colour: the sheet is ward CARD and the commit the pink CTA (not the candle-gold
 * hold band). The wash runs at `--faction-coven-ward-haze`, not the composer's
 * hard 0.7, under which `-slip-label` misses AA. `-slip-soft` is not painted on
 * the sheet (misses in dark). Ratios: `covenCreateCharacterContrast.test.ts`.
 * Motion only via `.cvn-wheel` in `CovenCat`, behind `prefers-reduced-motion`.
 *
 * Presentation only; the picker stays visible so the pick can be cleared.
 * Placeholder-only fields (#2793): `namedField()` sets the matching `aria-label`.
 */
import { useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionCssVar, factionName } from '../../../utils/factions'
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

/* Tokens `covenSlip` does not export. */
const LAV = 'var(--faction-coven-slip-lav)'
/* `--color-danger` misses AA on the sheet in light; veil and edge stay neutral (ADR-0061). */
const ALARM = 'var(--faction-coven-card-alarm)'
/* The wash's strength, per theme (see header). */
const HAZE = 'var(--faction-coven-ward-haze)'
const CTA_BAND = `linear-gradient(180deg, ${CTA_FROM}, ${CTA_TO})`

const RADIUS = 14
const FIELD_RADIUS = 10
const RULE = `1.5px solid ${BORDER}`

/* Ornament geometry (WORLD_ZERO_STYLE §4a: not layout spacing). */
const BADGE = 30
const MAST_SPARK = 11
const CAST_SPARK = 12
/** The size every chooser draws (#2223). */
const PICKER_SIGIL = 18
const CAT = { desktop: 320, mobile: 240 }
/** The figures every page mount runs. */
const CAT_INSET = 16
const CAT_OPACITY = 0.09

export default function CovenCreateCharacter({ state }: { state: CreateCharacterState }) {
  const { t } = useTranslation(['forms', 'common'])
  const navigate = useNavigate()
  const sizes = useComposerSizes()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const factor = sizes.isMobile ? 'mobile' : 'desktop'
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

  const sectionLabel: CSSProperties = { fontFamily: CHROME, color: LABEL }
  /** The composer's field geometry, on the ward PAGE. */
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

  const counter = (used: number, max: number) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: CHROME, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: used >= max ? ALARM : LABEL }}>
        {t('createCharacter.charsLeft', { count: max - used })}
      </span>
    </div>
  )

  const sheetStyle = {
    background: CARD,
    border: `1.5px solid ${GOLD}`,
    borderRadius: RADIUS,
    boxShadow: SHADOW,
  }

  const masthead = (
    /* No `background`: the haze shows through, so the band reads as one sheet. */
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
        {/* Sparks sit IN the flex row, not behind it: a stretched twinkle field
            walks stars under the wordmark at narrow widths (#1983). */}
        <Spark size={MAST_SPARK} color={GOLD} />
        {/* No spin (#2726): the sigil has an up, so rotating it reads as broken. */}
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
      {/* The composer's two blooms, at the haze token's strength (see header). */}
      <ComposerGround
        inset={0}
        opacity={HAZE}
        background={`radial-gradient(62% 48% at 12% 0%, ${PINK}, transparent 70%), radial-gradient(58% 46% at 100% 100%, ${LAV}, transparent 72%)`}
      />
      {/* Own layer, so the cat keeps its own strength. */}
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
      {/* A real `<form>` so Enter commits; `handleSubmit` calls `preventDefault()`. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        {/* `reserveHead` (#2995): the page reskins live, so the masthead slot
            gets a floor to keep the picker from moving under the cursor. */}
        <ComposerSheet
          sizes={sizes}
          style={sheetStyle}
          masthead={masthead}
          reserveHead
          ground={ground}
        >
          {/* No second mark by the heading: the masthead is the one (#1828). */}
          <ComposerHeading sizes={sizes}>
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
              {t('createCharacter.heading')}
            </h1>
          </ComposerHeading>

          {/* Live preview; the card dispatches its own faction dress. */}
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

          {/* Chosen name */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={NAME_MAX}
              {...namedField(t('character.namePlaceholder'))}
              autoFocus
              style={{ ...fieldBox, fontFamily: DISPLAY, fontSize: 'var(--text-title)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: CHROME, fontSize: 'var(--text-lg)' }}>
              <span style={{ color: LABEL }}>@{handle}</span>
              <span style={{ color: displayName.length >= NAME_MAX ? ALARM : LABEL }}>
                {t('createCharacter.charsLeft', { count: NAME_MAX - displayName.length })}
              </span>
            </div>
          </ComposerSection>

          {/* About */}
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

          {/* Tagline — a slogan line, not a short bio (#1628). */}
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

          {/* Portrait (#1149); the credential card opens the same input via `fileInputRef`. */}
          <ComposerSection
            rule={false}
            label={
              <>
                {t('character.portrait')}{' '}
                <span style={{ textTransform: 'none', letterSpacing: 0 }}>{t('createCharacter.optional')}</span>
              </>
            }
            labelStyle={sectionLabel}
          >
            {/* Dressed like the slip's fields; the alarm ink is passed because
                the neutral danger red misses on a faction ground. */}
            <PortraitPicker
              inputRef={fileInputRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
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

          {/* Answer a calling — only with invitations (ADR-0019); stays drawn so
              the pick can be cleared. */}
          {showPicker && (
            <ComposerSection
              rule={false}
              label={
                <>
                  {t('createCharacter.callingLabel')}{' '}
                  <span style={{ textTransform: 'none', letterSpacing: 0 }}>{t('createCharacter.callingOptional')}</span>
                </>
              }
              labelStyle={sectionLabel}
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
                        borderRadius: FIELD_RADIUS,
                        padding: 'var(--space-md) var(--space-lg)',
                        background: selected ? CTA_BAND : PAGE,
                        border: selected ? `1.5px solid ${CTA_TO}` : RULE,
                        // Faction hue as a ring, never as ink (§3).
                        boxShadow: selected ? `0 0 0 2px ${factionCssVar(slug)}` : 'none',
                      }}
                    >
                      {/* (#2223) Selected, the ground is this kit's CTA_BAND, so
                          the mark takes its on-fill ink like the label (#2852). */}
                      <FactionSigil slug={slug} size={PICKER_SIGIL} color={selected ? CTA_INK : undefined} />
                      <span
                        style={{
                          fontFamily: factionCssVar(slug, 'card-font'),
                          fontSize: 'var(--text-content)',
                          color: selected ? CTA_INK : INK,
                        }}
                      >
                        {factionName(slug)}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p style={{ fontFamily: CHROME, fontSize: 'var(--text-content)', color: LABEL, margin: 0, lineHeight: 1.6 }}>
                {t('createCharacter.callingHint')}
              </p>
            </ComposerSection>
          )}

          <ErrorBanner message={error ?? ''} style={{ color: ALARM }} />

          {/* The one braid, above the footer only (#1707). */}
          <Braid />

          {/* [Cancel] … [Create] (#646), stacked: the cast is a full-bleed band. */}
          <ComposerFooter
            band
            start={
              <>
                <button
                  type="button"
                  onClick={() => navigate('/')}
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
                <span style={{ fontFamily: CHROME, fontSize: 'var(--text-content)', color: LABEL }}>
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
                    // Design band: 14 / 700 / 0.12em; 14 is --text-xl.
                    fontFamily: CHROME,
                    fontSize: 'var(--text-xl)',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    frame: GOLD,
                    color: CTA_INK,
                    background: CTA_BAND,
                  }),
                  cursor: submitting ? 'wait' : 'pointer',
                  // Disabled via `.control-off`, not opacity: a gradient can't be faded (#2486).
                }}
              >
                <Spark size={CAST_SPARK} color={CTA_INK} />
                {submitting ? t('createCharacter.submitBusy') : t('createCharacter.submitIdle')}
              </button>
            }
          />
        </ComposerSheet>
      </form>

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
    </ComposerPage>
  )
}

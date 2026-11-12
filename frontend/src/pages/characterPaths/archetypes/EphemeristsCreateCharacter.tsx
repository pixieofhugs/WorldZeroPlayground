/**
 * Ephemerists character creation: the valley plate for a new life (#2347). No new
 * design: `EphemeristsTaskCard`'s inks and `EphemeristsEditPraxis`'s form kit over
 * this page's fields, all marks from `components/factionMarks` (WORLD_ZERO_STYLE §6).
 * Composer chassis, plain inputs (the praxis controls need `EditPraxisState`).
 *
 * One responsive tree; fixed numbers are ornament only (SPEC-faction-ui-profile §1a).
 * Unlike na's old phone branch, all fields show at both widths (#2347).
 *
 * Colour is `--faction-ephemerists-plate-*` via the cascade (#2141); `-brass` is a
 * rule colour, never ink. Never mix with the codex `--eph-*` (ADR-0055). Errors use
 * `-card-alarm`: neutral danger misses AA here.
 *
 * `useCreateCharacter` owns state. The picker stays visible so a player can clear
 * it and be born `na`. Placeholder-only via `namedField()` (#2793).
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

/* Not exported by the plate module; same as `EphemeristsEditPraxis`. */
const CTA = 'var(--faction-ephemerists-plate-cta-bg)'
const CTA_INK = 'var(--faction-ephemerists-plate-cta-ink)'
const ALARM = 'var(--faction-ephemerists-card-alarm)'

/**
 * Notation-band seed. No record exists yet, so seed by surface; seeding off the
 * typed name would redraw the band per keystroke.
 */
const SEED = 'createCharacter'

/* Ornament geometry (WORLD_ZERO_STYLE §4a: not layout spacing) */
const EPH_BAND = { desktop: 84, mobile: 68 }
const GRAVITY_WIDTH = { desktop: 720, mobile: 360 }
const GRAVITY_HEIGHT = 2400
const MARGIN_RULE = { desktop: 22, mobile: 13 }
/** Stepped octagon on a 100-unit viewBox. */
const STATUS_MARK = 44
const STATUS_SIGN = 24
const SUBMIT_SIGN = 17
/** Every chooser's size (#2223). */
const PICKER_SIGIL = 18

/**
 * Ankh in a brass-bordered stepped octagon. `Octagon` draws clip and border at
 * once (a `clipPath` has no stroke); not `RingMark`, which is a circle.
 */
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

export default function EphemeristsCreateCharacter({ state }: { state: CreateCharacterState }) {
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

  const counter = (used: number, max: number) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: READING, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: used >= max ? ALARM : QUIET }}>
        {t('createCharacter.charsLeft', { count: max - used })}
      </span>
    </div>
  )

  const sheetStyle = {
    background: PLATE,
    border: `1.5px solid ${LINE}`,
    borderRadius: 0,
    boxShadow: SHADOW,
  }

  const masthead = (
    <>
      {/* Sky wash; both stops are plate tokens (#2141). */}
      <ComposerMasthead
        height={EPH_BAND[factor]}
        background={`linear-gradient(180deg, color-mix(in srgb, var(--faction-ephemerists-plate-band) 82%, ${BRASS_LIGHT}) 0%, var(--faction-ephemerists-plate-band) 100%)`}
        style={{
          // The masthead sizes itself; `height` here is only a floor.
          height: 'auto',
          minHeight: EPH_BAND[factor],
          overflow: 'hidden',
          color: BAND_INK,
        }}
      >
        <EphemeristsMasthead slug={SLUG} scale={sizes.isMobile ? 'card' : 'page'} seed={SEED} />
      </ComposerMasthead>
      {/* The one motion, `.eph-cornice-glow`, gated in `index.css`. */}
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
      {/* This kit sets the reserved-head ceiling (#2995, `useComposerSizes`). */}
      <ComposerSheet
        sizes={sizes}
        style={sheetStyle}
        masthead={masthead}
        reserveHead
        ground={ground}
      >
        <ComposerHeading sizes={sizes}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
            <StatusMark />
            <h1
              style={{
                fontFamily: CAPS,
                fontSize: sizes.titleSize,
                color: INK,
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              {t('createCharacter.heading')}
            </h1>
          </div>
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
            style={{ ...fieldBox, fontFamily: CAPS }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: READING, fontSize: 'var(--text-lg)' }}>
            <span style={{ color: QUIET }}>@{handle}</span>
            <span style={{ color: displayName.length >= NAME_MAX ? ALARM : QUIET }}>
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
            style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.85 }}
          />
          {counter(bio.length, BIO_MAX)}
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
          {counter(tagline.length, TAGLINE_MAX)}
        </ComposerSection>

        {/* Picker owns the hidden input (#1149); the card opens it too. */}
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
          {/* Dressed, not `.btn-outline`; neutral danger is 3.54:1 here. */}
          <PortraitPicker
            inputRef={fileInputRef}
            onChange={handleAvatarChange}
            chosenFile={avatarFile}
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
        </ComposerSection>

        {/* Only with invitations (ADR-0019); stays drawn so the pick can clear. */}
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
                    /* Not `composerLabelStyle`: its uppercase would leak in. */
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-md)',
                      width: '100%',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderRadius: 0,
                      padding: 'var(--space-md) var(--space-lg)',
                      background: selected ? CTA : INNER,
                      border: `1.5px solid ${selected ? BRASS : LINE}`,
                      // Faction hue as a ring, never ink (§3).
                      boxShadow: selected ? `0 0 0 2px ${factionCssVar(slug)}` : 'none',
                    }}
                  >
                    {/* On CTA when selected, so the mark takes CTA_INK (#2852). */}
                    <FactionSigil slug={slug} size={PICKER_SIGIL} color={selected ? CTA_INK : undefined} />
                    <span style={{ fontFamily: factionCssVar(slug, 'card-font'), fontSize: 'var(--text-content)', color: selected ? CTA_INK : INK }}>
                      {factionName(slug)}
                    </span>
                  </button>
                )
              })}
            </div>
            <p style={{ fontFamily: READING, fontSize: 'var(--text-content)', color: QUIET, margin: 0, lineHeight: 1.55 }}>
              {t('createCharacter.callingHint')}
            </p>
          </ComposerSection>
        )}

        <ErrorBanner message={error ?? ''} style={{ color: ALARM }} />

        {/* The one rule (#1707), right above the footer. */}
        <ComposerRule style={{ background: BRASS, opacity: 0.5 }} />

        {/* [Cancel] … [Create] (#646). */}
        <ComposerFooter
          band
          start={
            <>
              <button
                type="button"
                onClick={() => navigate('/')}
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
              <span style={{ fontFamily: READING, fontSize: 'var(--text-content)', color: QUIET }}>
                {t('createCharacter.startsAt')}
              </span>
            </>
          }
          end={
            <>
              {/* No notation band here: a page wears it in the header, a card
                  at the CTA (#2367). */}
              <button
                type="submit"
                disabled={!canSubmit}
                /* `.eph-cta` paints ground + ink (#2146); `.control-off` is later
                   and `!important`, so disabled wins (#2486). */
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
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {submitting ? t('createCharacter.submitBusy') : t('createCharacter.submitIdle')}
                <Sign name="openEye" size={SUBMIT_SIGN} color={CTA_INK} weight={1.4} />
              </button>
            </>
          }
        />
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

/**
 * Everymen character creation: the enlistment paper (#2352). No new design:
 * `EverymenTaskCard`'s register and `EverymenEditPraxis`'s form kit over this
 * page's fields; cogs from `factionMarks/everymenCogs`, rays from `.em-burst`
 * (WORLD_ZERO_STYLE §6; #2121, #2195). Composer chassis, plain inputs (the praxis
 * controls need `EditPraxisState`), with `data-composer-field` for the shared
 * focus ring (#2266).
 *
 * One responsive tree; fixed numbers are ornament only (SPEC-faction-ui-profile
 * §1a). The masthead word is the faction NAME (ADR-0057); `FILE YOUR REPORT`
 * copy stays deleted (#1187).
 *
 * Colour, as `EverymenEditPraxis`: on `--everymen-paper` `-sheet-accent` is only
 * 4.49:1, so red is a rule/fill/mark, never a label; plates are `-sheet-panel`,
 * where it was measured. `-composer-frame` (1.87:1, no text) is the SHEET's
 * poster frame; plates are ruled in `--everymen-frame`. Don't swap them.
 *
 * Quiet ink is `--everymen-quiet`, not `-muted`: under `.em-burst` muted drops to
 * 4.26 / 4.09:1; quiet clears (4.78 / 4.58) and aliases to muted in dark.
 * Measured in `everymenCreateCharacterContrast.test.ts`.
 *
 * Cog motion is by class (`ep-spin` / `ep-spin-rev`) behind the reduced-motion
 * guard (#1003); only `--ep-spin-dur` rides inline. `useCreateCharacter` owns
 * state; the picker stays visible so the pick can be cleared. Placeholder-only
 * via `namedField()` (#2793).
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
import { EverymenCog } from '../../../components/factionMarks/everymenCogs'
import { factionRoleVars } from '../../../utils/factionRoles'
import { factionBodyVars } from '../../../utils/factionBodyFace'

const SLUG = 'everymen'

/* Palette by role, same names as `EverymenEditPraxis`; see the header. */
const PAPER = 'var(--everymen-paper)'
const PANEL = 'var(--faction-everymen-sheet-panel)'
/** Flips with the paper; not `--everymen-ink`. */
const INK = 'var(--everymen-paper-text)'
const QUIET = 'var(--everymen-quiet)'
/** Rule or fill, never text on {@link PAPER}. */
const RED = 'var(--everymen-red)'
/** Not `--everymen-ink`, which vanishes in dark. */
const FRAME = 'var(--everymen-frame)'
const SHEET_FRAME = 'var(--faction-everymen-composer-frame)'
/** Theme-invariant. */
const MAST = 'var(--faction-everymen-bill-mast)'
const MAST_INK = 'var(--faction-everymen-bill-mast-ink)'
const BAR = 'var(--faction-everymen-bill-cta-bg)'
const BAR_INK = 'var(--faction-everymen-bill-cta-ink)'
const PAPER_DEEP = 'var(--everymen-paper-deep)'
const SHADOW = 'var(--faction-everymen-bill-shadow)'
/** #1449's alarm, measured on this paper. */
const ALARM = 'var(--faction-everymen-card-alarm)'

const BEBAS = 'var(--ev-path-face)' /* Bebas Neue */
const COURIER = 'var(--faction-everymen-body-font)' /* Courier Prime */

const COG_PERIOD = '22s'

/* Ornament geometry (WORLD_ZERO_STYLE §4a: not layout spacing) */
const MAST_COG = 16
const STAGE_COG = { desktop: 40, mobile: 32 }
/** Every chooser's size (#2223). */
const PICKER_SIGIL = 18

export default function EverymenCreateCharacter({ state }: { state: CreateCharacterState }) {
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

  /** Labels: 13px / 0.2em, this kit's own (#1828), rounded up to --text-xl. */
  const stencil = (overrides: CSSProperties = {}): CSSProperties =>
    composerLabelStyle({
      fontFamily: BEBAS,
      fontSize: 'var(--text-xl)',
      letterSpacing: '0.2em',
      ...overrides,
    })

  const sectionLabel = stencil({ color: INK })

  const fieldBox = {
    width: '100%',
    background: PANEL,
    color: INK,
    border: `2px solid ${FRAME}`,
    borderRadius: 0,
    padding: 'var(--space-md)',
    boxSizing: 'border-box',
    fontFamily: COURIER,
    fontSize: 'var(--text-content)',
  } as const

  const counter = (used: number, max: number) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: COURIER, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: used >= max ? ALARM : QUIET }}>
        {t('createCharacter.charsLeft', { count: max - used })}
      </span>
    </div>
  )

  const sheetStyle = {
    background: PAPER,
    border: `2px solid ${SHEET_FRAME}`,
    borderRadius: 0,
    boxShadow: SHADOW,
  }

  const masthead = (
    <ComposerMasthead
      background={MAST}
      style={{
        height: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-sm)',
        padding: sizes.isMobile
          ? 'var(--space-sm) var(--space-lg)'
          : 'var(--space-md) var(--space-lg)',
        borderBottom: `3px double ${BAR}`,
        boxShadow: `inset 0 -6px 0 -4px ${PAPER_DEEP}`,
      }}
    >
      <EverymenCog size={MAST_COG} fill={MAST_INK} hub={MAST} spin="forward" duration={COG_PERIOD} />
      <span
        style={{
          fontFamily: BEBAS,
          fontSize: 'var(--text-content)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          lineHeight: 1,
          color: MAST_INK,
        }}
      >
        {factionName(SLUG)}
      </span>
      <EverymenCog size={MAST_COG} fill={MAST_INK} hub={MAST} spin="reverse" duration={COG_PERIOD} />
    </ComposerMasthead>
  )

  /* The one ornament (#2195). Not a `ComposerGround`: `.em-burst` is already
     an inset-0, pointer-events-none layer. */
  const ground = <div aria-hidden className="em-burst" />

  /* The one rule (#1707), above the footer. */
  const dashRule = (
    <ComposerRule
      style={{ height: 0, background: 'transparent', borderTop: `2px dashed ${RED}` }}
    />
  )

  return (
    <ComposerPage
      sizes={sizes}
      style={{ ...factionBodyVars("everymen"), ...factionRoleVars('everymen', 'ev-path'), fontFamily: COURIER, color: INK }}
    >
      {/* Real `<form>` so Enter commits; `handleSubmit` prevents default. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        {/* `reserveHead` (#2995), numbers in `useComposerSizes`. */}
        <ComposerSheet
          sizes={sizes}
          style={sheetStyle}
          masthead={masthead}
          reserveHead
          ground={ground}
        >
          <ComposerHeading sizes={sizes}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
              <EverymenCog
                size={STAGE_COG[factor]}
                fill={RED}
                hub={PAPER}
                spin="forward"
                duration={COG_PERIOD}
              />
              <h1
                style={{
                  fontFamily: BEBAS,
                  fontSize: sizes.titleSize,
                  textTransform: 'uppercase',
                  letterSpacing: '0.01em',
                  lineHeight: 0.96,
                  color: INK,
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
              style={{ ...fieldBox, fontFamily: BEBAS, letterSpacing: '0.02em' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: COURIER, fontSize: 'var(--text-lg)' }}>
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
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.6 }}
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
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.6 }}
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
            <PortraitPicker
              inputRef={fileInputRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
              error={avatarError}
              buttonStyle={stencil({
                cursor: 'pointer',
                borderRadius: 0,
                padding: 'var(--space-sm) var(--space-lg)',
                background: PANEL,
                color: INK,
                border: `2px solid ${FRAME}`,
              })}
              statusStyle={{ fontFamily: COURIER, color: QUIET }}
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
                      aria-pressed={selected}
                      onClick={() => setFactionSlug(selected ? '' : slug)}
                      /* Not `stencil`: its uppercase would leak in. Active
                         state is this kit's CTA fill, never an accent block. */
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        width: '100%',
                        cursor: 'pointer',
                        textAlign: 'left',
                        borderRadius: 0,
                        padding: 'var(--space-md) var(--space-lg)',
                        background: selected ? BAR : PANEL,
                        border: `2px solid ${selected ? BAR : FRAME}`,
                        /* Faction hue as a 3px offset shadow, never ink. */
                        boxShadow: selected ? `3px 3px 0 ${factionCssVar(slug)}` : 'none',
                      }}
                    >
                      {/* On BAR when selected, so the mark takes BAR_INK (#2852). */}
                      <FactionSigil slug={slug} size={PICKER_SIGIL} color={selected ? BAR_INK : undefined} />
                      <span
                        style={{
                          fontFamily: factionCssVar(slug, 'card-font'),
                          fontSize: 'var(--text-content)',
                          color: selected ? BAR_INK : INK,
                        }}
                      >
                        {factionName(slug)}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p style={{ fontFamily: COURIER, fontSize: 'var(--text-content)', color: QUIET, margin: 0, lineHeight: 1.55 }}>
                {t('createCharacter.callingHint')}
              </p>
            </ComposerSection>
          )}

          <ErrorBanner message={error ?? ''} style={{ color: ALARM }} />

          {dashRule}

          {/* [Cancel] … [Create] (#646); the cast is a full-bleed bar. */}
          <ComposerFooter
            band
            start={
              <>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  style={stencil({
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: QUIET,
                    textDecoration: 'underline',
                  })}
                >
                  {t('common:actions.cancel')}
                </button>
                <span style={{ fontFamily: COURIER, fontSize: 'var(--text-content)', color: QUIET }}>
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
                    /* Design: 15 (--text-content) / 400 / 0.22em, Bebas. */
                    fontFamily: BEBAS,
                    fontSize: 'var(--text-content)',
                    letterSpacing: '0.22em',
                    /* The sheet's frame, not `--everymen-frame`. */
                    frame: SHEET_FRAME,
                    color: BAR_INK,
                    background: BAR,
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

/**
 * Singularity character creation: a life, compiled (#2353). No new design:
 * `SingularityTaskCard`'s chassis and `SingularityEditPraxis`'s form kit over this
 * page's fields; lamps from `factionMarks/SingularityLamps` (WORLD_ZERO_STYLE §6).
 * Composer chassis, plain inputs in this skin's readout box. One responsive tree;
 * fixed numbers are ornament only (SPEC-faction-ui-profile §1a).
 *
 * `character.new` and the `>` prompt are untranslated ornament, kept as module
 * constants so `i18next/no-literal-string` reads identifiers, inside `aria-hidden`.
 *
 * Colour is `--faction-singularity-term-*`; the chassis stays black and the
 * cascade flips the phosphor. `-term-dim` is a PANEL ink only: over the raster and
 * scan band it drops to 4.12 / 4.20 (under AA). The chassis carries only
 * `-term-ink` / `-term-bright`. Any element inked `-term-dim` must declare
 * `-term-panel` (or the bar's `-term-chrome`) as its own background; pinned in
 * `singularityCreateCharacterGround.test.ts`. Errors use `-card-alarm` (#1302).
 *
 * Motion: `.sg-scan` and `.sg-cursor` classes behind the reduced-motion guard
 * (#1003). No process light (no session yet). Fields keep the browser focus ring
 * (no `outline: none`). Placeholder-only via `namedField()` (#2793).
 * `useCreateCharacter` owns state; the picker stays visible so the pick can clear.
 */
import { useRef, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionName } from '../../../utils/factions'
import CredentialCard from '../../../components/CredentialCard'
import FactionSigil from '../../../components/sigil/FactionSigil'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import SingularityLamps from '../../../components/factionMarks/SingularityLamps'
import PortraitPicker from '../PortraitPicker'
import { namedField } from '../characterFields'
import { factionRoleVar, factionRoleVars } from '../../../utils/factionRoles'
import { factionBodyVars } from '../../../utils/factionBodyFace'
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

const SLUG = 'singularity'

/* The terminal's two-theme contract (#1023), named by role. */
const CHASSIS = 'var(--faction-singularity-term-bg)'
const CHROME = 'var(--faction-singularity-term-chrome)'
const PANEL = 'var(--faction-singularity-term-panel)'
const INK = 'var(--faction-singularity-term-ink)'
const BRIGHT = 'var(--faction-singularity-term-bright)'
/** PANEL only on this surface; see the header. */
const DIM = 'var(--faction-singularity-term-dim)'
const BORDER = 'var(--faction-singularity-term-border)'
const HAIR = 'var(--faction-singularity-term-hair)'
const SCAN = 'var(--faction-singularity-term-scan)'
const SWEEP = 'var(--faction-singularity-term-sweep)'
const CTA_BG = 'var(--faction-singularity-term-cta-bg)'
const CTA_INK = 'var(--faction-singularity-term-cta-ink)'
const CTA_GLOW = 'var(--faction-singularity-term-cta-glow)'
const HALO_GREEN = 'var(--faction-singularity-term-halo-green)'
const SHADOW = 'var(--faction-singularity-term-shadow)'
const ALARM = 'var(--faction-singularity-card-alarm)'

/* Share Tech Mono, the whole surface's one face, via the role map (§4). */
const FACE = 'var(--sg-path-face)'

const RADIUS = 2
/** Ornament (§4a). */
const SWEEP_HEIGHT = 38
/** Every chooser's size (#2223). */
const PICKER_SIGIL = 18

/* Ornament, not copy; see the header. */
const PROC_NAME = 'character.new'
const PROMPT = '>'

function chassisLabel(overrides: CSSProperties = {}): CSSProperties {
  return composerLabelStyle({ fontFamily: FACE, color: INK, ...overrides })
}

export default function SingularityCreateCharacter({ state }: { state: CreateCharacterState }) {
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

  const boxStyle: CSSProperties = {
    background: PANEL,
    border: `1px solid ${BORDER}`,
    borderRadius: RADIUS,
    // Keeps the foot strip inside the frame's corners.
    overflow: 'hidden',
  }

  /* Borderless inside the box. No `outline: none`: see the header. */
  const inputStyle: CSSProperties = {
    display: 'block',
    width: '100%',
    background: 'transparent',
    color: INK,
    border: 'none',
    padding: 'var(--space-md)',
    boxSizing: 'border-box',
    fontFamily: FACE,
    fontSize: 'var(--text-content)',
  }

  /** The only home of `-term-dim`: it declares PANEL as its own ground (header). */
  const foot = (used: number, max: number, lead?: ReactNode) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 'var(--space-md)',
        background: PANEL,
        color: DIM,
        borderTop: `1px dashed ${HAIR}`,
        padding: 'var(--space-xs) var(--space-md)',
        fontFamily: FACE,
        fontSize: 'var(--text-lg)',
      }}
    >
      <span>{lead}</span>
      <span style={used >= max ? { color: ALARM } : undefined}>
        {t('createCharacter.charsLeft', { count: max - used })}
      </span>
    </div>
  )

  const masthead = (
    /* The window bar; all aria-hidden chrome. */
    <ComposerMasthead
      background={CHROME}
      style={{
        height: 'auto',
        padding: 'var(--space-sm) var(--space-lg)',
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <div aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <SingularityLamps />
        <span
          style={composerLabelStyle({
            fontFamily: FACE,
            // No-op paint so the dim-ink rule is checkable.
            background: CHROME,
            color: DIM,
            letterSpacing: '0.1em',
            textTransform: 'none',
            marginLeft: 'var(--space-sm)',
          })}
        >
          {PROC_NAME}
        </span>
      </div>
    </ComposerMasthead>
  )

  const ground = (
    /* Fixed raster; the band overhangs so its soft ends never show. */
    <ComposerGround
      inset={0}
      background={`repeating-linear-gradient(0deg, ${SCAN} 0 1px, transparent 1px 3px)`}
    >
      <div
        aria-hidden
        className="sg-scan"
        style={{
          position: 'absolute',
          left: '-30%',
          right: '-30%',
          height: SWEEP_HEIGHT,
          background: SWEEP,
        }}
      />
    </ComposerGround>
  )

  const sheetStyle: CSSProperties = {
    background: CHASSIS,
    border: `1px solid ${BORDER}`,
    borderRadius: RADIUS,
    boxShadow: SHADOW,
  }

  return (
    <ComposerPage sizes={sizes} style={{ ...factionBodyVars("singularity"), ...factionRoleVars('singularity', 'sg-path'), fontFamily: FACE, color: INK }}>
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
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-md)' }}>
              <span
                aria-hidden
                style={{ fontFamily: FACE, fontSize: sizes.titleSize, color: BRIGHT, lineHeight: 1 }}
              >
                {PROMPT}
              </span>
              <h1
                style={{
                  fontFamily: FACE,
                  fontSize: sizes.titleSize,
                  color: BRIGHT,
                  textShadow: HALO_GREEN,
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
            <div style={boxStyle}>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={NAME_MAX}
                {...namedField(t('character.namePlaceholder'))}
                autoFocus
                style={inputStyle}
              />
              {foot(displayName.length, NAME_MAX, `@${handle}`)}
            </div>
          </ComposerSection>

          <ComposerSection rule={false}>
            <div style={boxStyle}>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={BIO_MAX}
                {...namedField(t('character.bioPlaceholder'))}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }}
              />
              {foot(bio.length, BIO_MAX)}
            </div>
          </ComposerSection>

          {/* Tagline: a slogan line, not a short bio (#1628). */}
          <ComposerSection rule={false}>
            <div style={boxStyle}>
              <textarea
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                maxLength={TAGLINE_MAX}
                {...namedField(t('character.taglinePlaceholder'))}
                rows={2}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }}
              />
              {foot(tagline.length, TAGLINE_MAX)}
            </div>
          </ComposerSection>

          {/* Picker owns the hidden input (#1149). Neutral danger is ~3.5:1
              here, hence ALARM. */}
          <ComposerSection
            rule={false}
            label={
              <>
                {t('character.portrait')}{' '}
                <span style={{ textTransform: 'none', letterSpacing: 0 }}>
                  {t('createCharacter.optional')}
                </span>
              </>
            }
            labelStyle={{ fontFamily: FACE, color: INK }}
          >
            <PortraitPicker
              inputRef={fileInputRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
              error={avatarError}
              buttonStyle={chassisLabel({
                cursor: 'pointer',
                borderRadius: RADIUS,
                padding: 'var(--space-sm) var(--space-lg)',
                background: PANEL,
                color: BRIGHT,
                border: `1px solid ${BORDER}`,
              })}
              statusStyle={{ fontFamily: FACE, color: INK }}
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
                  <span style={{ textTransform: 'none', letterSpacing: 0 }}>
                    {t('createCharacter.callingOptional')}
                  </span>
                </>
              }
              labelStyle={{ fontFamily: FACE, color: INK }}
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
                      /* Not the label tier: its uppercase would leak in. Picked
                         = the lit key, as in the composer's mode picker. */
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        width: '100%',
                        cursor: 'pointer',
                        textAlign: 'left',
                        borderRadius: RADIUS,
                        padding: 'var(--space-md) var(--space-lg)',
                        background: selected ? CTA_BG : PANEL,
                        border: `1px solid ${selected ? CTA_BG : BORDER}`,
                        boxShadow: selected ? CTA_GLOW : undefined,
                      }}
                    >
                      {/* On CTA_BG when selected, so the mark takes CTA_INK (#2852). */}
                      <FactionSigil slug={slug} size={PICKER_SIGIL} color={selected ? CTA_INK : undefined} />
                      <span
                        style={{
                          // The offered faction's own face, by role (#2675).
                          fontFamily: factionRoleVar(slug, 'face'),
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
              <p
                style={{
                  fontFamily: FACE,
                  fontSize: 'var(--text-content)',
                  color: INK,
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                {t('createCharacter.callingHint')}
              </p>
            </ComposerSection>
          )}

          <ErrorBanner message={error ?? ''} style={{ color: ALARM }} />

          {/* The one rule (#1707), right above the footer. */}
          <ComposerRule style={{ height: 0, background: 'none', borderTop: `1px dashed ${HAIR}` }} />

          {/* [Cancel] … [Create] (#646); full-bleed band (#1828). */}
          <ComposerFooter
            band
            start={
              <>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  style={chassisLabel({
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  })}
                >
                  {t('common:actions.cancel')}
                </button>
                <span style={{ fontFamily: FACE, fontSize: 'var(--text-content)', color: INK }}>
                  {t('createCharacter.startsAt')}
                </span>
              </>
            }
            end={
              <button
                type="submit"
                disabled={!canSubmit}
                /* The app's one disabled override (#2486): the chassis is black
                   in light too, so the house neutral would be a pale slab.
                   `.sg-control-off` only re-points its vars. */
                className="control-off sg-control-off"
                style={{
                  ...composerBandStyle(sizes, {
                    /* Design 13, rounded up to outrank the label (§4a). */
                    fontFamily: FACE,
                    fontSize: 'var(--text-xl)',
                    letterSpacing: '0.1em',
                    frame: BORDER,
                    color: CTA_INK,
                    background: CTA_BG,
                    /* `none` in light, real in dark. */
                    boxShadow: CTA_GLOW,
                  }),
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {submitting ? t('createCharacter.submitBusy') : t('createCharacter.submitIdle')}
                {/* Block cursor; stays drawn when motion is reduced. */}
                <span
                  aria-hidden
                  className="sg-cursor"
                  style={{
                    display: 'inline-block',
                    width: '0.55em',
                    height: '1em',
                    marginLeft: 'var(--space-sm)',
                    verticalAlign: '-0.12em',
                    background: 'currentColor',
                  }}
                />
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

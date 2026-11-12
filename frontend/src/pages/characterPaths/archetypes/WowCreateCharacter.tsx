/**
 * WOW character creation — THE CHARTER (#2350). No design drawn (owner ruling):
 * `WowTaskCard` (decree) supplies ground/inks/faces, `WowEditPraxis` (writ) the
 * same kit on a form. Writ chassis + decree head: ribbon, pennants, gilt frame,
 * one wavy rule, balloons. No knightly copy (ADR-0065 §3). All fields at both
 * widths, unlike the na phone skin (#2350).
 *
 * Load-bearing (§3): GOLD (2.24:1 on cream) never sets text — ON_GOLD does; the
 * quiet ink is cream-only (4.77 there, 4.25 on the plate). The balloons are a flex
 * sibling, never behind type (#2032), so every ground is opaque. Pairings live in
 * `utils/__tests__/factionContrast.test.ts`; disabled state is `.control-off` (#2486).
 *
 * State is `useCreateCharacter`'s; the picker stays visible so the pick can be
 * cleared. Placeholder-only fields via `namedField()` (#2793).
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
import { BalloonBunch, Bunting, Zig } from '../../../components/factionMarks/wowOrnament'
import { WowSpark } from '../../../components/factionMarks/wowMobile'
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
  ComposerSection,
  ComposerSheet,
  ErrorBanner,
  composerBandStyle,
  composerLabelStyle,
  useComposerSizes,
} from '../../editPraxis/archetypes/shared'

const SLUG = 'wow'

/** MedievalSharp. Core roles via `factionRoleVars` on the page root (#2674); the
 * non-role names below are this surface's own extras. */
const MED = 'var(--wow-create-face)'
/** Lora — body and label. */
const LORA = 'var(--faction-wow-body-font)'

const SHEET = 'var(--wow-create-paper)'
/** The inset plate every field sits on. */
const FIELD = 'var(--faction-wow-chronicle-panel)'
const INK = 'var(--wow-create-ink)'
/** Quiet ink — CREAM ONLY (4.25:1 on the plate). */
const MUTED = 'var(--wow-create-quiet)'
/** Label ink, measured on both grounds. */
const LABEL = 'var(--faction-wow-accent-deep)'
const PLUM_FILL = 'var(--faction-wow-plum-surface)'
const ON_PLUM = 'var(--faction-wow-on-plum)'
/** Never an ink. */
const GOLD = 'var(--faction-wow-chronicle-gold)'
/** Gilt at 40%. */
const RULE = 'var(--faction-wow-rule)'
const ON_GOLD = 'var(--faction-wow-on-gold)'
const RIBBON = 'var(--faction-wow-quest-ribbon)'
const SHEET_SHADOW = 'var(--faction-wow-detail-shadow)'
/* `--color-danger` is 4.08:1 on the cream; #1449's alarm rung instead. */
const ALARM = 'var(--faction-wow-card-alarm)'

/* Ornament geometry (§4a). */
const BUNCH = { desktop: 38, mobile: 30 }
/** Picker sigil size, as every chooser (#2223). */
const PICKER_SIGIL = 18
const RADIUS = 6

export default function WowCreateCharacter({ state }: { state: CreateCharacterState }) {
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

  const counter = (used: number, max: number) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: LORA, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: used >= max ? ALARM : MUTED }}>
        {t('createCharacter.charsLeft', { count: max - used })}
      </span>
    </div>
  )

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

  return (
    <ComposerPage
      sizes={sizes}
      style={{ ...factionBodyVars("wow"), ...factionRoleVars('wow', 'wow-create'), fontFamily: LORA, color: INK }}
    >
      {/* Real form so Enter submits; handleSubmit preventDefaults. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        {/* `reserveHead` (#2995); numbers in `useComposerSizes`. */}
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} reserveHead>
          {/* Wrapping hero row. It sets the chassis' heading floor (see
              `useComposerSizes`); the floor goes on the box around it, since a
              `min-height` on a wrapping flex row spreads its lines. */}
          <ComposerHeading sizes={sizes}>
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
                {t('createCharacter.heading')}
              </h1>
              <Zig id="charter" style={{ flex: 1, minWidth: 0 }} />
              <BalloonBunch size={BUNCH[factor]} />
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
              style={{ ...fieldBox, fontFamily: MED }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: LORA, fontSize: 'var(--text-lg)' }}>
              <span style={{ color: MUTED }}>@{handle}</span>
              <span style={{ color: displayName.length >= NAME_MAX ? ALARM : MUTED }}>
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

          {/* Picker owns the hidden input (#1149). */}
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
            {/* Dressed: `.btn-outline` reads as a browser control on parchment. */}
            <PortraitPicker
              inputRef={fileInputRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
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
                      /* Not `composerLabelStyle` (its uppercase would reach the
                         name). Solid gilt only on the picked one (#1830). */
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        width: '100%',
                        cursor: 'pointer',
                        textAlign: 'left',
                        borderRadius: RADIUS,
                        padding: 'var(--space-md) var(--space-lg)',
                        background: selected ? PLUM_FILL : FIELD,
                        border: `1.5px solid ${selected ? GOLD : RULE}`,
                        // Faction hue as a ring, never ink (§3).
                        boxShadow: selected ? `0 0 0 2px ${factionCssVar(slug)}` : 'none',
                      }}
                    >
                      {/* Selected sits on PLUM_FILL, so the mark takes ON_PLUM (#2852). */}
                      <FactionSigil slug={slug} size={PICKER_SIGIL} color={selected ? ON_PLUM : undefined} />
                      <span
                        style={{
                          fontFamily: factionCssVar(slug, 'card-font'),
                          fontSize: 'var(--text-content)',
                          color: selected ? ON_PLUM : INK,
                        }}
                      >
                        {factionName(slug)}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p style={{ fontFamily: LORA, fontStyle: 'italic', fontSize: 'var(--text-content)', color: MUTED, margin: 0, lineHeight: 1.55 }}>
                {t('createCharacter.callingHint')}
              </p>
            </ComposerSection>
          )}

          <ErrorBanner message={error ?? ''} style={{ color: ALARM }} />

          {/* One zigzag above the footer (#1707). */}
          <Zig id="footer" />

          {/* [Cancel] … [Create] (#646), full-bleed band (#1828). */}
          <ComposerFooter
            band
            start={
              <>
                <button
                  type="button"
                  onClick={() => navigate('/')}
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
                <span style={{ fontFamily: LORA, fontStyle: 'italic', fontSize: 'var(--text-content)', color: MUTED }}>
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
                    /* Display face, matching the writ's band. */
                    fontFamily: MED,
                    fontSize: 'var(--text-content)',
                    letterSpacing: '0.14em',
                    frame: GOLD,
                    color: ON_GOLD,
                    background: GOLD,
                  }),
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {submitting ? t('createCharacter.submitBusy') : t('createCharacter.submitIdle')}
                <WowSpark color={ON_GOLD} />
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

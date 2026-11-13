/**
 * Singularity character edit: a life, recompiled (#2537). Derived, not designed:
 * `SingularityCreateCharacter`'s dress on the edit form. Read that header first;
 * its register, motion and `-term-dim` rules apply here unrestated.
 *
 * vs create: no calling picker; handle (hint in the foot) and location take the
 * readout box; `FactionRow` / `DeleteCharacter` are mounted from
 * `../editCharacterSlots`, never re-drawn.
 *
 * The slots sit in a SECOND PANE below the sheet, outside the `<form>`. A pane,
 * because `--faction-singularity-card-alarm` (#fca5a5, both themes) is 1.73:1 on
 * the app page but 9.4:1 on `-term-panel`. A ground dark enough for it breaks the
 * slot's neutral tiers, so the pane repoints the `--color-*` seam on its own root
 * (`SLOT_INK`, as `SingularityFeedFrame` does). `--color-danger` / `-on-danger`
 * are not repointed (ADR-0061). Guarded by `singularityEditCharacterTail.test.tsx`.
 *
 * Copy is the edit page's; na-only keys (`eyebrow`, `avatarHint`) are refused.
 * Caps are the edit form's. Unlike create, fields take `data-composer-field`
 * (#2266), as `editCharacterDispatch` requires. `useEditCharacter` owns state.
 */
import { useRef, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { mediaUrl } from '../../../utils/media'
import CredentialCard from '../../../components/CredentialCard'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import SingularityLamps from '../../../components/factionMarks/SingularityLamps'
import PortraitPicker from '../PortraitPicker'
import { DeleteCharacter, FactionRow } from '../editCharacterSlots'
import { LOCATION_CODE_LENGTH, namedField } from '../characterFields'
import { factionRoleVars } from '../../../utils/factionRoles'
import { factionBodyVars } from '../../../utils/factionBodyFace'
import { TAGLINE_MAX } from '../useCreateCharacter'
import type { EditCharacterState } from '../useEditCharacter'
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

const SLUG = 'singularity'

/* Identical to the create plate's palette. */
const CHASSIS = 'var(--faction-singularity-term-bg)'
const CHROME = 'var(--faction-singularity-term-chrome)'
const PANEL = 'var(--faction-singularity-term-panel)'
const INK = 'var(--faction-singularity-term-ink)'
const BRIGHT = 'var(--faction-singularity-term-bright)'
/** PANEL only; see the create plate. */
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
/**
 * Tail plate edge (#3009): `-term-border` is ~1.6:1 here, under WCAG 1.4.11's 3:1.
 * `-accent-ink` is 3.07:1, the thinnest margin; the tail test guards it.
 */
const TAIL_EDGE = 'var(--faction-singularity-accent-ink)'

/* Own prefix, not create's `sg-path`: prefixes are never shared (#2659). */
const FACE = 'var(--sg-edit-path-face)'

const RADIUS = 2
/** Ornament (§4a). */
const SWEEP_HEIGHT = 38

/* Ornament, not copy (see the create plate). */
const PROC_NAME = 'character.edit'
const PROMPT = '>'

/* Edit caps, not create's 22/160: tighter caps would truncate a saved bio on
   first edit. */
const NAME_CAP = 50
const BIO_CAP = 500

/**
 * The slots' seam repoint on the tail pane (see the header). Every pairing is
 * measured in `singularityCreateCharacterGround.test.ts`. No danger tokens.
 */
const SLOT_INK = {
  '--color-text-primary': BRIGHT,
  '--color-text-secondary': INK,
  '--color-text-tertiary': DIM,
  '--color-bg-surface-alt': CHASSIS,
  '--color-bg-surface': CHASSIS,
  '--color-border-strong': TAIL_EDGE,
} as CSSProperties

function chassisLabel(overrides: CSSProperties = {}): CSSProperties {
  return composerLabelStyle({ fontFamily: FACE, color: INK, ...overrides })
}

export default function SingularityEditCharacter({ state }: { state: EditCharacterState }) {
  const { t } = useTranslation(['forms', 'common'])
  const navigate = useNavigate()
  const sizes = useComposerSizes()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    id,
    character,
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

  /* No sheet yet, so app chrome. */
  if (state.loading) return <div className="py-8 font-body text-muted">{t('common:loading')}</div>
  if (!character) return <div className="py-8 font-body text-muted">{t('editCharacter.notFound')}</div>
  if (!state.isOwner) return <div className="py-8 font-body text-muted">{t('editCharacter.notOwner')}</div>

  // A fresh crop shows before Save (#985).
  const portraitSrc = avatarPreview ?? (character.avatar_url ? mediaUrl(character.avatar_url) : null)

  const boxStyle: CSSProperties = {
    background: PANEL,
    border: `1px solid ${BORDER}`,
    borderRadius: RADIUS,
    // Keeps the foot strip inside the frame's corners.
    overflow: 'hidden',
  }

  /* Borderless inside the box; no `outline: none` (see the header). */
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

  /** The only home of `-term-dim`: it declares PANEL as its own ground. */
  const foot = (lead: ReactNode, count?: ReactNode, atCap = false) => (
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
      <span style={atCap ? { color: ALARM } : undefined}>{count}</span>
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
    <ComposerPage
      sizes={sizes}
      style={{ ...factionBodyVars("singularity"), ...factionRoleVars(SLUG, 'sg-edit-path'), fontFamily: FACE, color: INK }}
    >
      {/* Real `<form>` so Enter commits; `handleSubmit` prevents default. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} ground={ground}>
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
            <div style={boxStyle}>
              <input
                data-composer-field
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={NAME_CAP}
                {...namedField(t('character.namePlaceholder'))}
                style={inputStyle}
              />
              {foot(
                null,
                t('editCharacter.displayNameCount', { count: displayName.length }),
                displayName.length >= NAME_CAP,
              )}
            </div>
          </ComposerSection>

          {/* Handle is permanent (ADR-0019). A `readOnly` input, not a div: a
              role-less div ignores `aria-label`. */}
          <ComposerSection rule={false}>
            <div style={boxStyle}>
              <input
                data-composer-field
                readOnly
                value={`@${character.username}`}
                {...namedField(t('character.handlePlaceholder'))}
                style={inputStyle}
              />
              {foot(t('editCharacter.handleHint'))}
            </div>
          </ComposerSection>

          <ComposerSection rule={false}>
            <div style={boxStyle}>
              <textarea
                data-composer-field
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={BIO_CAP}
                {...namedField(t('character.bioPlaceholder'))}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }}
              />
              {foot(
                null,
                t('editCharacter.storyCount', { count: bio.length }),
                bio.length >= BIO_CAP,
              )}
            </div>
          </ComposerSection>

          <ComposerSection rule={false}>
            <div style={boxStyle}>
              <textarea
                data-composer-field
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                maxLength={TAGLINE_MAX}
                {...namedField(t('character.taglinePlaceholder'))}
                rows={2}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }}
              />
              {foot(
                null,
                t('editCharacter.taglineCount', { count: tagline.length }),
                tagline.length >= TAGLINE_MAX,
              )}
            </div>
          </ComposerSection>

          {/* Airport code; only the placeholder says so (#2793). */}
          <ComposerSection rule={false}>
            <div style={boxStyle}>
              <input
                data-composer-field
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={LOCATION_CODE_LENGTH}
                {...namedField(t('character.locationPlaceholder'))}
                style={inputStyle}
              />
            </div>
          </ComposerSection>

          {/* Picker owns the hidden input (#1149); `hasCurrentPortrait` reads
              "nothing chosen" as keeping the saved one. */}
          <ComposerSection
            rule={false}
            label={t('character.portrait')}
            labelStyle={{ fontFamily: FACE, color: INK }}
          >
            <PortraitPicker
              inputRef={fileInputRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
              hasCurrentPortrait={Boolean(character.avatar_url)}
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

          <ErrorBanner message={error} style={{ color: ALARM }} />

          {/* The one rule (#1707), right above the footer. */}
          <ComposerRule style={{ height: 0, background: 'none', borderTop: `1px dashed ${HAIR}` }} />

          {/* [Cancel] … [Save] (#646); full-bleed band (#1828). */}
          <ComposerFooter
            band
            start={
              <button
                type="button"
                onClick={() => navigate(`/characters/${id}`)}
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
            }
            end={
              <button
                type="submit"
                disabled={!canSubmit}
                /* The app's one disabled override (#2486); see the create plate. */
                className="control-off sg-control-off"
                style={{
                  ...composerBandStyle(sizes, {
                    fontFamily: FACE,
                    fontSize: 'var(--text-xl)',
                    letterSpacing: '0.1em',
                    frame: BORDER,
                    color: CTA_INK,
                    background: CTA_BG,
                    boxShadow: CTA_GLOW,
                  }),
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                {saving ? t('editCharacter.saveBusy') : t('editCharacter.saveIdle')}
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

      {/* The tail pane (see the header). */}
      <ComposerSheet
        sizes={sizes}
        // The sheet above already spent the gap.
        pageStyle={{ paddingTop: 0 }}
        style={{
          ...SLOT_INK,
          background: PANEL,
          border: `1px solid ${BORDER}`,
          borderRadius: RADIUS,
        }}
      >
        <FactionRow slug={character.faction_slug} picker={state.faction} />
        <DeleteCharacter slug={character.faction_slug} deleting={deleting} onDelete={handleDelete} />
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

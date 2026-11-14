/**
 * Everymen character edit: the same bill, amended (#2537). Derived from
 * `EverymenCreateCharacter` alone; its tokens, faces, geometry, colour rules,
 * copy and motion all carry over (see that header). Only the fields differ.
 *
 * vs create: no calling picker or `startsAt`; adds handle, location, and the
 * `FactionRow` / `DeleteCharacter` slots from `../editCharacterSlots` (mounted
 * unchanged; this file decides only where).
 *
 * The slots sit on the paper as a STUB below the full-bleed Save bar, behind a
 * dashed-red perforation: off the paper is the unmeasured site watercolour.
 * Below the bar since #2991 (delete after save, as in the other seven kits),
 * which is why the band takes `weldBottom: false`. Inside the `<form>` is safe:
 * neither slot can submit.
 *
 * The slots' inks on `--everymen-paper` under `.em-burst` are measured in
 * `everymenEditCharacterContrast.test.ts` (alarm 5.13 / 6.53 at worst).
 * `useEditCharacter` owns state. Placeholder-only via `namedField()` (#2793).
 */
import { useRef, type CSSProperties } from 'react'
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

/* Palette: same names and tokens as `EverymenCreateCharacter`. */
const PAPER = 'var(--everymen-paper)'
const PANEL = 'var(--faction-everymen-sheet-panel)'
const INK = 'var(--everymen-paper-text)'
const QUIET = 'var(--everymen-quiet)'
const RED = 'var(--everymen-red)'
const FRAME = 'var(--everymen-frame)'
const SHEET_FRAME = 'var(--faction-everymen-composer-frame)'
const MAST = 'var(--faction-everymen-bill-mast)'
const MAST_INK = 'var(--faction-everymen-bill-mast-ink)'
const BAR = 'var(--faction-everymen-bill-cta-bg)'
const BAR_INK = 'var(--faction-everymen-bill-cta-ink)'
const PAPER_DEEP = 'var(--everymen-paper-deep)'
const SHADOW = 'var(--faction-everymen-bill-shadow)'
const ALARM = 'var(--faction-everymen-card-alarm)'

/**
 * Stub plate edge (#3009): the slots' neutral edge misses WCAG 1.4.11's 3:1 here
 * and no fill clears it, so only the edge moves: `-deep-accent`, 5.16:1.
 */
const STUB_EDGE = 'var(--everymen-deep-accent)'

/** Own prefix `ev-amend`, not create's `ev-path`: prefixes are never shared (#2659). */
const BEBAS = 'var(--ev-amend-face)' /* Bebas Neue */
const COURIER = 'var(--faction-everymen-body-font)' /* Courier Prime */

const COG_PERIOD = '22s'

/* Ornament geometry (WORLD_ZERO_STYLE §4a: not layout spacing) */
const MAST_COG = 16
const STAGE_COG = { desktop: 40, mobile: 32 }

/* Edit caps, as `DefaultEditCharacter`; nothing exports them. */
const NAME_MAX = 50
const BIO_MAX = 500

export default function EverymenEditCharacter({ state }: { state: EditCharacterState }) {
  const { t } = useTranslation(['forms', 'common'])
  const navigate = useNavigate()
  const sizes = useComposerSizes()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const factor = sizes.isMobile ? 'mobile' : 'desktop'
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

  /* No bill to dress yet, so site chrome. */
  if (state.loading) return <div className="py-8 font-body text-muted">{t('common:loading')}</div>
  if (!character) return <div className="py-8 font-body text-muted">{t('editCharacter.notFound')}</div>
  if (!state.isOwner) return <div className="py-8 font-body text-muted">{t('editCharacter.notOwner')}</div>

  /** The create plate's label metrics (#1828). */
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

  const counter = (text: string, used: number, max: number) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: COURIER, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: used >= max ? ALARM : QUIET }}>{text}</span>
    </div>
  )

  const sheetStyle = {
    background: PAPER,
    border: `2px solid ${SHEET_FRAME}`,
    borderRadius: 0,
    boxShadow: SHADOW,
  }

  const stubPlate: CSSProperties = {
    background: PANEL,
    border: `2px solid ${STUB_EDGE}`,
    borderRadius: 0,
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
        padding: sizes.barPadding,
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

  /* The one ornament (#2195), as the create plate mounts it. */
  const ground = <div aria-hidden className="em-burst" />

  /* Drawn twice (#1707): above the footer, and as the stub's perforation. */
  const dashRule = (
    <ComposerRule style={{ height: 0, background: 'transparent', borderTop: `2px dashed ${RED}` }} />
  )

  // A fresh crop shows before Save (#985).
  const portraitSrc = avatarPreview ?? (character.avatar_url ? mediaUrl(character.avatar_url) : null)

  return (
    <ComposerPage
      sizes={sizes}
      style={{ ...factionBodyVars("everymen"), ...factionRoleVars('everymen', 'ev-amend'), fontFamily: COURIER, color: INK }}
    >
      {/* Real `<form>` so Enter commits; `handleSubmit` prevents default. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} ground={ground}>
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
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={NAME_MAX}
              {...namedField(t('character.namePlaceholder'))}
              style={{ ...fieldBox, fontFamily: BEBAS, letterSpacing: '0.02em' }}
            />
            {counter(
              t('editCharacter.displayNameCount', { count: displayName.length }),
              displayName.length,
              NAME_MAX,
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
            <p style={{ fontFamily: COURIER, fontSize: 'var(--text-lg)', color: QUIET, margin: 0 }}>
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
              rows={3}
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.6 }}
            />
            {counter(t('editCharacter.storyCount', { count: bio.length }), bio.length, BIO_MAX)}
          </ComposerSection>

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
            {counter(
              t('editCharacter.taglineCount', { count: tagline.length }),
              tagline.length,
              TAGLINE_MAX,
            )}
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

          <ErrorBanner message={error} style={{ color: ALARM }} />

          {dashRule}

          {/* [Cancel] … [Save] (#646); the commit is a full-bleed bar. */}
          <ComposerFooter
            band
            start={
              <button
                type="button"
                onClick={() => navigate(`/characters/${id}`)}
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
            }
            end={
              <button
                type="submit"
                disabled={!canSubmit}
                className="control-off"
                style={{
                  ...composerBandStyle(sizes, {
                    /* Design: 15 (--text-content) / 0.22em, Bebas. */
                    fontFamily: BEBAS,
                    fontSize: 'var(--text-content)',
                    letterSpacing: '0.22em',
                    /* The sheet's frame, not `--everymen-frame`. */
                    frame: SHEET_FRAME,
                    color: BAR_INK,
                    background: BAR,
                    /* The stub follows (#2991): keep the side bleed, drop the
                       bottom one or it pulls the stub up over the bar. */
                    weldBottom: false,
                  }),
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                {saving ? t('editCharacter.saveBusy') : t('editCharacter.saveIdle')}
              </button>
            }
          />

          {/* The stub, below the bar (#2991); see the header. */}
          {dashRule}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <FactionRow slug={character.faction_slug} picker={state.faction} rowStyle={stubPlate} />
            <DeleteCharacter
              slug={character.faction_slug}
              deleting={deleting}
              onDelete={handleDelete}
              cancelStyle={stubPlate}
            />
          </div>
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

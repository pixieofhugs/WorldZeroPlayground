/**
 * S.N.I.D.E. edit-character archetype: `SnideCreateCharacter`'s dress, derived
 * (owner ruling) — no new sheet, mark, token or copy key. Read that file beside this.
 *
 * Location and handle wear create's field treatment; `FactionRow`/`DeleteCharacter`
 * are mounted from `../editCharacterSlots`, never re-drawn. The footer is a
 * full-bleed cast band, so the slots go on a SECOND `ComposerSheet` below Save.
 *
 * Re-measured per the slots' `ponytail:` note. The tail sheet re-points
 * `--faction-snide-card-alarm` at `-wall-alarm`: card-alarm
 * is pinned bright for the black slabs and reads 1.24:1 as type on the wall
 * (wall-alarm ≥ 5.13). Same cascade seam as `.snd-praxis-frame` (#1153).
 * Numbers live in `__tests__/snideEditCharacterContrast.test.ts`.
 *
 * `-composer-*` flips with the wall; `-acid`/`-ink` are the press and do not. No
 * `--color-text-*` here (`local/no-global-ink-on-faction-surface`). State is all
 * `useEditCharacter`'s. Placeholder-only fields via `namedField()` (#2793); caps
 * are the EDIT page's, not create's.
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
import { LOCATION_CODE_LENGTH, namedField } from '../characterFields'
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
import { WALL } from '../../../components/factionMarks/snideAtoms'
import { factionBodyVars } from '../../../utils/factionBodyFace'

const SLUG = 'snide'

/* Server caps for edit (create's NAME_MAX is 22 and would truncate). */
const NAME_MAX = 50
const BIO_MAX = 500

/* The sheet's inks — these flip with the wall. */
const INK = 'var(--faction-snide-composer-ink)'
const MUTED = 'var(--faction-snide-composer-muted)'
const FAINT = 'var(--faction-snide-composer-faint)'
const FIELD = 'var(--faction-snide-composer-field)'
const RULE = 'var(--faction-snide-composer-rule)'
const BAR = 'var(--faction-snide-composer-bar)'
/* Not `-card-alarm`: see header. */
const ALARM = 'var(--faction-snide-composer-alarm)'

/**
 * Tail plate (#3009): the slots' neutral plate misses 1.4.11's 3:1 on this wall.
 * No fill clears it, so the edge moves to `-accent-ink` (4.39:1 worst); the fill
 * is `-note-paper`, the clipping stock other S.N.I.D.E. notes use.
 */
const TAIL_FILL = 'var(--faction-snide-note-paper)'
const TAIL_EDGE = 'var(--faction-snide-accent-ink)'

/* The press — theme-invariant. */
const ACID = 'var(--faction-snide-acid)'
const PRESS_INK = 'var(--faction-snide-ink)'

const TITLE_FACE = 'var(--faction-snide-font-black)' /* Archivo Black */
const BODY_FACE = 'var(--faction-snide-font-type)' /* Special Elite */

/* ── Ornament geometry (WORLD_ZERO_STYLE §4a: not layout spacing) ── */
const MASTHEAD_RULE_HEIGHT = 6
const CENSOR_HEIGHT = 10

function punkLabel(overrides: CSSProperties = {}): CSSProperties {
  return composerLabelStyle({ fontFamily: BODY_FACE, ...overrides })
}

export default function SnideEditCharacter({ state }: { state: EditCharacterState }) {
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

  // The na kit's guards: a state is not a dress.
  if (state.loading) return <div className="py-8 font-body text-muted">{t('common:loading')}</div>
  if (!character) return <div className="py-8 font-body text-muted">{t('editCharacter.notFound')}</div>
  if (!state.isOwner) return <div className="py-8 font-body text-muted">{t('editCharacter.notOwner')}</div>

  const sectionLabel = { fontFamily: BODY_FACE, color: MUTED }

  const fieldBox = {
    width: '100%',
    background: FIELD,
    color: INK,
    border: `1px solid ${RULE}`,
    borderRadius: 0,
    padding: 'var(--space-md)',
    boxSizing: 'border-box',
    fontFamily: BODY_FACE,
    fontSize: 'var(--text-content)',
  } as const

  const counter = (text: string, atCap: boolean) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: BODY_FACE, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: atCap ? ALARM : FAINT }}>{text}</span>
    </div>
  )

  /* No edge: the stock is the wall (#2177). */
  const sheetStyle = { background: WALL, borderRadius: 0 }

  const tailPlate: CSSProperties = {
    background: TAIL_FILL,
    border: `1px solid ${TAIL_EDGE}`,
    borderRadius: 0,
  }

  /* Fresh crop shows before Save (#985); a stored avatar is a relative path. */
  const portraitSrc = avatarPreview ?? (character.avatar_url ? mediaUrl(character.avatar_url) : null)

  const masthead = (
    <ComposerMasthead
      background={BAR}
      style={{ height: 'auto', padding: 'var(--space-sm) var(--space-lg)' }}
    >
      {/* Ornament; the h1 below is the page's heading. */}
      <span aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
        <span
          style={{
            fontFamily: TITLE_FACE,
            // eslint-disable-next-line local/no-raw-style-values -- ornament: the wordmark is a poster face at its drawn optical size, not a tier of the text scale (§4a).
            fontSize: 20,
            lineHeight: 1,
            letterSpacing: '0.06em',
            color: ACID,
            whiteSpace: 'nowrap',
          }}
        >
          {factionName(SLUG)}
        </span>
        {/* `ep-pulse`; keyframe + reduced-motion gate live in CSS (#1003). */}
        <span
          className="ep-pulse"
          style={{
            flex: 1,
            height: MASTHEAD_RULE_HEIGHT,
            background: `repeating-linear-gradient(90deg, ${ACID} 0 6px, transparent 6px 10px)`,
            ...({ '--ep-pulse-dur': '3.6s' } as CSSProperties),
          }}
        />
      </span>
    </ComposerMasthead>
  )

  return (
    <ComposerPage sizes={sizes} style={{ ...factionBodyVars("snide"), fontFamily: BODY_FACE, color: INK }}>
      {/* Real form so Enter submits; handleSubmit preventDefaults. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        {/* No bottom inset: the tail sheet follows directly. */}
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} pageStyle={{ paddingBottom: 0 }}>
          <h1
            style={{
              fontFamily: TITLE_FACE,
              fontSize: sizes.titleSize,
              letterSpacing: '0.02em',
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

          <ComposerSection rule={false}>
            <input
              data-composer-field
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={NAME_MAX}
              {...namedField(t('character.namePlaceholder'))}
              style={{ ...fieldBox, fontFamily: TITLE_FACE, letterSpacing: '0.02em' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: BODY_FACE, fontSize: 'var(--text-lg)' }}>
              <span style={{ color: FAINT }}>@{character.username}</span>
              <span style={{ color: displayName.length >= NAME_MAX ? ALARM : FAINT }}>
                {t('editCharacter.displayNameCount', { count: displayName.length })}
              </span>
            </div>
            {/* A readout, not a disabled box: the handle is permanent (ADR-0019). */}
            <span style={{ fontFamily: BODY_FACE, fontSize: 'var(--text-lg)', color: FAINT }}>
              {t('editCharacter.handleHint')}
            </span>
          </ComposerSection>

          <ComposerSection rule={false}>
            <textarea
              data-composer-field
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={BIO_MAX}
              {...namedField(t('character.bioPlaceholder'))}
              rows={4}
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.7 }}
            />
            {counter(t('editCharacter.storyCount', { count: bio.length }), bio.length >= BIO_MAX)}
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
            {counter(t('editCharacter.taglineCount', { count: tagline.length }), tagline.length >= TAGLINE_MAX)}
          </ComposerSection>

          {/* Location: an airport code, coarse on purpose (#2793). */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={LOCATION_CODE_LENGTH}
              {...namedField(t('character.locationPlaceholder'))}
              style={fieldBox}
            />
          </ComposerSection>

          {/* Picker owns the hidden input (#1149); the card opens it too.
              `hasCurrentPortrait` makes "nothing chosen" read as keeping it. */}
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
              buttonStyle={punkLabel({
                cursor: 'pointer',
                borderRadius: 0,
                padding: 'var(--space-sm) var(--space-lg)',
                background: FIELD,
                color: INK,
                border: `1px solid ${RULE}`,
              })}
              statusStyle={{ fontFamily: BODY_FACE, color: MUTED }}
              errorStyle={{ fontFamily: BODY_FACE, color: ALARM, margin: 'var(--space-sm) 0 0' }}
            />
          </ComposerSection>

          <ErrorBanner message={error} style={{ fontFamily: BODY_FACE, color: ALARM }} />

          {/* Censor stripe, struck once above the footer (#1707). */}
          <ComposerRule style={{ height: CENSOR_HEIGHT, background: BAR }} />

          {/* [Cancel] … [Save] (#646). */}
          <ComposerFooter
            band
            start={
              <button
                type="button"
                onClick={() => navigate(`/characters/${id}`)}
                style={punkLabel({
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: FAINT,
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
                    fontFamily: TITLE_FACE,
                    fontSize: 'var(--text-content)',
                    letterSpacing: '0.2em',
                    /* Stock has no border, so the band's rule takes RULE. */
                    frame: RULE,
                    background: ACID,
                    color: PRESS_INK,
                  }),
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                {saving ? t('editCharacter.saveBusy') : t('editCharacter.saveIdle')}
              </button>
            }
          />
        </ComposerSheet>
      </form>

      {/* The tail: outside the form, with the alarm re-point (see header). */}
      <ComposerSheet
        sizes={sizes}
        pageStyle={{ paddingTop: 'var(--space-lg)' }}
        masthead={<ComposerMasthead background={BAR} height={CENSOR_HEIGHT} />}
        style={{
          ...sheetStyle,
          ...({
            '--faction-snide-card-alarm': 'var(--faction-snide-wall-alarm)',
          } as CSSProperties),
        }}
      >
        <FactionRow slug={character.faction_slug} picker={state.faction} rowStyle={tailPlate} />
        <DeleteCharacter
          slug={character.faction_slug}
          deleting={deleting}
          onDelete={handleDelete}
          cancelStyle={tailPlate}
        />
      </ComposerSheet>

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

/**
 * The UA edit-character archetype — THE VELLUM LEAF, RE-READ (#2537).
 *
 * DERIVED, not designed (owner ruling 2026-08-27, restated 2026-08-28). This is
 * `UaCreateCharacter`'s dress on the edit page's fields: the same sun-bleached
 * sheet, the same lotus-and-ensō ground, the same `fieldBox`, the same cast band
 * closing the leaf. Nothing new was drawn and no colour was minted. What the
 * create leaf could not supply — location, the handle readout, the faction the
 * character already has, and the one act that cannot be undone — is extended
 * from those same field treatments, which is what "derived" was ruled to mean
 * here: create-plus-four, because EDIT is the superset.
 *
 * ## The two slots are MOUNTED, and they sit OFF the leaf — which is measured
 *
 * `FactionRow` and `DeleteCharacter` come from `../editCharacterSlots`, designed
 * once so all eight archetypes inherit what they DO and what they READ AS. This
 * file decides only WHERE, and it puts them in a tail below the sheet — the same
 * placement `DefaultEditCharacter`'s desktop branch records: below Save, outside
 * the card stack, so the irreversible act cannot be read as one of the fields.
 *
 * FOR UA THAT PLACEMENT IS ALSO FORCED, and by a number rather than a taste.
 * `FactionRow` draws its row on `--color-bg-surface-alt`, which in DARK is a 6%
 * white wash — a translucent site token that takes the colour of whatever is
 * under it. Composited over this kit's washed leaf it lands at rgb(91,66,49),
 * and the row's own `--color-text-secondary` on that reads **4.15:1**: under AA,
 * on the one control whose whole job is to name the faction. On the page ground
 * this route actually has (no `useFactionBackdrop` call anywhere in the edit
 * path, so it is the site's own stock under the neutral wash) the same row reads
 * 5.58–7.31 in both themes. The slot is a shared component this PR may not
 * redraw, so the archetype moves rather than the slot — and the tail is the
 * placement the two shipped surfaces already agree on.
 *
 * That is also why the `ponytail:` note in `editCharacterSlots.tsx` does not
 * fire here: this archetype does NOT land the slot on its own sheet, so the
 * alarm ink is still on the ground it was measured on. The one thing that does
 * change is the ink's NAME — `factionCssVar('ua', 'card-alarm')` rather than
 * na's — and `__tests__/uaEditCharacterContrast.test.ts` measures that pairing
 * on this page's real ground, in both themes, together with the dark-mode miss
 * above that decides the placement.
 *
 * ## Everything else is the create leaf, element for element
 *
 * The chassis is the composer's (`ComposerPage` / `ComposerSheet` /
 * `ComposerSection` / `ComposerRule` / `ComposerFooter` / `ErrorBanner`), UA
 * draws NO masthead because the ground carries the identity, the ensō turns on
 * `.ep-spin` through the shared `--ep-spin-dur` hook rather than a second
 * keyframe or an inline `animation:` (#1003), and `useComposerSizes()` reads
 * `useFormFactor()` so there is ONE responsive tree and no mobile twin.
 *
 * Every colour is a `--faction-ua-*` token or one of the nine roles under this
 * surface's own `factionRoleVars` prefix, so both themes arrive through the
 * `[data-theme="dark"]` cascade and no ternary stands in for it (#851). The
 * quiet tier is `-card-body` and NOT `-card-muted`, for the measured reason
 * `UaCreateCharacter` records: muted reads 4.38 / 3.79 under the lotus wash and
 * body reads 5.74 / 6.78. The error banner takes `-card-alarm` for the reason
 * that file records too (#1231).
 *
 * ## Copy, labels and the focus ring
 *
 * PLACEHOLDER-ONLY, AND EVERY FIELD NAMES ITSELF (#2793): no `<label>` element
 * is drawn anywhere on this page, and `namedField()` sets `placeholder` and
 * `aria-label` from one string so the two can never drift. No orphan `<label>`
 * (#2834) — the portrait section's heading is `ComposerSection`'s own span, not
 * a label pointing at nothing. Every field carries `data-composer-field` and
 * nothing suppresses an outline, so focus takes the shared ring (#2266/#2825).
 * Every string is an existing `forms:` key; this file mints none.
 *
 * ## Presentation only
 *
 * `useEditCharacter` stays the single source of state. Nothing here touches the
 * persist path, the delete path, `PortraitPicker` or `useAvatarPicker`, and the
 * three load / not-found / not-yours guards are the same three the na kit
 * hoists, restated in this kit's ink rather than in site chrome.
 */
import { useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionRoleVars } from '../../../utils/factionRoles'
import CredentialCard from '../../../components/CredentialCard'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import { mediaUrl } from '../../../utils/media'
import PortraitPicker from '../PortraitPicker'
import { DeleteCharacter, FactionRow } from '../editCharacterSlots'
import { namedField } from '../characterFields'
import type { EditCharacterState } from '../useEditCharacter'
import { TAGLINE_MAX } from '../useCreateCharacter'
import {
  ComposerFooter,
  ComposerGround,
  ComposerPage,
  ComposerRule,
  ComposerSection,
  ComposerSheet,
  ErrorBanner,
  composerBandStyle,
  composerLabelStyle,
  useComposerSizes,
} from '../../editPraxis/archetypes/shared'
import { Lotus } from '../../../components/factionMarks'
import { UaSigil } from '../../../components/sigil/UaSigil'
import { UA_DISPLAY, UA_TEXT } from '../../../components/factionMarks/uaAtoms'

const SLUG = 'ua'

/* The practice's inks, named for the ROLE each plays — the same constants and
 * the same tokens `UaCreateCharacter` names, because this is that dress. */
const SHEET = 'var(--leaf-edit-character-paper)' /* the sun-bleached sheet */
const FIELD = 'var(--faction-ua-panel)' /* inset panel — fields, wells */
const INK = 'var(--leaf-edit-character-ink)'
/* `-card-body`, not `-card-muted`: the quiet tier on THIS ground is one rung up,
 * measured in `__tests__/uaCreateCharacterContrast.test.ts` (4.38 / 3.79 vs
 * 5.74 / 6.78 under the lotus wash). Same sheet, same wash, same answer. */
const BODY = 'var(--faction-ua-card-body)'
const ACCENT = 'var(--leaf-edit-character-accent)'
const RULE = 'var(--faction-ua-rule)' /* the neutral hairline */
const HAIR = 'var(--faction-ua-hair)' /* the faintest divider, below -rule */
const FILL = 'var(--leaf-edit-character-fill)'
const ON_FILL = 'var(--leaf-edit-character-on-fill)'
const ALARM = 'var(--faction-ua-card-alarm)'

/** Geometry the kit pins: radius 7, a 2px border. Ornament, not spacing. */
const RADIUS = 7
const BORDER_WIDTH = 2

/** The ensō's turn, re-timed off the shared `--ep-spin-dur` hook. */
const GROUND_SPIN = '200s'

/**
 * The EDIT page's caps, which are not create's.
 *
 * `useCreateCharacter` exports `NAME_MAX = 22` and `BIO_MAX = 160`; the edit
 * surface's twins are 50 and 500 and its own catalogue strings say so
 * (`editCharacter.displayNameCount` is literally "{{count}}/50"). Importing
 * create's constants here would silently truncate a name a player already has.
 * `TAGLINE_MAX` IS shared and is imported, exactly as that file's note says.
 *
 * ponytail: three literals, the same three the na kit writes inline. The
 * upgrade path is to hoist them beside `TAGLINE_MAX` once the seven-faction
 * fan-out has landed — doing it now would put every archetype PR in this batch
 * into the same shared file for one line each.
 */
const NAME_MAX = 50
const BIO_MAX = 500
const LOCATION_MAX = 100

/** The counters turn alarm on the last tenth, which is where na turns them. */
const WARN_AT = 0.9

export default function UaEditCharacter({ state }: { state: EditCharacterState }) {
  const { t } = useTranslation(['forms', 'common'])
  const navigate = useNavigate()
  const sizes = useComposerSizes()
  const fileRef = useRef<HTMLInputElement>(null)
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

  /* The same three one-line states the na kit hoists, in this kit's ink rather
     than in site chrome — they are the whole page when they draw. */
  const quietLine = { fontFamily: UA_TEXT, color: BODY, padding: 'var(--space-2xl) 0' }
  if (loading) return <div style={quietLine}>{t('common:loading')}</div>
  if (!character) return <div style={quietLine}>{t('editCharacter.notFound')}</div>
  if (!isOwner) return <div style={quietLine}>{t('editCharacter.notOwner')}</div>

  // The monogram the avatar hint names, and what the card falls back to.
  const initial = (displayName.trim()[0] || character.username[0] || '?').toUpperCase()
  // A freshly cropped portrait (object URL) shows before Save (#985); otherwise
  // the persisted one.
  const portraitSrc = avatarPreview ?? (character.avatar_url ? mediaUrl(character.avatar_url) : null)

  /* Ornament geometry, in raw px because a drawn figure is neither type nor
     spacing (WORLD_ZERO_STYLE §4a). The composer's own pair, unchanged. */
  const groundGeometry = sizes.isMobile
    ? { lotus: 300, lotusLeft: -122, lotusTop: -94, enso: 208, ensoRight: -66, ensoBottom: -58 }
    : { lotus: 420, lotusLeft: -170, lotusTop: -130, enso: 300, ensoRight: -96, ensoBottom: -84 }

  const labelStyle = { fontFamily: UA_TEXT, color: BODY }

  const fieldBox = {
    width: '100%',
    background: FIELD,
    color: INK,
    border: `1px solid ${RULE}`,
    borderRadius: RADIUS,
    padding: 'var(--space-md)',
    boxSizing: 'border-box',
    fontFamily: UA_TEXT,
    fontSize: 'var(--text-content)',
  } as const

  /** The counter row under a field: quiet, and alarmed near the cap. */
  const counter = (text: string, used: number, max: number) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        fontFamily: UA_TEXT,
        fontSize: 'var(--text-lg)',
        color: used >= max * WARN_AT ? ALARM : BODY,
      }}
    >
      {text}
    </div>
  )

  const sheetStyle = {
    background: SHEET,
    border: `${BORDER_WIDTH}px solid ${ACCENT}`,
    borderRadius: RADIUS,
  }

  /* NO masthead. UA is the one faction that draws no top band — the ground is
     the identity, and it is the composer's own, element for element. */
  const ground = (
    <ComposerGround inset={0} opacity="var(--faction-ua-card-lotus-opacity)">
      <Lotus
        size={groundGeometry.lotus}
        color="var(--faction-ua-card-lotus)"
        style={{ position: 'absolute', left: groundGeometry.lotusLeft, top: groundGeometry.lotusTop }}
      />
      {/* The ensō turns once every 200s, re-timed through the shared hook — a
          CLASS, so `prefers-reduced-motion` in index.css still governs it. */}
      <span
        className="ep-spin"
        style={
          {
            position: 'absolute',
            right: groundGeometry.ensoRight,
            bottom: groundGeometry.ensoBottom,
            '--ep-spin-dur': GROUND_SPIN,
          } as CSSProperties
        }
      >
        <UaSigil width={groundGeometry.enso} height={groundGeometry.enso} />
      </span>
    </ComposerGround>
  )

  return (
    <ComposerPage
      sizes={sizes}
      style={{
        /* The nine roles under this surface's prefix (#2659/#2673), on the page
           root so the module constants above resolve inside it. */
        ...factionRoleVars(SLUG, 'leaf-edit-character'),
        fontFamily: UA_TEXT,
        color: INK,
      }}
    >
      {/* A REAL `<form>`: it is what makes Enter commit from a text field.
          `handleSubmit` calls `preventDefault()` itself. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        <ComposerSheet sizes={sizes} style={sheetStyle} ground={ground}>
          <h1
            style={{
              fontFamily: UA_DISPLAY,
              fontWeight: 600,
              fontSize: sizes.titleSize,
              color: INK,
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {t('editCharacter.heading')}
          </h1>

          {/* The life as it stands — its real level and score, not creation's
              1 / 0. The card dispatches its own faction dress, so it is already
              wearing this leaf, and its portrait opens the same hidden input the
              picker below owns. */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <CredentialCard
              displayName={displayName || character.display_name}
              handle={character.username}
              factionSlug={character.faction_slug}
              level={character.level}
              score={character.score}
              avatarUrl={portraitSrc}
              onAvatarClick={() => fileRef.current?.click()}
            />
          </div>

          {/* Chosen name */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={NAME_MAX}
              {...namedField(t('character.namePlaceholder'))}
              style={{ ...fieldBox, fontFamily: UA_DISPLAY, fontWeight: 600 }}
            />
            {counter(
              t('editCharacter.displayNameCount', { count: displayName.length }),
              displayName.length,
              NAME_MAX,
            )}
          </ComposerSection>

          {/* The handle — read-only, auto-derived and permanent (ADR-0019). A
              real `readOnly` input rather than a styled div, for #2793's reason:
              an `aria-label` on a role-less element is ignored, so the readout
              would announce a bare handle and nothing else. */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              readOnly
              value={`@${character.username}`}
              {...namedField(t('character.handlePlaceholder'))}
              style={{ ...fieldBox, color: BODY }}
            />
            <p style={hintStyle}>{t('editCharacter.handleHint')}</p>
          </ComposerSection>

          {/* The story */}
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
            {counter(t('editCharacter.storyCount', { count: bio.length }), bio.length, BIO_MAX)}
          </ComposerSection>

          {/* Tagline — the slogan line, not a short bio (#1628). */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={TAGLINE_MAX}
              {...namedField(t('character.taglinePlaceholder'))}
              style={fieldBox}
            />
            {counter(
              t('editCharacter.taglineCount', { count: tagline.length }),
              tagline.length,
              TAGLINE_MAX,
            )}
          </ComposerSection>

          {/* Where you're based — an AIRPORT CODE, and the placeholder is the
              whole of the convention (owner ruling on #2793): nothing validates
              the format, the column is free text. */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={LOCATION_MAX}
              {...namedField(t('character.locationPlaceholder'))}
              style={fieldBox}
            />
            {counter(
              t('editCharacter.basedCount', { count: location.length }),
              location.length,
              LOCATION_MAX,
            )}
          </ComposerSection>

          {/* Portrait — the shared picker owns the hidden input and the "what's
              chosen" readout (#1149), and it is told a portrait may already
              exist so "nothing new chosen" reads as keeping it. Dressed rather
              than left in site chrome: `.btn-outline` brings a near-white ground
              that reads as a browser control dropped on the leaf. */}
          <ComposerSection rule={false} label={t('character.portrait')} labelStyle={labelStyle}>
            <PortraitPicker
              inputRef={fileRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
              hasCurrentPortrait={Boolean(character.avatar_url)}
              error={avatarError}
              buttonStyle={composerLabelStyle({
                fontFamily: UA_TEXT,
                cursor: 'pointer',
                borderRadius: RADIUS,
                padding: 'var(--space-sm) var(--space-lg)',
                background: FIELD,
                color: INK,
                border: `1px solid ${RULE}`,
              })}
              statusStyle={{ fontFamily: UA_TEXT, color: BODY }}
              errorStyle={{ color: ALARM }}
            />
            <p style={hintStyle}>{t('editCharacter.avatarHint', { initial })}</p>
          </ComposerSection>

          <ErrorBanner message={error} style={{ color: ALARM }} />

          {/* The leaf's faintest rule, drawn ONCE above the footer (#1707). */}
          <ComposerRule style={{ background: HAIR }} />

          {/* [Cancel] … [Save] — the global order from #646, cast as a full-bleed
              band (#1828), which is what UA's composer already casts through. */}
          <ComposerFooter
            band
            start={
              <button
                type="button"
                onClick={() => navigate(`/characters/${id}`)}
                style={composerLabelStyle({
                  fontFamily: UA_TEXT,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: BODY,
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
                    fontFamily: UA_TEXT,
                    /* The composer's band: 13 / 600 / 0.14em. 600 rather than
                       500 because `index.html` loads EB Garamond at 400 and 600
                       only, and CSS matching resolves 500 DOWN to 400 (#1294). */
                    fontSize: 'var(--text-xl)',
                    fontWeight: 600,
                    frame: ACCENT,
                    color: ON_FILL,
                    background: FILL,
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

      {/* ── The tail: the calling this life already has, and the one act that
           cannot be undone. OFF the leaf and below Save — the na desktop
           branch's placement, and here also the ground both slots are measured
           on (see the header). Outside the <form> for the same reason. ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-xl)',
          maxWidth: sizes.maxWidth,
          margin: '0 auto',
          padding: `var(--space-2xl) ${sizes.padX} var(--space-3xl)`,
        }}
      >
        <FactionRow slug={character.faction_slug} />
        <DeleteCharacter slug={character.faction_slug} deleting={deleting} onDelete={handleDelete} />
      </div>

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

/** The quiet line under a field that has one — the handle's and the portrait's. */
const hintStyle: CSSProperties = {
  fontFamily: UA_TEXT,
  fontStyle: 'italic',
  fontSize: 'var(--text-content)',
  color: BODY,
  margin: 'var(--space-sm) 0 0',
  lineHeight: 1.55,
}

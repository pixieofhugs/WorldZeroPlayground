/**
 * The Ephemerists edit-character archetype — THE VALLEY PLATE, re-cut for a life
 * that already exists (#2537, the seven-faction fan-out).
 *
 * DERIVED, not designed (owner ruling 2026-08-28). No sheet was drawn and none
 * was commissioned: this is `EphemeristsCreateCharacter`'s dress — the same
 * chassis, the same ground, the same ornament, the same field furniture —
 * applied to the fields the edit form actually has. Every value below already
 * ships on that page or on `EphemeristsEditPraxis`; nothing here mints a token,
 * a keyframe, an SVG or a string.
 *
 * ## Derived means CREATE PLUS FOUR
 *
 * Edit is the superset. Four fields carry over (name, story, tagline, portrait),
 * `answer a calling` is create-only and meaningless here, and four groups exist
 * only on this page: LOCATION, HANDLE, the FACTION ROW and the DELETE DANGER
 * ZONE. The first two are plain fields and wear the plate's `fieldBox` like the
 * rest. The last two are the slots designed once in `../editCharacterSlots`.
 *
 * ## The two slots are MOUNTED, never re-drawn
 *
 * `FactionRow` and `DeleteCharacter` come from `../editCharacterSlots` exactly as
 * they come to `DefaultEditCharacter`. What they do and what they read as is that
 * file's; only WHERE they sit is this archetype's, which is the split the
 * 2026-08-27 gate ruling drew in terms. In particular `factionDetailHref` is the
 * `na`-goes-to-the-DIRECTORY rule said once — `/factions/na` is a 404 for the one
 * population that branch serves — and this file does not hand-roll a href.
 *
 * ## Where they sit, and why it is a SECOND PLATE
 *
 * The two shipped surfaces put the tail below Save and outside the card stack, so
 * the irreversible act cannot be read as one of the ordinary fields. This agrees
 * with them, and the plate's way of saying "outside the stack" is a SECOND SHEET:
 * the form's plate ends at its footer band, and the tail is its own smaller plate
 * beneath it, outside the `<form>` entirely.
 *
 * IT IS A PLATE RATHER THAN BARE PAGE FOR A REASON THAT IS NOT TASTE. Below the
 * sheet there is no ground this page owns — the app's backdrop dispatches on the
 * VIEWER's faction while this page dispatches on the EDITED CHARACTER's, so a
 * tail floating outside the sheet would land its ink on a stock this archetype
 * cannot name. `--faction-ephemerists-plate-bg` is a ground this file paints, and
 * therefore a ground that can be measured.
 *
 * ## The measurement that ownership costs (the slot's own `ponytail:`)
 *
 * The shared alarm ink was measured on the `na` page's washed ground only. This
 * archetype lands the destructive slot on the PLATE, so it owes readings there —
 * added as rows in `utils/__tests__/factionContrast.test.ts` rather than as a
 * change to the shared slot, which is the upgrade path that note names. Three
 * inks land directly on this ground: the alarm (`-card-alarm`, the outline and
 * its confirm border), and the faction row's label and help tiers. All three are
 * rows there now.
 *
 * ## Colour
 *
 * Plate tokens only, through `components/factionMarks/ephemeristsPlate` — never a
 * ternary and never a `dark ?` branch; the register flips in the cascade (#2141).
 * `-brass` is a RULE colour and never an ink; quiet type takes `-quiet`. This is
 * the plate, never the illuminated codex (`--eph-*`) — the two grounds must not
 * be mixed on one surface (ADR-0055). The error banner takes
 * `--faction-ephemerists-card-alarm` for the measured reason its create twin
 * gives: the neutral danger ink misses AA on this stock.
 *
 * NO GLOBAL `--color-text-*` INK IS WRITTEN HERE. `local/no-global-ink-on-faction-surface`
 * is on for this file from birth and stays on — the legacy list may only shrink,
 * and a dressed plate is precisely the tier the rule exists for (2.01:1 in light).
 * `--label-ink` is repointed to `QUIET` on the page root, as its create twin does.
 *
 * ## Copy — none of its own
 *
 * Every string is an existing `forms:` key. Since #2793 both character forms are
 * PLACEHOLDER-ONLY and every field names itself: `namedField()` sets `placeholder`
 * and `aria-label` from one string, so the deleted visible label does not take the
 * accessible name with it. No `<label>` element is drawn on this page at either
 * width, and `editCharacterDispatch.test.tsx` sweeps this registry for both halves.
 *
 * ## One responsive component, no mobile twin
 *
 * `useComposerSizes()` reads `useFormFactor()` and picks the size set; one tree at
 * two widths. Every fixed number here is ornament geometry, never a layout grid
 * (SPEC-faction-ui-profile §1a).
 *
 * ## Presentation only
 *
 * `useEditCharacter` stays the single source of state. Nothing here touches the
 * save path, the delete path, `PortraitPicker` or `useAvatarPicker`. The
 * load / not-found / not-yours guards are hoisted to the top, as the na kit
 * hoists them, so no branch can drift on them.
 */
import { useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { mediaUrl } from '../../../utils/media'
import CredentialCard from '../../../components/CredentialCard'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import PortraitPicker from '../PortraitPicker'
import { DeleteCharacter, FactionRow } from '../editCharacterSlots'
import { namedField } from '../characterFields'
import type { EditCharacterState } from '../useEditCharacter'
import { TAGLINE_MAX } from '../useCreateCharacter'
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

const SLUG = 'ephemerists'

/* The cast's own pair, and the alarm — the same three constants, on the same
   tokens, that `EphemeristsCreateCharacter` and `EphemeristsEditPraxis` name. */
const CTA_INK = 'var(--faction-ephemerists-plate-cta-ink)'
const ALARM = 'var(--faction-ephemerists-card-alarm)'

/* The caps the save path enforces, restated at the fields so the counters and
   the browser agree. `useEditCharacter` is the authority; these are its mirror
   at the same numbers the na kit writes. */
const NAME_MAX = 50
const BIO_MAX = 500
const LOCATION_MAX = 100

/* ── Ornament geometry (WORLD_ZERO_STYLE §4a: not layout spacing) ──
   The band, the field's nominal width and the margin rule are the plate's own
   pairs, carried at the two sizes the create twin uses. */
const EPH_BAND = { desktop: 84, mobile: 68 }
const GRAVITY_WIDTH = { desktop: 720, mobile: 360 }
const GRAVITY_HEIGHT = 2400
const MARGIN_RULE = { desktop: 22, mobile: 13 }
/** The stage mark: a stepped octagon, drawn on a 100-unit viewBox. */
const STATUS_MARK = 44
/** The ankh inside it. */
const STATUS_SIGN = 24
/** The sign following the cast. */
const SUBMIT_SIGN = 17

/**
 * The stage mark: the ankh, cut into a stepped octagon with a brass border.
 * The create twin's mark, unchanged — the shared `Octagon` path draws the clip
 * and the border at once, because a `clipPath` has no stroke.
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

export default function EphemeristsEditCharacter({ state }: { state: EditCharacterState }) {
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

  /** Cinzel small caps, the plate's label voice, over the layout's tracking. */
  const label = { fontFamily: CAPS, fontWeight: 500, letterSpacing: '0.24em' }
  /** Section heads sit on the plate, where the caption gold is measured. */
  const sectionLabel = { ...label, color: CAPTION }
  /** Radius 0, borderW 1.5 — the skin's whole geometry row, as the composer's. */
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

  /** The counter row under a field: quiet, and alarmed at the cap. */
  const counter = (text: string, alarmed: boolean) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: READING, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: alarmed ? ALARM : QUIET }}>{text}</span>
    </div>
  )

  const sheetStyle = {
    background: PLATE,
    border: `1.5px solid ${LINE}`,
    borderRadius: 0,
    boxShadow: SHADOW,
  }

  // The three one-line states, ahead of any ornament: a plate drawn around a
  // "not found" is a costume on an error.
  if (loading) return <div className="py-8 font-body text-muted">{t('common:loading')}</div>
  if (!character) return <div className="py-8 font-body text-muted">{t('editCharacter.notFound')}</div>
  if (!isOwner) return <div className="py-8 font-body text-muted">{t('editCharacter.notOwner')}</div>

  const initial = (displayName.trim()[0] || character.username[0] || '?').toUpperCase()
  // A freshly cropped portrait (object URL) shows immediately, before Save (#985);
  // otherwise fall back to the persisted avatar.
  const portraitSrc = avatarPreview ?? (character.avatar_url ? mediaUrl(character.avatar_url) : null)

  const masthead = (
    <>
      {/* The sky band, as the create plate draws it: a wash rather than a flat
          fill, both stops plate tokens so the sky moves with the cascade. */}
      <ComposerMasthead
        height={EPH_BAND[factor]}
        background={`linear-gradient(180deg, color-mix(in srgb, var(--faction-ephemerists-plate-band) 82%, ${BRASS_LIGHT}) 0%, var(--faction-ephemerists-plate-band) 100%)`}
        style={{
          // The engraved masthead sizes itself from its own padding, so the
          // shared band's `height` is a FLOOR.
          height: 'auto',
          minHeight: EPH_BAND[factor],
          overflow: 'hidden',
          color: BAND_INK,
        }}
      >
        {/* The seed is stable per RECORD here, which is what every other mount
            of this masthead hands it (`praxis:7`, `task:7`). The create page had
            to name its SURFACE because the character did not exist yet; this one
            does, so the notation band is that life's own row of marks and does
            not redraw on a keystroke. */}
        <EphemeristsMasthead slug={SLUG} scale={sizes.isMobile ? 'card' : 'page'} seed={`character:${character.id}`} />
      </ComposerMasthead>
      {/* The cavetto cornice, carrying the one motion — `.eph-cornice-glow`,
          whose pigment, cycle and reduced-motion gate all live in the sheets.
          Nothing here writes an inline `animation:`. */}
      <Cornice glow />
    </>
  )

  const ground = (
    <ComposerGround inset={0} style={{ overflow: 'hidden' }}>
      {/* The plate's own field, bowed toward the well off the sheet's right
          edge. NOT lined paper — see `GravityField`. */}
      <GravityField width={GRAVITY_WIDTH[factor]} height={GRAVITY_HEIGHT} />
      {/* The margin rule, struck in ochre down the gutter — outside the content
          column's inset, so no line of type ever runs into it. */}
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
      style={{ fontFamily: DECO, color: INK, ['--label-ink' as string]: QUIET } as CSSProperties}
    >
      {/* A REAL `<form>`: it is what makes Enter commit from a text field, and
          what gives the browser's own required-field behaviour something to
          attach to. `handleSubmit` calls `preventDefault()` itself. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} ground={ground}>
          {/* The stage: the ankh cartouche beside the page's own heading. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
            <StatusMark />
            <h1 style={{ fontFamily: CAPS, fontSize: sizes.titleSize, color: INK, lineHeight: 1.2, margin: 0 }}>
              {t('editCharacter.heading')}
            </h1>
          </div>

          {/* The life being re-inscribed, live. The card dispatches its own
              faction dress, so it is already wearing this plate — and unlike the
              create page it carries this character's real standing rather than
              the level-1 promise. */}
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

          {/* Chosen name */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={NAME_MAX}
              {...namedField(t('character.namePlaceholder'))}
              style={{ ...fieldBox, fontFamily: CAPS }}
            />
            {counter(
              t('editCharacter.displayNameCount', { count: displayName.length }),
              displayName.length >= NAME_MAX,
            )}
          </ComposerSection>

          {/* The handle — read-only, auto-derived and permanent (ADR-0019). A
              real `readOnly` input rather than a styled div: `aria-label` on a
              role-less element is ignored, and with the visible label deleted by
              #2793 that would leave the readout announcing nothing. It wears the
              field geometry at the plate's own PAGE stock so it reads as fixed
              rather than editable — no second token, no opacity. */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              readOnly
              value={`@${character.username}`}
              {...namedField(t('character.handlePlaceholder'))}
              style={{ ...fieldBox, color: QUIET }}
            />
            <p style={{ fontFamily: READING, fontStyle: 'italic', fontSize: 'var(--text-lg)', color: QUIET, margin: 0 }}>
              {t('editCharacter.handleHint')}
            </p>
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
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.85 }}
            />
            {counter(t('editCharacter.storyCount', { count: bio.length }), bio.length >= BIO_MAX)}
          </ComposerSection>

          {/* Tagline — a slogan line, not a short bio (#1628). It is what the
              profile header's identity slot is laid out against, so running out
              of room is worth seeing before the text stops appearing. */}
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
            {counter(t('editCharacter.taglineCount', { count: tagline.length }), tagline.length >= TAGLINE_MAX)}
          </ComposerSection>

          {/* Where you are based — AN AIRPORT CODE, and the placeholder is the
              only thing that says so (owner ruling on #2793). Nothing validates
              the format, so the hint inside the box is the whole convention. */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={LOCATION_MAX}
              {...namedField(t('character.locationPlaceholder'))}
              style={{ ...fieldBox, maxWidth: 280 }}
            />
            {counter(t('editCharacter.basedCount', { count: location.length }), location.length >= LOCATION_MAX)}
          </ComposerSection>

          {/* Portrait — the shared picker owns the hidden input and the "what's
              chosen" readout (#1149); the credential card above opens the same
              input through `fileInputRef`. `hasCurrentPortrait` is what makes
              "nothing new chosen" read as KEEPING the saved one rather than as
              having none, which is the whole difference from the create page. */}
          <ComposerSection rule={false} label={t('character.portrait')} labelStyle={sectionLabel}>
            {/* Dressed rather than left in site chrome: `.btn-outline` brings a
                near-white ground and neutral ink that read as a browser control
                dropped on the plate. The error ink is passed for the measured
                reason the prop's own note gives. */}
            <PortraitPicker
              inputRef={fileInputRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
              hasCurrentPortrait={Boolean(character.avatar_url)}
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
            <p style={{ fontFamily: READING, fontStyle: 'italic', fontSize: 'var(--text-content)', color: QUIET, margin: 0, lineHeight: 1.55 }}>
              {t('editCharacter.avatarHint', { initial })}
            </p>
          </ComposerSection>

          <ErrorBanner message={error ?? ''} style={{ color: ALARM }} />

          {/* The footer's own divider — the plate's brass, drawn ONCE above the
              footer (#1707) rather than at the head of every section. */}
          <ComposerRule style={{ background: BRASS, opacity: 0.5 }} />

          {/* [Cancel] … [Save] — the global order from #646. */}
          <ComposerFooter
            band
            start={
              <button
                type="button"
                onClick={() => navigate(`/characters/${id}`)}
                style={composerLabelStyle({
                  ...label,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: QUIET,
                })}
              >
                {t('common:actions.cancel')}
              </button>
            }
            end={
              /* NO NOTATION BAND BRACKETING THIS BUTTON, and that is the law
                 rather than an omission (#2367): a PAGE wears the band in its
                 HEADER and a CARD wears it at the call to action.
                 `EphemeristsMasthead` above is already carrying it. */
              <button
                type="submit"
                disabled={!canSubmit}
                /* `.eph-cta` supplies the ground and the ink (#2146), which is
                   why neither is named below. `.control-off` is declared after
                   it and carries `!important`, so the disabled half beats the
                   plate's paint without a class-vs-inline argument. */
                className="eph-cta control-off"
                style={{
                  ...composerBandStyle(sizes, {
                    // Design band: 12 / 500 / 0.24em — the engraved label
                    // metrics exactly; 12 is the --text-lg rung.
                    fontFamily: CAPS,
                    fontWeight: 500,
                    letterSpacing: '0.24em',
                    frame: LINE,
                  }),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-sm)',
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                {saving ? t('editCharacter.saveBusy') : t('editCharacter.saveIdle')}
                {/* The open eye following the cast. */}
                <Sign name="openEye" size={SUBMIT_SIGN} color={CTA_INK} weight={1.4} />
              </button>
            }
          />
        </ComposerSheet>
      </form>

      {/* ── THE TAIL PLATE: the calling this life already has, and the one act
           that cannot be undone. A second sheet, below Save and outside the
           <form> — the plate's way of saying "outside the card stack", which is
           the placement both shipped surfaces already agree on. `pageStyle`
           closes the gap the second sheet's own top padding would open, so the
           two plates read as one column rather than two pages. ── */}
      <ComposerSheet
        sizes={sizes}
        style={sheetStyle}
        pageStyle={{ paddingTop: 0 }}
        contentStyle={{ gap: 'var(--space-xl)' }}
      >
        <FactionRow slug={character.faction_slug} />
        <DeleteCharacter slug={character.faction_slug} deleting={deleting} onDelete={handleDelete} />
      </ComposerSheet>

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

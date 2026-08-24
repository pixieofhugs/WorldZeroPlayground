/**
 * The Ephemerists character-creation archetype — THE VALLEY PLATE, ruled for a
 * new life (#2347, epic #2346).
 *
 * NO DESIGN WAS DRAWN FOR THIS, and none was needed: the owner's ruling is that
 * the two surfaces this faction already ships carry the whole register between
 * them. `components/taskCard/EphemeristsTaskCard` holds the ground, inks and
 * faces; `pages/editPraxis/archetypes/EphemeristsEditPraxis` holds the same kit
 * applied to a FORM — labelled fields, counters, a primary commit, a cancel path
 * — which is structurally what this page is. This file is that dress over this
 * page's fields, and it draws no new SVG at all: the masthead, the cornice, the
 * gravity field and the stepped octagon are all `components/factionMarks`
 * (WORLD_ZERO_STYLE §6, "one primitive").
 *
 * ## The chassis is the composer's, not a second one
 *
 * `ComposerPage` / `ComposerSheet` / `ComposerSection` / `ComposerFooter` are
 * geometry with no praxis in them, so this page mounts the same blocks the
 * composer does rather than restating a sheet, a masthead slot and a footer row.
 * The CONTROLS in `editPraxis/archetypes/controls.tsx` are the half that does
 * not fit — every one of them takes an `EditPraxisState` — so the fields below
 * are plain inputs wearing the plate's `fieldBox`, which is the same geometry
 * row (`radius 0`, `1.5px` line) that file's fields wear.
 *
 * Nothing under `pages/editPraxis/` is written to. It is read as the reference
 * the issue names it as.
 *
 * ## One responsive component, no mobile twin
 *
 * `useComposerSizes()` reads `useFormFactor()` and picks the size set; there is
 * one tree at two widths and no second file. Every fixed number here is ornament
 * geometry, never a layout grid (SPEC-faction-ui-profile §1a).
 *
 * ## Copy — none of its own
 *
 * Every string is an existing `forms:createCharacter.*` key, unchanged and
 * un-reordered: chosen name → about → tagline → portrait → answer a calling →
 * commit / cancel. The masthead's one word is the faction's NAME out of
 * `factions.json`, set by `EphemeristsMasthead` — a name, not a voice.
 *
 * ONE FIELD-SET DEVIATION FROM THE DEFAULT, AND IT IS WORTH A SECOND PAIR OF
 * EYES. The na kit's PHONE branch deliberately carries no prose fields — it is
 * framed as "Step 1 of 2 · Identity" and has never offered `bio`, with `tagline`
 * following `bio` so the two stay a pair (#1628). This plate offers all six
 * fields at both widths, because #2347 states the field list once and
 * unconditionally, and because the two-step framing is the na phone skin's own
 * chrome rather than something the plate wears. The consequence is real: an
 * Ephemerists player on a phone is offered `about` and `tagline` at creation and
 * an unaffiliated one is not. Flagged in the PR rather than settled here.
 *
 * ## Colour
 *
 * Every value is a `--faction-ephemerists-plate-*` token through the plate
 * module, never a ternary and never a `dark ?` branch — the register flips in
 * the cascade (#2141, which reversed the theme-invariant note the older skins
 * still carry). `-brass` is a RULE colour and never an ink; quiet type takes
 * `-quiet`. This is the plate, never the illuminated codex (`--eph-*`); the two
 * grounds must not be mixed on one surface (ADR-0055).
 *
 * The error banner takes `--faction-ephemerists-card-alarm` rather than the
 * plate ochre, which is the same deviation `EphemeristsEditPraxis` keeps and for
 * the same measured reason: the neutral danger ink misses AA on this ground.
 *
 * ## Presentation only
 *
 * `useCreateCharacter` stays the single source of state for all eight
 * archetypes. Nothing here touches the submit path, the payload, `PortraitPicker`
 * or `useAvatarPicker`, and THE PICKER STAYS VISIBLE in this skin — a player must
 * be able to change their mind, or clear the pick and be born unaffiliated,
 * which returns the page to the Default archetype.
 */
import { useId, useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionCssVar, factionName } from '../../../utils/factions'
import CredentialCard from '../../../components/CredentialCard'
import FactionSigil from '../../../components/sigil/FactionSigil'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import PortraitPicker from '../PortraitPicker'
import {
  NAME_MAX,
  BIO_MAX,
  TAGLINE_MAX,
  type CreateCharacterState,
} from '../useCreateCharacter'
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

/* The cast's own pair, and the alarm — the three the plate module does not
   export because no other surface has a primary button. Same three constants,
   same tokens, as `EphemeristsEditPraxis` names. */
const CTA = 'var(--faction-ephemerists-plate-cta-bg)'
const CTA_INK = 'var(--faction-ephemerists-plate-cta-ink)'
const ALARM = 'var(--faction-ephemerists-card-alarm)'

/**
 * The masthead's seed, which it feeds to the notation band in its header.
 *
 * REQUIRED, and stable per SURFACE so that two Ephemerists pages do not draw one
 * row of marks — every other mount hands it a record id (`praxis:7`, `task:7`).
 * This page has no record: the character does not exist yet, which is the whole
 * point of it. The surface itself is therefore the only stable thing there is to
 * name, and naming it is the right answer rather than a fallback — a seed taken
 * off the typed name would redraw the band on every keystroke.
 */
const SEED = 'createCharacter'

/* ── Ornament geometry (WORLD_ZERO_STYLE §4a: not layout spacing) ──
   The band, the field's nominal width and the margin rule are the plate's own
   pairs, carried at the same two sizes the composer and the detail page use. */
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
/** The mark each calling wears in the picker — the size every other chooser draws (#2223). */
const PICKER_SIGIL = 18

/**
 * The stage mark: the ankh, cut into a stepped octagon with a brass border.
 *
 * The shared `Octagon` path draws the clip and the border at once — a `clipPath`
 * has no stroke, and an inset shadow would follow the element's RECTANGLE and
 * leave the four diagonals unbordered. `RingMark` is deliberately not used: it
 * punches a circle, and the stepped cartouche is this faction's signature shape.
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
  const { t } = useTranslation('forms')
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

  /** One id per field, so each label names its own control (#2488). */
  const fieldId = useId()

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

  /** The counter row under a field: quiet, and alarmed on the cap. */
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
      {/* The sky band. A wash rather than a flat fill: the night blue lifts
          toward the nile at the horizon and settles back into the band at its
          foot. Both stops are plate tokens, so the sky moves with the cascade
          the way the rest of this register does (#2141). */}
      <ComposerMasthead
        height={EPH_BAND[factor]}
        background={`linear-gradient(180deg, color-mix(in srgb, var(--faction-ephemerists-plate-band) 82%, ${BRASS_LIGHT}) 0%, var(--faction-ephemerists-plate-band) 100%)`}
        style={{
          // The engraved masthead sizes itself from its own padding, so the
          // shared band's `height` is a FLOOR. `style` is spread after `height`
          // in `ComposerMasthead`, which is what lets a skin relax it.
          height: 'auto',
          minHeight: EPH_BAND[factor],
          overflow: 'hidden',
          color: BAND_INK,
        }}
      >
        <EphemeristsMasthead slug={SLUG} scale={sizes.isMobile ? 'card' : 'page'} seed={SEED} />
      </ComposerMasthead>
      {/* The cavetto cornice, beneath the band, carrying the one motion —
          `.eph-cornice-glow`, whose pigment, cycle and reduced-motion gate all
          live in `index.css`. Nothing here writes an inline `animation:`. */}
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
      {/* A REAL `<form>`, not a bare button with an onClick. The Default skin
          submits through one and so must this: it is what makes Enter commit
          from a text field, and what gives the browser's own required-field
          behaviour something to attach to. `handleSubmit` calls
          `preventDefault()` itself. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
      <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} ground={ground}>
        {/* The stage: the ankh cartouche beside the page's own question, which
            is the heading this surface has always asked. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
          <StatusMark />
          <h1 style={{ fontFamily: CAPS, fontSize: sizes.titleSize, color: INK, lineHeight: 1.2, margin: 0 }}>
            {t('createCharacter.heading')}
          </h1>
        </div>

        {/* The life being inscribed, live. The card dispatches its own faction
            dress, so it is already wearing this plate the moment the calling is
            picked — the same value this whole page reskins on. */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <CredentialCard
            displayName={displayName || t('createCharacter.previewFallbackName')}
            handle={handle}
            factionSlug={factionSlug || null}
            level={1}
            score={0}
            avatarUrl={avatarPreview}
            onAvatarClick={() => fileInputRef.current?.click()}
          />
        </div>

        {/* Chosen name */}
        <ComposerSection rule={false} htmlFor={`${fieldId}-name`} label={t('createCharacter.nameLabel')} labelStyle={sectionLabel}>
          <input
            id={`${fieldId}-name`}
            data-composer-field
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={NAME_MAX}
            placeholder={t('createCharacter.namePlaceholder')}
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

        {/* About */}
        <ComposerSection rule={false} htmlFor={`${fieldId}-about`} label={t('createCharacter.aboutLabel')} labelStyle={sectionLabel}>
          <textarea
            id={`${fieldId}-about`}
            data-composer-field
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={BIO_MAX}
            placeholder={t('createCharacter.aboutPlaceholder')}
            rows={3}
            style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.85 }}
          />
          {counter(bio.length, BIO_MAX)}
        </ComposerSection>

        {/* Tagline — a slogan line, not a short bio (#1628). Its counter turns
            alarm on the cap the way the name field's does: this is the field the
            profile header's identity slot is laid out against, so running out of
            room is worth seeing before the text stops appearing. */}
        <ComposerSection rule={false} htmlFor={`${fieldId}-tagline`} label={t('createCharacter.taglineLabel')} labelStyle={sectionLabel}>
          <textarea
            id={`${fieldId}-tagline`}
            data-composer-field
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={TAGLINE_MAX}
            placeholder={t('createCharacter.taglinePlaceholder')}
            rows={2}
            style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.85 }}
          />
          {counter(tagline.length, TAGLINE_MAX)}
        </ComposerSection>

        {/* Portrait — the shared picker owns the hidden input and the "what's
            chosen" readout (#1149); the credential card above opens the same
            input through `fileInputRef`. */}
        <ComposerSection
          rule={false}
          label={
            <>
              {t('createCharacter.portraitLabel')}{' '}
              <span style={{ textTransform: 'none', letterSpacing: 0 }}>{t('createCharacter.optional')}</span>
            </>
          }
          labelStyle={sectionLabel}
        >
          {/* Dressed rather than left in site chrome. `.btn-outline` brings its
              own near-white `--color-bg-surface` ground and neutral ink, which
              reads as a browser control dropped on the plate; every other
              control on this sheet is `radius 0` on `INNER` inside a brass
              line. The error ink is passed for a measured reason — see the
              prop's own note: the neutral danger red is 3.54:1 on this ground
              in light. */}
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

        {/* Answer a calling — only when the account holds invitations (ADR-0019).
            It stays drawn in this skin: tapping the plate's own faction must not
            be a one-way door, and clearing the pick returns the page to the
            Default archetype. */}
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
                    /* NOT `composerLabelStyle` — it forces `uppercase` and its
                       own tracking, and both would be inherited by the name
                       below. A calling wears its OWN card face at its own case,
                       which is what every other chooser draws. */
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
                      // The faction's own hue as a RING, never as ink (§3) —
                      // the row's type stays on the plate's measured pair.
                      boxShadow: selected ? `0 0 0 2px ${factionCssVar(slug)}` : 'none',
                    }}
                  >
                    {/* The faction's own mark, from the dispatcher every other
                        chooser draws (#2223). */}
                    <FactionSigil slug={slug} size={PICKER_SIGIL} />
                    <span style={{ fontFamily: factionCssVar(slug, 'card-font'), fontSize: 'var(--text-content)', color: selected ? CTA_INK : INK }}>
                      {factionName(slug)}
                    </span>
                  </button>
                )
              })}
            </div>
            <p style={{ fontFamily: READING, fontStyle: 'italic', fontSize: 'var(--text-content)', color: QUIET, margin: 0, lineHeight: 1.55 }}>
              {t('createCharacter.callingHint')}
            </p>
          </ComposerSection>
        )}

        <ErrorBanner message={error ?? ''} style={{ color: ALARM }} />

        {/* The footer's own divider — the plate's brass, at the shared rule's
            own 1px. Drawn ONCE above the footer (#1707) rather than at the head
            of every section; the sheet's gap parts the regions. */}
        <ComposerRule style={{ background: BRASS, opacity: 0.5 }} />

        {/* [Cancel] … [Create] — the global order from #646. */}
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
                })}
              >
                {t('createCharacter.cancel')}
              </button>
              <span style={{ fontFamily: READING, fontSize: 'var(--text-content)', color: QUIET }}>
                {t('createCharacter.startsAt')}
              </span>
            </>
          }
          end={
            <>
              {/* NO NOTATION BAND BRACKETING THIS BUTTON, and that is the law
                  rather than an omission. #2367: a PAGE wears the band in its
                  HEADER and a CARD wears it at the call to action. This is a
                  page, and `EphemeristsMasthead` above is already carrying it —
                  a second row here would be the card's rule applied to a
                  surface that is not one. (`EphemeristsEditPraxis` mounts both,
                  and its own note records that as a reported gap, not a
                  pattern to copy.) */}
              <button
                type="submit"
                disabled={!canSubmit}
                /* `.eph-cta` supplies the ground and the ink (#2146), which is
                   why neither is named below. `.control-off` is declared after
                   it in `index.css` and carries `!important`, so the disabled
                   half beats the plate's paint without a second class-vs-inline
                   argument — this band had no colour to fade in the first
                   place, which is half of why #2486 replaces the fill. */
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
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {submitting ? t('createCharacter.submitBusy') : t('createCharacter.submitIdle')}
                {/* The open eye following the cast. */}
                <Sign name="openEye" size={SUBMIT_SIGN} color={CTA_INK} weight={1.4} />
              </button>
            </>
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

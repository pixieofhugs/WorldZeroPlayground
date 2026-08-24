/**
 * Cozy Coven — THE SPELL SLIP A LIFE IS WRITTEN ONTO (#2351, epic #2346).
 *
 * NO DESIGN WAS DRAWN FOR THIS, and none was needed: the owner's ruling is that
 * the two surfaces this faction already ships carry the whole register between
 * them. `components/taskCard/CovenTaskCard` holds the ground, inks, rules and
 * faces; `pages/editPraxis/archetypes/CovenEditPraxis` holds the same kit
 * applied to a FORM — labelled fields, counters, a primary commit, a cancel
 * path — which is structurally what this page is. This file is that dress over
 * this page's fields.
 *
 * IT DRAWS NO NEW SVG AT ALL. Every mark comes out of
 * `components/factionMarks/covenSlip` — the badge, the braid, the four-point
 * spark, the cat. That module exists because "thirteen private copies of a
 * pentagram badge is how a faction acquires a second identity again" (#1209),
 * and a fourteenth here would be that failure with a new address. Nothing under
 * `pages/editPraxis/` is written to; it is read as the reference the issue names
 * it as.
 *
 * ## The chassis is the composer's, not a second one
 *
 * `ComposerPage` / `ComposerSheet` / `ComposerSection` / `ComposerFooter` are
 * geometry with no praxis in them, so this page mounts the same blocks the
 * composer does rather than restating a sheet, a masthead slot and a footer row.
 * The CONTROLS in `editPraxis/archetypes/controls.tsx` are the half that does
 * not fit — every one of them takes an `EditPraxisState` — so the fields below
 * are plain inputs wearing the slip's `fieldBox`, which is the same geometry row
 * (radius 10, 1.5px in `-slip-border`) that file's fields wear.
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
 * `factions.json` (ADR-0038); its lower case is the lettering, not the word, so
 * it is a `textTransform` here rather than a second spelling (#1910).
 *
 * ONE FIELD-SET DEVIATION FROM THE DEFAULT, the same one `EphemeristsCreate-
 * Character` flagged. The na kit's PHONE branch deliberately carries no prose
 * fields — it is framed as "Step 1 of 2 · Identity" and has never offered `bio`,
 * with `tagline` following `bio` so the two stay a pair (#1628). This slip
 * offers all six fields at both widths, because #2351 states the field list once
 * and unconditionally, and because the two-step framing is the na phone skin's
 * own chrome rather than something the slip wears.
 *
 * ## Where the cat goes, and it is NOT the card's placement
 *
 * The mark drifts by MOUNT, so #2041's law is one placement on every surface —
 * bottom-right, tucked FULLY INSIDE, because "a face can't bleed off the card
 * the way the pentacle did". What each mount chooses is the SIZE, "by the mark's
 * weight on the page rather than by pasting that number" (`CovenProfileBody`).
 * The card mounts hang 190px at -6/-4 and clip a whisker cap; that is a card's
 * placement and this is not a card, so it is not copied. The page mounts run 240
 * (profile band, composer) to 400 (the wide detail sheet) at a 16–24px inset.
 *
 * This sheet is `ComposerSheet`'s — 720 on desktop, the phone's full width on
 * mobile — so the figure is sized to the width the sheet actually has. The
 * composer picked 240 for BOTH and said in its own note that it had "no
 * form-factor branch to size against, so the figure is the narrow one and the
 * wide sheet simply carries a quieter mark". This file has that branch, so it
 * spends it: 240 on the phone, 320 on the 720 sheet — the same ~44% of the
 * column at either width, fully inside at a 16px inset in both.
 *
 * NO ALTERNATION BRANCH, deliberately. `useGroundIsBusy` is the cards' law
 * (#2396): "a card on an ornamented ground goes plain". The three page mounts —
 * the profile body, the composer, both detail columns — do not branch, because
 * the law is explicitly about cards and this is a page body. `covenCat-
 * Alternates.test.tsx` states that division in as many words.
 *
 * ## Colour, and WHICH CANDLE
 *
 * Coven has two things a reader will call "the candle" and they are not
 * interchangeable. `.coven-candle-backdrop` / `.coven-backdrop` is the
 * candlelight WASH, and its ground is `--faction-coven-ward-page` — the page
 * stock, whose one live consumer is the mobile field desk. `--faction-coven-
 * ward-hold-*` is candle GOLD, the "you're on this task" band, minted precisely
 * so that it "never reads alike" to the pink CTA. Neither is what this page
 * wants: the sheet is ward CARD (paper laid on the wash) and the commit is the
 * pink CTA, because committing to a life is not holding a task.
 *
 * What this page does borrow from the wash is its STRENGTH.
 * `--faction-coven-ward-haze` is a number token (0.22 light / 0.28 dark) and the
 * comment beside it says why it is a token: "the two themes want the same four
 * blooms at different weights and an opacity picked in TSX is a `dark ? a : b`
 * in numeric clothing". The composer washes its two blooms at a hard 0.7, which
 * is a real miss on this ground — measured, `--faction-coven-slip-label` reads
 * 2.63:1 in light and 1.78:1 in dark under the pink bloom at that strength. So
 * the ground here runs at the haze token instead, and the readings clear:
 *
 *     ink on ward-card under…      pink bloom      lavender bloom (+ the cat)
 *     --faction-coven-slip-ink     5.98 / 7.72     6.49 / 10.22
 *     --faction-coven-slip-label   5.04 / 4.63     5.47 / 6.13
 *     --faction-coven-card-alarm   6.08 / 5.64     6.60 / 7.47
 *                                  (light / dark)
 *
 * `--faction-coven-slip-soft` is the one tier this page does NOT paint on the
 * sheet: it is 4.46:1 under the pink bloom in dark, a miss, and the page has no
 * brief for it to be. Chrome takes LABEL and everything else takes INK. Nothing
 * takes `-slip-deep` or `-slip-pk` as an ink at all — both are ornament here,
 * for the reason `covenSlip`'s own header gives. Every reading above is in
 * `__tests__/covenCreateCharacterContrast.test.ts`, measured on the COMPOSITE
 * rather than the declared token.
 *
 * Light and dark flip entirely through the `[data-theme="dark"]` cascade; there
 * is no `dark ? a : b` anywhere in this file. Motion is reached by CLASS only —
 * `.ep-spin` on the badge and `.cvn-wheel` inside `CovenCat` — so both stay
 * behind the shared `prefers-reduced-motion` guard in `index.css` (#1003).
 *
 * ## Presentation only
 *
 * `useCreateCharacter` stays the single source of state for all eight
 * archetypes. Nothing here touches the submit path, the payload, `PortraitPicker`
 * or `useAvatarPicker`, and THE PICKER STAYS VISIBLE in this skin — a player must
 * be able to change their mind, or clear the pick and be born unaffiliated,
 * which returns the page to the Default archetype.
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
  ComposerSection,
  ComposerSheet,
  ErrorBanner,
  composerBandStyle,
  composerLabelStyle,
  useComposerSizes,
} from '../../editPraxis/archetypes/shared'
import {
  BORDER,
  Braid,
  CARD,
  CHROME,
  CTA_FROM,
  CTA_INK,
  CTA_TO,
  CovenCat,
  DISPLAY,
  GOLD,
  INK,
  LABEL,
  PAGE,
  PINK,
  SHADOW,
  SigilMark,
  Spark,
} from '../../../components/factionMarks/covenSlip'

const SLUG = 'coven'

/* The three tokens `covenSlip` does not export, because no other surface needs
   them in this combination: the wash's second pigment, the banner's ink and the
   haze strength both blooms are laid at. */
const LAV = 'var(--faction-coven-slip-lav)'
/* The error ink (#1231/#1449). The banner sits straight on the sheet and the
   neutral `--color-danger` under its own veil misses AA there in light; the
   veil and the edge stay neutral, which is ADR-0061's split. */
const ALARM = 'var(--faction-coven-card-alarm)'
/* See the WHICH CANDLE note above: the wash's STRENGTH, per theme, as a number
   token rather than a figure picked here. */
const HAZE = 'var(--faction-coven-ward-haze)'
const CTA_BAND = `linear-gradient(180deg, ${CTA_FROM}, ${CTA_TO})`

/** The skin's geometry: radius 14, borders 1.5, and the sheet's edge is gold. */
const RADIUS = 14
const FIELD_RADIUS = 10
const RULE = `1.5px solid ${BORDER}`

/* ── Ornament geometry (WORLD_ZERO_STYLE §4a: not layout spacing) ── */
/** The turning badge in the masthead — the composer's 30, at the composer's 42s. */
const BADGE = 30
/** The sparks flanking the wordmark. */
const MAST_SPARK = 11
/** The spark leading the cast. */
const CAST_SPARK = 12
/** The mark each calling wears in the picker — the size every chooser draws (#2223). */
const PICKER_SIGIL = 18
/** The watermark, sized to the column it turns in. See the cat note above. */
const CAT = { desktop: 320, mobile: 240 }
/** Its inset, and its strength — the two figures every page mount already runs. */
const CAT_INSET = 16
const CAT_OPACITY = 0.09

export default function CovenCreateCharacter({ state }: { state: CreateCharacterState }) {
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

  /** Quicksand, the slip's chrome voice, over the layout's own tracking. */
  const sectionLabel: CSSProperties = { fontFamily: CHROME, color: LABEL }
  /** Radius 10, 1.5px in `-slip-border`, on the ward PAGE — the composer's row. */
  const fieldBox = {
    width: '100%',
    background: PAGE,
    color: INK,
    border: RULE,
    borderRadius: FIELD_RADIUS,
    padding: 'var(--space-md)',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: CHROME,
    fontSize: 'var(--text-content)',
  } as const

  /** The counter row under a field: quiet, and alarmed on the cap. */
  const counter = (used: number, max: number) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: CHROME, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: used >= max ? ALARM : LABEL }}>
        {t('createCharacter.charsLeft', { count: max - used })}
      </span>
    </div>
  )

  const sheetStyle = {
    background: CARD,
    border: `1.5px solid ${GOLD}`,
    borderRadius: RADIUS,
    boxShadow: SHADOW,
  }

  const masthead = (
    /* No `background`: the haze below shows through, which is what makes the
       band read as the top of one sheet rather than as a strip laid on it. */
    <ComposerMasthead
      style={{
        height: 'auto',
        padding: 'var(--space-lg) var(--space-lg) var(--space-md)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-sm)',
        }}
      >
        {/* THE TWINKLES ARE IN THE ROW, NOT BEHIND IT, and that is #1983's
            lesson taken rather than re-learned. Both shipped twinkle fields are
            absolutely-positioned `preserveAspectRatio="none"` svgs whose stars
            are a fixed FRACTION of the band while the wordmark is a centred row
            at a FIXED size — so narrowing the viewport walks a star UNDER the
            lettering, which is how one came to sit against the "c" in "cozy" and
            read as "tozy". The clearance that fixes it is arithmetic that has to
            be re-derived every time the wordmark changes. Two `Spark`s IN the
            flex row cannot collide with the lettering at any width, need no
            exclusion band, and are the kit's own ornament glyph rather than a
            third private copy of `starPath`. */}
        <Spark size={MAST_SPARK} color={GOLD} />
        {/* The badge turns once every 42 seconds. `.ep-spin` owns the motion and
            its reduced-motion guard; `--ep-spin-dur` re-times it without a
            second keyframe. The class goes on a wrapper because `SigilMark`
            takes no `className` — the drawing stays the kit's, unforked. */}
        <span
          aria-hidden
          className="ep-spin"
          style={{ display: 'block', flex: '0 0 auto', ['--ep-spin-dur' as string]: '42s' } as CSSProperties}
        >
          <SigilMark size={BADGE} />
        </span>
        <span
          style={{
            fontFamily: DISPLAY,
            fontSize: sizes.titleSize,
            lineHeight: 1,
            letterSpacing: '0.02em',
            color: INK,
            // The lower case is the lettering, not the word (#1910).
            textTransform: 'lowercase',
          }}
        >
          {factionName(SLUG)}
        </span>
        <Spark size={MAST_SPARK} color={GOLD} />
      </div>
      <Braid style={{ marginTop: 'var(--space-sm)' }} />
    </ComposerMasthead>
  )

  const ground = (
    <>
      {/* The glow and the lavender, at the composer's two anchors — but at the
          haze token's strength rather than a hard 0.7. See WHICH CANDLE above. */}
      <ComposerGround
        inset={0}
        opacity={HAZE}
        background={`radial-gradient(62% 48% at 12% 0%, ${PINK}, transparent 70%), radial-gradient(58% 46% at 100% 100%, ${LAV}, transparent 72%)`}
      />
      {/* The cat, on its own layer so it keeps its own strength instead of
          inheriting the wash's. Bottom-right and fully inside — see above. */}
      <ComposerGround inset={0}>
        <CovenCat
          size={CAT[factor]}
          style={{ right: CAT_INSET, bottom: CAT_INSET, opacity: CAT_OPACITY }}
        />
      </ComposerGround>
    </>
  )

  return (
    <ComposerPage sizes={sizes} style={{ fontFamily: CHROME, color: INK }}>
      {/* A REAL `<form>`, not a bare button with an onClick. The Default skin
          submits through one and so must this: it is what makes Enter commit
          from a text field, and what gives the browser's own required-field
          behaviour something to attach to. `handleSubmit` calls
          `preventDefault()` itself. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} ground={ground}>
          {/* NO SECOND MARK BESIDE THE HEADING. #1828 took the composer's
              status pentacle away for exactly this reason — it was "a second one
              under the sigil in the masthead directly above". The masthead is
              this sheet's one faction mark; the cat is a watermark, not a badge. */}
          <h1
            style={{
              fontFamily: DISPLAY,
              fontWeight: 600,
              fontSize: sizes.titleSize,
              lineHeight: 1.1,
              color: INK,
              margin: 0,
            }}
          >
            {t('createCharacter.heading')}
          </h1>

          {/* The life being written, live. The card dispatches its own faction
              dress, so it is already wearing this slip the moment the calling is
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
          <ComposerSection rule={false} label={t('createCharacter.nameLabel')} labelStyle={sectionLabel}>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={NAME_MAX}
              placeholder={t('createCharacter.namePlaceholder')}
              autoFocus
              style={{ ...fieldBox, fontFamily: DISPLAY, fontSize: 'var(--text-title)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: CHROME, fontSize: 'var(--text-lg)' }}>
              <span style={{ color: LABEL }}>@{handle}</span>
              <span style={{ color: displayName.length >= NAME_MAX ? ALARM : LABEL }}>
                {t('createCharacter.charsLeft', { count: NAME_MAX - displayName.length })}
              </span>
            </div>
          </ComposerSection>

          {/* About */}
          <ComposerSection rule={false} label={t('createCharacter.aboutLabel')} labelStyle={sectionLabel}>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={BIO_MAX}
              placeholder={t('createCharacter.aboutPlaceholder')}
              rows={3}
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.7 }}
            />
            {counter(bio.length, BIO_MAX)}
          </ComposerSection>

          {/* Tagline — a slogan line, not a short bio (#1628). Its counter turns
              alarm on the cap the way the name field's does: this is the field the
              profile header's identity slot is laid out against, so running out of
              room is worth seeing before the text stops appearing. */}
          <ComposerSection rule={false} label={t('createCharacter.taglineLabel')} labelStyle={sectionLabel}>
            <textarea
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={TAGLINE_MAX}
              placeholder={t('createCharacter.taglinePlaceholder')}
              rows={2}
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.7 }}
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
                reads as a browser control dropped on the slip; every other
                control here is the ward page inside a `-slip-border` rule at
                radius 10. The error ink is passed for a measured reason — see the
                prop's own note: the neutral danger red does not clear on a
                faction ground, and each archetype passes its own card alarm. */}
            <PortraitPicker
              inputRef={fileInputRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
              error={avatarError}
              buttonStyle={composerLabelStyle({
                fontFamily: CHROME,
                fontWeight: 700,
                cursor: 'pointer',
                borderRadius: FIELD_RADIUS,
                padding: 'var(--space-sm) var(--space-lg)',
                background: PAGE,
                color: INK,
                border: RULE,
              })}
              statusStyle={{ fontFamily: CHROME, color: LABEL }}
              errorStyle={{ color: ALARM }}
            />
          </ComposerSection>

          {/* Answer a calling — only when the account holds invitations (ADR-0019).
              It stays drawn in this skin: tapping the slip's own faction must not
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
                        borderRadius: FIELD_RADIUS,
                        padding: 'var(--space-md) var(--space-lg)',
                        background: selected ? CTA_BAND : PAGE,
                        border: selected ? `1.5px solid ${CTA_TO}` : RULE,
                        // The faction's own hue as a RING, never as ink (§3) —
                        // the row's type stays on the slip's measured pair.
                        boxShadow: selected ? `0 0 0 2px ${factionCssVar(slug)}` : 'none',
                      }}
                    >
                      {/* The faction's own mark, from the dispatcher every other
                          chooser draws (#2223). */}
                      <FactionSigil slug={slug} size={PICKER_SIGIL} />
                      <span
                        style={{
                          fontFamily: factionCssVar(slug, 'card-font'),
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
              <p style={{ fontFamily: CHROME, fontSize: 'var(--text-content)', color: LABEL, margin: 0, lineHeight: 1.6 }}>
                {t('createCharacter.callingHint')}
              </p>
            </ComposerSection>
          )}

          <ErrorBanner message={error ?? ''} style={{ color: ALARM }} />

          {/* THE ONE BRAID (#1707). The design calls its rule exactly once,
              immediately above the footer; every other region is parted by the
              sheet's own gap. Six braids read as a chain of dividers rather than
              as the mark that closes the page. */}
          <Braid />

          {/* [Cancel] … [Create] — the global order from #646, stacked because
              Coven's cast is a full-bleed band rather than an inline button: the
              exits read first, the band closes the sheet. */}
          <ComposerFooter
            band
            start={
              <>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  style={composerLabelStyle({
                    fontFamily: CHROME,
                    fontWeight: 700,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: LABEL,
                  })}
                >
                  {t('createCharacter.cancel')}
                </button>
                <span style={{ fontFamily: CHROME, fontSize: 'var(--text-content)', color: LABEL }}>
                  {t('createCharacter.startsAt')}
                </span>
              </>
            }
            end={
              <button
                type="submit"
                disabled={!canSubmit}
                style={{
                  ...composerBandStyle(sizes, {
                    // The one place Coven speaks in the LABEL face rather than
                    // the title one. Design band: 14 / 700 / 0.12em — 14 is the
                    // --text-xl rung exactly.
                    fontFamily: CHROME,
                    fontSize: 'var(--text-xl)',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    // The SHEET's frame, which for Coven is the gilt edge.
                    frame: GOLD,
                    color: CTA_INK,
                    background: CTA_BAND,
                  }),
                  cursor: submitting ? 'wait' : 'pointer',
                  // The dimmed disabled band is the Default's and the plate's,
                  // kept so one page does not disable in two languages. WCAG
                  // 1.4.3 exempts an inactive component from the contrast floor,
                  // which is what this is: `disabled` is set on the same line.
                  opacity: canSubmit ? 1 : 0.5,
                }}
              >
                {/* The four-point spark leading the cast — the kit's ornament
                    glyph, in the ink it sits on. */}
                <Spark size={CAST_SPARK} color={CTA_INK} />
                {submitting ? t('createCharacter.submitBusy') : t('createCharacter.submitIdle')}
              </button>
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

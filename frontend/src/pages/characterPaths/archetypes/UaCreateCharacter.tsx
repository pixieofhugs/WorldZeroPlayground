/**
 * The UA character-creation archetype — THE VELLUM LEAF, ruled for a new life
 * (#2348, epic #2346).
 *
 * NO DESIGN WAS DRAWN FOR THIS, and none was needed: the owner's ruling is that
 * the two surfaces UA already ships carry the whole register between them.
 * `components/taskCard/UaTaskCard` holds the ground, inks, rules and faces;
 * `pages/editPraxis/archetypes/UaEditPraxis` holds the same kit applied to a
 * FORM — labelled fields, counters, a primary commit, a cancel path — which is
 * structurally what this page is. This file is that dress over this page's
 * fields, and it draws no new mark: the lotus and the ensō are the two the
 * practice already has (WORLD_ZERO_STYLE §6, "one primitive").
 *
 * ## The chassis is the composer's, not a second one
 *
 * `ComposerPage` / `ComposerSheet` / `ComposerSection` / `ComposerRule` /
 * `ComposerFooter` / `ErrorBanner` are geometry with no praxis in them, so this
 * page mounts the same blocks `UaEditPraxis` does rather than restating a sheet
 * and a footer row. The CONTROLS in `editPraxis/archetypes/controls.tsx` are the
 * half that does not fit — every one of them takes an `EditPraxisState` — and so
 * is `bodyEditorTheme.ts`, which themes a CodeMirror this page has no equivalent
 * of. The fields below are therefore plain inputs wearing `fieldBox`, which is
 * the same geometry row (`radius 7`, a 1px neutral hairline, the inset panel)
 * that file's fields wear.
 *
 * Nothing under `pages/editPraxis/` is written to. It is read as the reference
 * the issue names it as.
 *
 * ## UA draws no masthead
 *
 * It is the one faction in the set with no top band — the GROUND carries the
 * identity instead, so `ComposerSheet` gets a `ground` and no `masthead`. That
 * absence is the dress decision the composer already made, not an omission here.
 *
 * The ground is the composer's, element for element: a lotus bleeding off the
 * top-left corner and an ensō off the bottom-right, both clipped by
 * `ComposerSheet`'s own `overflow: hidden` (#1028). The ensō turns on `.ep-spin`
 * at 200s, re-timed through the shared `--ep-spin-dur` hook rather than a second
 * keyframe. It is a CLASS: the keyframes live in `index.css` behind the
 * `prefers-reduced-motion` guard, and an inline `animation:` would bypass that
 * guard (#1003). Nothing was added to `index.css` for this file.
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
 * commit / cancel.
 *
 * ONE FIELD-SET DEVIATION FROM THE DEFAULT, the same one `EphemeristsCreateCharacter`
 * flagged and for the same reason. The na kit's PHONE branch deliberately carries
 * no prose fields — it is framed as "Step 1 of 2 · Identity" and has never
 * offered `bio`, with `tagline` following `bio` so the two stay a pair (#1628).
 * This leaf offers all six fields at both widths, because #2348 states the field
 * list once and unconditionally, and because the two-step framing is the na
 * phone skin's own chrome rather than something the leaf wears.
 *
 * ## Colour
 *
 * Every value is a `--faction-ua-*` token, so both themes come from the
 * `[data-theme="dark"]` cascade and no theme ternary stands in for it (#851's
 * standing guard). `--faction-ua-glow` is ORNAMENT — the ensō stroke and the
 * lotus wash — and never an ink.
 *
 * The error banner takes `--faction-ua-card-alarm` rather than the neutral
 * `--color-danger`, which is the same deviation `UaEditPraxis` keeps and for the
 * same measured reason: the neutral ink is 3.71:1 under its own veil on this
 * sheet in light (#1231).
 *
 * The pairings this page introduces are measured in
 * `__tests__/uaCreateCharacterContrast.test.ts` on the COMPOSITE — the sheet
 * under the lotus wash, not the bare `-card-bg` token.
 *
 * ## Presentation only
 *
 * `useCreateCharacter` stays the single source of state for every archetype.
 * Nothing here touches the submit path, the payload, `PortraitPicker` or
 * `useAvatarPicker`, and THE PICKER STAYS VISIBLE in this skin — a player must
 * be able to change their mind, or clear the pick and be born unaffiliated,
 * which returns the page to the Default archetype.
 *
 * NO FIELD LABELS, AND THAT IS RULED RATHER THAN MISSING (#2793). This form is
 * placeholder-only: the name, bio and catchphrase boxes carry their own words
 * ("Character name", "Character bio", "Character Catchphrase"), shared with
 * Edit Character so the two surfaces speak one vocabulary. `namedField()` sets
 * `aria-label` from that same string, because here the visible label WAS the
 * accessible name and deleting it without one is a regression, not a
 * simplification. `ComposerSection` draws no heading row when no `label` is
 * passed, so the field sections are bare frames around their controls.
 */
import { useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionCssVar, factionName } from '../../../utils/factions'
import { factionRoleVars } from '../../../utils/factionRoles'
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

/* The practice's inks, named for the ROLE each plays — the same constants, the
 * same tokens, as `UaEditPraxis` names. Every one carries both themes. */
const SHEET = 'var(--leaf-create-character-paper)' /* the sun-bleached sheet */
const FIELD = 'var(--faction-ua-panel)' /* inset panel — fields, wells */
const INK = 'var(--leaf-create-character-ink)'
/* THE QUIET TIER IS `-card-body`, NOT `-card-muted`, AND THAT IS MEASURED (#2348).
 *
 * `UaEditPraxis` sets its labels, counters and exits in `--faction-ua-card-muted`
 * and this file started as a copy of that. On the BARE sheet muted is right —
 * 5.45 light / 5.64 dark, and `factionContrast.test.ts` measures exactly that.
 * But this sheet is not bare: `ComposerGround` washes the lotus and the ensō
 * over it at `--faction-ua-card-lotus-opacity`, and on that COMPOSITE muted
 * reads 4.38 / 3.79 — under AA in both themes. `-card-body` is the same family
 * one rung up and reads 5.74 / 6.78 there, so the quiet type takes it. Every
 * number is in `__tests__/uaCreateCharacterContrast.test.ts`.
 *
 * This is §3's "same ink, second ground", not a preference: nothing about the
 * ink changed, the ground gained a layer. The FIELDS keep muted's own tier
 * available because `--faction-ua-panel` is opaque and sits above the wash —
 * but nothing on this page needs it, so the constant is not declared. */
const BODY = 'var(--faction-ua-card-body)'
const ACCENT = 'var(--leaf-create-character-accent)' /* the design's accentDeep */
const RULE = 'var(--faction-ua-rule)' /* the neutral hairline */
const HAIR = 'var(--faction-ua-hair)' /* the faintest divider, below -rule */
const FILL = 'var(--leaf-create-character-fill)'
const ON_FILL = 'var(--leaf-create-character-on-fill)'
const ALARM = 'var(--faction-ua-card-alarm)'

/** Geometry the kit pins: radius 7, a 2px border. Ornament, not spacing. */
const RADIUS = 7
const BORDER_WIDTH = 2

/** The ensō's turn, re-timed off the shared `--ep-spin-dur` hook. */
const GROUND_SPIN = '200s'

/** The mark each calling wears in the picker — the size every other chooser draws (#2223). */
const PICKER_SIGIL = 18

export default function UaCreateCharacter({ state }: { state: CreateCharacterState }) {
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

  /* Ornament geometry, in raw px because a drawn figure is neither type nor
   * spacing (WORLD_ZERO_STYLE §4a). The phone gets the same two marks, smaller
   * and pulled in — conditional ornament, not a second layout. The numbers are
   * the composer's own pair, unchanged. */
  const groundGeometry = sizes.isMobile
    ? { lotus: 300, lotusLeft: -122, lotusTop: -94, enso: 208, ensoRight: -66, ensoBottom: -58 }
    : { lotus: 420, lotusLeft: -170, lotusTop: -130, enso: 300, ensoRight: -96, ensoBottom: -84 }

  /* The label tier's face and colour are the skin's; its geometry (uppercase,
   * 0.14em, --text-lg) is the layout's and is inherited untouched. */
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

  /** The counter row under a field: quiet, and alarmed on the cap. */
  const counter = (used: number, max: number) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: UA_TEXT, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: used >= max ? ALARM : BODY }}>
        {t('createCharacter.charsLeft', { count: max - used })}
      </span>
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
        style={{
          position: 'absolute',
          left: groundGeometry.lotusLeft,
          top: groundGeometry.lotusTop,
        }}
      />
      {/* The ensō turns once every 200s — re-timed through the shared hook, so
          no second keyframe and no inline `animation:`. This is the FACTION
          mark, the ensō's one sanctioned use here: there is no score on this
          page for it to carry, and the count of drawn marks stays at two. */}
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
        /* The nine roles under this surface's prefix (#2659/#2673).
           `ComposerPage` puts this style on its own root div, which is the
           whole page, so the module constants above resolve inside it. */
        ...factionRoleVars('ua', 'leaf-create-character'),
        fontFamily: UA_TEXT,
        color: INK,
      }}
    >
      {/* A REAL `<form>`, not a bare button with an onClick. The Default skin
          submits through one and so must this: it is what makes Enter commit
          from a text field, and what gives the browser's own required-field
          behaviour something to attach to. `handleSubmit` calls
          `preventDefault()` itself. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        {/* `reserveHead` (#2995) AND NO BAND, WHICH IS THE ONE ASYMMETRY IN
            THIS PASS. The head is reserved here for the same reason it is on
            every other kit — this page reskins live on the calling being
            picked, and the picker cannot stand still while each kit starts its
            column under a masthead of its own height — but the owner's band
            ruling was scoped to Propose a Task, so the comment above `ground`
            stands and no band is swept in by inference. That leaves this sheet
            opening on 96px of its own lotus ground, which is the one thing on
            the eyeball list for this kit. If it reads as a hole, the fix is
            `UaProposeTask`'s: mount the shipped `UaBand`, in a pass that says
            so. */}
        <ComposerSheet sizes={sizes} style={sheetStyle} reserveHead ground={ground}>
          {/* The page's own question, in the practice's display cut. The leaf
              draws no mark beside it: the ensō in the ground is already the
              faction mark, and a second one here would be the third drawn
              figure on a sheet whose whole voice is quiet. */}
          <h1
            style={{
              fontFamily: UA_DISPLAY,
              fontWeight: 600,
              fontSize: sizes.titleSize,
              color: INK,
              lineHeight: 1.1,
              margin: 0,
              // The chassis' heading floor (#2995), the second shared term.
              minHeight: sizes.headingHeight,
            }}
          >
            {t('createCharacter.heading')}
          </h1>

          {/* The life being written, live. The card dispatches its own faction
              dress, so it is already wearing this leaf the moment the calling is
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
          <ComposerSection rule={false}>
            <input
              data-composer-field
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={NAME_MAX}
              {...namedField(t('character.namePlaceholder'))}
              autoFocus
              style={{ ...fieldBox, fontFamily: UA_DISPLAY, fontWeight: 600 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: UA_TEXT, fontSize: 'var(--text-lg)' }}>
              <span style={{ color: BODY }}>@{handle}</span>
              <span style={{ color: displayName.length >= NAME_MAX ? ALARM : BODY }}>
                {t('createCharacter.charsLeft', { count: NAME_MAX - displayName.length })}
              </span>
            </div>
          </ComposerSection>

          {/* About */}
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

          {/* Tagline — a slogan line, not a short bio (#1628). Its counter turns
              alarm on the cap the way the name field's does: this is the field
              the profile header's identity slot is laid out against, so running
              out of room is worth seeing before the text stops appearing. */}
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

          {/* Portrait — the shared picker owns the hidden input and the "what's
              chosen" readout (#1149); the credential card above opens the same
              input through `fileInputRef`. Dressed rather than left in site
              chrome: `.btn-outline` brings its own near-white ground and neutral
              ink, which reads as a browser control dropped on the leaf. The
              error ink is passed for the measured reason the banner's is. */}
          <ComposerSection
            rule={false}
            label={
              <>
                {t('character.portrait')}{' '}
                <span style={{ textTransform: 'none', letterSpacing: 0 }}>{t('createCharacter.optional')}</span>
              </>
            }
            labelStyle={labelStyle}
          >
            <PortraitPicker
              inputRef={fileInputRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
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
          </ComposerSection>

          {/* Answer a calling — only when the account holds invitations (ADR-0019).
              It stays drawn in this skin: tapping the leaf's own faction must not
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
              labelStyle={labelStyle}
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
                         below. A calling wears its OWN card face at its own
                         case, which is what every other chooser draws. */
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        width: '100%',
                        cursor: 'pointer',
                        textAlign: 'left',
                        borderRadius: RADIUS,
                        padding: 'var(--space-md) var(--space-lg)',
                        background: selected ? FILL : FIELD,
                        border: `1px solid ${selected ? FILL : RULE}`,
                        // The faction's own hue as a RING, never as ink (§3) —
                        // the row's type stays on the leaf's measured pair.
                        boxShadow: selected ? `0 0 0 2px ${factionCssVar(slug)}` : 'none',
                      }}
                    >
                      {/* The faction's own mark, from the dispatcher every other
                          chooser draws (#2223). Selected, the ground becomes
                          FILL — this kit's own fill, not the offered slug's —
                          so the mark has to move to this kit's `onFill` ink
                          the same way the label beside it already does
                          (#2852). */}
                      <FactionSigil slug={slug} size={PICKER_SIGIL} color={selected ? ON_FILL : undefined} />
                      <span
                        style={{
                          fontFamily: factionCssVar(slug, 'card-font'),
                          fontSize: 'var(--text-content)',
                          color: selected ? ON_FILL : INK,
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
                  fontFamily: UA_TEXT,
                  fontStyle: 'italic',
                  fontSize: 'var(--text-content)',
                  color: BODY,
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                {t('createCharacter.callingHint')}
              </p>
            </ComposerSection>
          )}

          <ErrorBanner message={error ?? ''} style={{ color: ALARM }} />

          {/* The leaf's faintest rule, drawn ONCE above the footer (#1707) — the
              same `-hair` the task card rules its two divisions with. */}
          <ComposerRule style={{ background: HAIR }} />

          {/* [Cancel] … [Create] — the global order from #646, with the cast as a
              full-bleed band (#1828), which is what UA's composer already casts
              through. */}
          <ComposerFooter
            band
            start={
              <>
                <button
                  type="button"
                  onClick={() => navigate('/')}
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
                <span style={{ fontFamily: UA_TEXT, fontSize: 'var(--text-content)', color: BODY }}>
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
                    fontFamily: UA_TEXT,
                    /* The composer's band: 13 / 600 / 0.14em. 13 sits between
                       the label rung (12) and --text-xl (14); the band takes the
                       rung ABOVE the label it has to outrank (§4a). 600 rather
                       than 500 because `index.html` loads EB Garamond at 400 and
                       600 only, and CSS font matching resolves a requested 500
                       DOWN to 400 (`fontsLoaded.test.ts`, #1294). */
                    fontSize: 'var(--text-xl)',
                    fontWeight: 600,
                    frame: ACCENT,
                    color: ON_FILL,
                    background: FILL,
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

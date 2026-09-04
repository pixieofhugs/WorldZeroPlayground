/**
 * The Singularity character-creation archetype — A LIFE, COMPILED (#2353, epic
 * #2346).
 *
 * NO DESIGN WAS DRAWN FOR THIS, and none was needed: the owner's ruling is that
 * the two surfaces this faction already ships carry the whole register between
 * them. `components/taskCard/SingularityTaskCard` holds the chassis, the window
 * chrome, the standing raster and the travelling sweep;
 * `pages/editPraxis/archetypes/SingularityEditPraxis` holds the same terminal
 * applied to a FORM — labelled fields, counters, a primary commit, a cancel path
 * — which is structurally what this page is. This file is that dress over this
 * page's fields, and it draws no new SVG at all: the window bar's lamp cluster
 * is `components/factionMarks/SingularityLamps` (WORLD_ZERO_STYLE §6, "one
 * primitive").
 *
 * ## The chassis is the composer's, not a second one
 *
 * `ComposerPage` / `ComposerSheet` / `ComposerSection` / `ComposerFooter` are
 * geometry with no praxis in them, so this page mounts the same blocks the
 * composer does rather than restating a sheet, a window bar and a footer row.
 * The CONTROLS in `editPraxis/archetypes/controls.tsx` are the half that does
 * not fit — every one of them takes an `EditPraxisState` — so the fields below
 * are plain inputs inside this skin's own readout box, which is the same
 * geometry (`radius 2`, `1px` frame, `-term-panel` fill) that file's fields
 * wear. Nothing under `pages/editPraxis/` is written to.
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
 * commit / cancel. Two strings are UNTRANSLATED and that is deliberate:
 * `character.new` on the window bar and the `>` before the heading are ORNAMENT,
 * in the same class as the three lamps beside them — marks that happen to be
 * made of glyphs (WORLD_ZERO_STYLE §4, "role vocabulary"). They are module
 * constants rather than JSX text so they read as identifiers to
 * `i18next/no-literal-string`, which is the shape `SingularityEditPraxis`'s
 * `praxis.proc` and `[ok]` already use, and both sit inside `aria-hidden` chrome
 * so neither is announced.
 *
 * ## Colour — and the one rule that is this surface's own
 *
 * Every value is a `--faction-singularity-term-*` token, never a ternary and
 * never a `dark ?` branch. The family is NOT theme-invariant even though both
 * its halves are near-black (§6): the chassis stays black and the cascade flips
 * the PHOSPHOR. The one exception is the lamp trio, which is the kit's own
 * theme-invariant `--faction-singularity-led-*` (#1979) and lives in the mark.
 *
 * `-term-dim` — the family's caption tier, and what every other Singularity
 * surface labels with — IS A PANEL INK HERE AND NEVER A CHASSIS ONE. That is
 * measured, not stylistic. `ComposerSheet` paints the ground at `zIndex: 0` and
 * the content column at `zIndex: 1`, so type drawn straight on the chassis has
 * the standing raster AND the travelling scan band between it and the paint
 * `factionContrast.test.ts` measured it against. On that composite `-term-dim`
 * falls from 5.03 / 5.80 to 4.12 / 4.20 — under AA, on a token that passes flat.
 * So the chassis carries only `-term-ink` (6.82 / 8.11) and `-term-bright`
 * (8.92 / 10.06), the raised panel carries the quiet tier, and
 * `__tests__/singularityCreateCharacterGround.test.ts` holds all of it as
 * measurements rather than as this paragraph. It also pins the invariant
 * mechanically: an element inked `-term-dim` must declare `-term-panel` (or the
 * window bar's `-term-chrome`) as its own background, which is why the process
 * name below repaints the ground it already stands on.
 *
 * The error banner and the avatar error take `--faction-singularity-card-alarm`
 * rather than the neutral `--color-danger`, which is the same deviation
 * `SingularityEditPraxis` keeps and for the same measured reason (#1302). The
 * veil and the edge stay neutral — ADR-0061.
 *
 * ## Motion — two classes, no inline `animation:`
 *
 * `.sg-scan` on the travelling band and `.sg-cursor` on the block cursor after
 * the cast. Both are the FACTION's own (the task card draws the same pair)
 * rather than the composer kit's `.ep-*`, per §6's "a faction's ornament is one
 * primitive, not one per surface"; both live in `motion.ornament.css` behind the
 * shared `prefers-reduced-motion` guard, and an inline `animation:` would bypass
 * it (#1003). This file touches no stylesheet.
 *
 * ## Not built as the composer draws it, and why
 *
 * - **No process light.** `SingularityProcessLight` says a session is UP; there
 *   is no process here, and no character yet. The bar this page wears is the
 *   feed frame's and the card band's — lamps plus a name — rather than the
 *   composer's.
 * - **The fields keep the browser's focus ring.** `SingularityEditPraxis` and
 *   the Ephemerists plate both set `outline: none` on their field boxes; this
 *   one does not, because the ring is the only focus indicator a keyboard
 *   reaches these six controls with. The frame is on the readout box, so the
 *   ring has room to draw inside it.
 * - **There are no field labels, and that is ruled rather than missed.** #2793
 *   deletes every visible label on both character forms: the fields carry their
 *   own words instead, and `namedField()` puts that same string on `aria-label`
 *   so the accessible name the `<label for>` used to supply survives the
 *   deletion. `ComposerSection` draws no heading row when no `label` is passed,
 *   so the three sections are now bare frames around their controls.
 *
 * ## Presentation only
 *
 * `useCreateCharacter` stays the single source of state for every archetype.
 * Nothing here touches the submit path, the payload, `PortraitPicker` or
 * `useAvatarPicker`, and THE PICKER STAYS VISIBLE in this skin — a player must
 * be able to change their mind, or clear the pick and be born unaffiliated,
 * which returns the page to the Default archetype.
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

/* The terminal's two-theme contract (#1023/#1034), named for the ROLE each plays
   rather than for its colour. Both halves are near-black and the cascade flips
   the phosphor — see the header. */
const CHASSIS = 'var(--faction-singularity-term-bg)'
const CHROME = 'var(--faction-singularity-term-chrome)'
/** The raised box: every field, the portrait key, an unpicked calling. */
const PANEL = 'var(--faction-singularity-term-panel)'
const INK = 'var(--faction-singularity-term-ink)'
/** Titles and the lit key's edge. */
const BRIGHT = 'var(--faction-singularity-term-bright)'
/** The caption tier — PANEL ONLY on this surface. See the header. */
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

/* Share Tech Mono, for the title, the body AND the label — the whole surface is
   one face. Reached through the faction's own accessor rather than through
   --font-faction-terminal directly, which is what §4 asks for when the face IS
   the faction's. */
const FACE = 'var(--sg-path-face)'

/** The design's geometry: radius 2, borderW 1. A terminal has square corners. */
const RADIUS = 2
/** The travelling band's depth, and the sweep's overhang. Ornament (§4a). */
const SWEEP_HEIGHT = 38
/** The mark each calling wears in the picker — the size every chooser draws (#2223). */
const PICKER_SIGIL = 18

/* Ornament, not copy — see the header. Module constants so they reach JSX as
   identifier expressions rather than as literal text. */
const PROC_NAME = 'character.new'
const PROMPT = '>'

/** The composer's label tier in the terminal's face, on the chassis's own ink. */
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

  /** The readout box: a lit panel inside a hard 1px frame. */
  const boxStyle: CSSProperties = {
    background: PANEL,
    border: `1px solid ${BORDER}`,
    borderRadius: RADIUS,
    // So the footer strip's own edge cannot poke past the frame's corners.
    overflow: 'hidden',
  }

  /* The field itself is borderless INSIDE that box — the frame belongs to the
     readout, not to the control. No `outline: none`: see the header. */
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

  /**
   * The readout's foot: the quiet line, INSIDE the panel.
   *
   * This is where `-term-dim` lives on this surface and the only place it may —
   * the strip declares the panel as its own background, which is both the ground
   * the ink was measured on and what makes the rule machine-checkable (header,
   * and `singularityCreateCharacterGround.test.ts`).
   */
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
    /* The window bar. `ComposerMasthead` is a 3px band by default; the skin
       gives it its own height and padding through `style`, which is spread
       last. Its whole content is aria-hidden chrome. */
    <ComposerMasthead
      background={CHROME}
      style={{
        height: 'auto',
        padding: 'var(--space-sm) var(--space-lg)',
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <div aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        {/* The lamp cluster — the kit's since #1979, drawn once for all six of
            this faction's window bars. No process light beside it: see the
            header for why a page with no session does not claim one. */}
        <SingularityLamps />
        <span
          style={composerLabelStyle({
            fontFamily: FACE,
            // The bar's own ground, restated on the ink that stands on it —
            // a no-op paint that makes the dim-ink rule checkable.
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
    /* The standing raster, at inset 0 — a fixed scrim, so unlike a drifting
       wash it neither travels nor overhangs. The band rides inside it and
       overhangs horizontally instead, so its soft ends never show against the
       sheet's edges. */
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
    <ComposerPage sizes={sizes} style={{ ...factionRoleVars('singularity', 'sg-path'), fontFamily: FACE, color: INK }}>
      {/* A REAL `<form>`, not a bare button with an onClick. The Default skin
          submits through one and so must this: it is what makes Enter commit
          from a text field, and what gives the browser's own required-field
          behaviour something to attach to. `handleSubmit` calls
          `preventDefault()` itself. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        {/* `reserveHead` (#2995): the bar keeps its own height — the reserved
            box says where the column STARTS, never how tall a kit's chrome is.
            Numbers in `useComposerSizes`. */}
        <ComposerSheet
          sizes={sizes}
          style={sheetStyle}
          masthead={masthead}
          reserveHead
          ground={ground}
        >
          {/* The prompt, and the page's own question — the heading this surface
              has always asked, inside the chassis' floor (#2995). */}
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

          {/* The life being compiled, live. The card dispatches its own faction
              dress, so it is already wearing this terminal the moment the
              calling is picked — the same value this whole page reskins on. */}
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

          {/* About */}
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

          {/* Tagline — a slogan line, not a short bio (#1628). Its counter turns
              alarm on the cap the way the name field's does: this is the field
              the profile header's identity slot is laid out against, so running
              out of room is worth seeing before the text stops appearing. */}
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

          {/* Portrait — the shared picker owns the hidden input and the "what's
              chosen" readout (#1149); the credential card above opens the same
              input through `fileInputRef`. Its key is dressed as a panel rather
              than left in `.btn-outline`, which brings a near-white
              `--color-bg-surface` ground that reads as browser chrome dropped on
              a black chassis. The error ink is passed for a measured reason —
              the neutral danger red is 3.42:1 to 3.54:1 on the grounds this
              control is mounted on (see the prop's own note). */}
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

          {/* Answer a calling — only when the account holds invitations
              (ADR-0019). It stays drawn in this skin: tapping the terminal's own
              faction must not be a one-way door, and clearing the pick returns
              the page to the Default archetype. */}
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
                      /* NOT the label tier — it forces `uppercase` and its own
                         tracking, and both would be inherited by the name below.
                         A calling wears its OWN card face at its own case, which
                         is what every other chooser draws. The picked row is the
                         terminal's LIT KEY — the same active state the
                         composer's mode picker wears. */
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
                      {/* The faction's own mark, from the dispatcher every other
                          chooser draws (#2223). Selected, the ground becomes
                          CTA_BG — this kit's own fill, not the offered slug's
                          — so the mark has to move to this kit's `onFill` ink
                          the same way the label beside it already does
                          (#2852). */}
                      <FactionSigil slug={slug} size={PICKER_SIGIL} color={selected ? CTA_INK : undefined} />
                      <span
                        style={{
                          // The PICKED faction's own face, by role (#2675).
                          // A dynamic slug, so this is the map's other half:
                          // the prefix above is Singularity's ground and this
                          // asks a different faction for one value of its own.
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

          {/* The footer's own divider — a dashed hair, drawn ONCE above the
              footer (#1707) rather than at the head of every section; the
              sheet's gap parts the regions. */}
          <ComposerRule style={{ height: 0, background: 'none', borderTop: `1px dashed ${HAIR}` }} />

          {/* [Cancel] … [Create] — the global order from #646, with the cast as a
              full-bleed band flush to the chassis's bottom edge (#1828). */}
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
                /* The second class is the ONE disabled override in the app
                   (#2486). `--faction-singularity-term-bg` is #07130c in the
                   LIGHT cascade — this chassis does not flip — so the house
                   neutral would lay a pale slab on a black terminal and the
                   disabled control would read as the loudest thing on the page.
                   `.sg-control-off` re-points the pair at this kit's own panel
                   and dim ink; it declares no paint of its own, so what
                   disabled LOOKS like is still said in exactly one rule. */
                className="control-off sg-control-off"
                style={{
                  ...composerBandStyle(sizes, {
                    /* 13 in the terminal's own band sits between the label rung
                       (12) and --text-xl (14); the band takes the rung above the
                       label it has to outrank (§4a). */
                    fontFamily: FACE,
                    fontSize: 'var(--text-xl)',
                    letterSpacing: '0.1em',
                    frame: BORDER,
                    color: CTA_INK,
                    background: CTA_BG,
                    /* The terminal's own CTA halo — `none` in light, real in
                       dark, straight off the token. */
                    boxShadow: CTA_GLOW,
                  }),
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {submitting ? t('createCharacter.submitBusy') : t('createCharacter.submitIdle')}
                {/* The prompt's block cursor, trailing the word. `.sg-cursor`
                    carries the reduced-motion-guarded blink; stilled it stays
                    drawn, because it is punctuation on the prompt and not an
                    indicator. */}
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

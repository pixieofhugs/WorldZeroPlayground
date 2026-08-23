/**
 * The Everymen character-creation archetype — THE ENLISTMENT PAPER (#2352,
 * epic #2346).
 *
 * NO DESIGN WAS DRAWN FOR THIS, and none was needed: the owner's ruling is that
 * the two surfaces this faction already ships carry the whole register between
 * them. `components/taskCard/EverymenTaskCard` holds the ground, inks, rules and
 * faces; `pages/editPraxis/archetypes/EverymenEditPraxis` holds the same kit
 * applied to a FORM — labelled fields, counters, a primary commit, a cancel path
 * — which is structurally what this page is. This file is that dress over this
 * page's fields, and it draws NO NEW GEOMETRY AT ALL: the cog is
 * `factionMarks/everymenCogs` and the ray burst is `.em-burst` in `index.css`
 * (WORLD_ZERO_STYLE §6, "one primitive"; #2121 and #2195 are the two rulings
 * that made both shared).
 *
 * The union files a work order to start a job. Starting a LIFE is the same act
 * one rung earlier, so the sheet is the same broadsheet with the same masthead
 * and the same bar across the foot; only the fields differ.
 *
 * ## The chassis is the composer's, not a second one
 *
 * `ComposerPage` / `ComposerSheet` / `ComposerMasthead` / `ComposerSection` /
 * `ComposerRule` / `ComposerFooter` / `ErrorBanner` are geometry with no praxis
 * in them, so this page mounts the same blocks the composer does rather than
 * restating a sheet, a masthead slot and a footer row. The CONTROLS in
 * `editPraxis/archetypes/controls.tsx` are the half that does not fit — every
 * one of them takes an `EditPraxisState` — so the fields below are plain inputs
 * wearing this kit's `fieldBox`, which is the same plate (`radius 0`, `2px`
 * printed rule, panel stock) that file's fields wear. Nothing under
 * `pages/editPraxis/` is written to; it is read as the reference the issue names
 * it as.
 *
 * They do carry `data-composer-field`, which is the one thing the Ephemerists
 * plate does not. That attribute is the composer's shared focus ring (#2266,
 * `[data-composer-field]:focus-visible` in `index.css`) — `currentColor` at a
 * negative offset, so it costs no token and needs no measurement. It is free
 * here and a keyboard user has no other ring on this sheet.
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
 * `factions.json`, which is what `EverymenEditPraxis` and `EverymenTaskDetail`
 * put there under ADR-0057's neutral-copy rule — a shared datum, not a union
 * voice. `FILE YOUR REPORT` and its near-synonyms were deleted by #1187 and are
 * not coming back through a new surface.
 *
 * ONE FIELD-SET DEVIATION FROM THE DEFAULT, inherited from #2347 rather than
 * decided here. The na kit's PHONE branch carries no prose fields — it is framed
 * "Step 1 of 2 · Identity" and has never offered `bio` (#1628). This plate
 * offers all six fields at both widths, because #2352 states the field list once
 * and unconditionally and the two-step framing is the na phone skin's own chrome.
 * An Everymen player on a phone is therefore offered `about` and `tagline` at
 * creation where an unaffiliated one is not. Flagged in the PR, not settled here.
 *
 * ## Colour
 *
 * The `--everymen-*` family and the `-bill-` / `-sheet-` roles the v2 task card
 * and the work order already minted. Nothing new is declared. Two pairings decide
 * where red may be ink, and they are `EverymenEditPraxis`'s, verbatim:
 *
 * - The SHEET is `--everymen-paper`, on which `--faction-everymen-sheet-accent`
 *   pays only 4.49:1. On the paper red is a rule, a fill and a mark — never a
 *   label.
 * - Every plate — the fields, the calling rows, the portrait button — is
 *   `--faction-everymen-sheet-panel`, the stock that accent was MEASURED on.
 *
 * `--faction-everymen-composer-frame` IS the sheet's frame and is NOT the card
 * register: it is a poster frame (gold by day, deep red by night) at 1.87:1 on
 * the paper, carrying no text and bounding no control. Everything INSIDE the
 * sheet is ruled in `--everymen-frame`, which is ink. The two are one token
 * apart and swapping them puts a form boundary on a value that was never
 * measured as one.
 *
 * THE QUIET RUNG IS `--everymen-quiet`, NOT `--everymen-muted`, and that is this
 * file's one deviation from the work order. `.em-burst` washes two corner glows
 * and a ray fan over the paper before any word is drawn, and measured on THAT
 * ground the muted brown is 4.26:1 under the gold corner and 4.09:1 under the
 * olive, where it reads 5.09:1 flat. `--everymen-quiet` is #1173's sibling rung
 * for exactly this — the muted role one stock further down — and clears both
 * (4.78 / 4.58). In dark it aliases straight back to `--everymen-muted`, so
 * nothing moves at night. All of it is measured in
 * `__tests__/everymenCreateCharacterContrast.test.ts`; the same near-miss is
 * inherited by `EverymenEditPraxis`, which is flagged rather than repainted from
 * here.
 *
 * Light/dark flips through the `[data-theme="dark"]` cascade. There is no
 * `dark ?` branch in this file.
 *
 * ## Motion
 *
 * The masthead's two cogs counter-turn (`ep-spin` against `ep-spin-rev`) and the
 * stage cog turns forward, exactly as the work order's do. All three are
 * CLASSES: the keyframes live in `index.css` behind the shared
 * `prefers-reduced-motion` guard, and an inline `animation:` would bypass it
 * (#1003). Only the period rides inline, through `--ep-spin-dur`.
 *
 * ## Presentation only
 *
 * `useCreateCharacter` stays the single source of state for every archetype.
 * Nothing here touches the submit path, the payload, `PortraitPicker` or
 * `useAvatarPicker`, and THE PICKER STAYS VISIBLE in this skin — a player must
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

const SLUG = 'everymen'

/* ── The sheet's palette, named for the ROLE each colour plays. The same names
 *    and the same tokens as `EverymenEditPraxis`, so the two surfaces cannot
 *    drift; see the header for which reds may be ink and on what. ── */
/** The newsprint the paper is printed on — the faction's own card ground. */
const PAPER = 'var(--everymen-paper)'
/** The pasted-on plate: every field, every calling row, the portrait button. */
const PANEL = 'var(--faction-everymen-sheet-panel)'
/** Text ink. FLIPS with the paper — deliberately not `--everymen-ink`. */
const INK = 'var(--everymen-paper-text)'
/** Quiet ink ON THE WASHED PAPER. See the header for why it is not `-muted`. */
const QUIET = 'var(--everymen-quiet)'
/** Red as a RULE or a FILL. Never as text on {@link PAPER}. */
const RED = 'var(--everymen-red)'
/** The printed rule around a plate. NOT `--everymen-ink`, which vanishes dark. */
const FRAME = 'var(--everymen-frame)'
/** The SHEET's own frame: gold by day, deep red by night. A poster frame. */
const SHEET_FRAME = 'var(--faction-everymen-composer-frame)'
/** The masthead bar, theme-INVARIANT: a life begun at night is the same life. */
const MAST = 'var(--faction-everymen-bill-mast)'
const MAST_INK = 'var(--faction-everymen-bill-mast-ink)'
/** The full-width bar at the foot of the sheet, and a picked calling's fill. */
const BAR = 'var(--faction-everymen-bill-cta-bg)'
const BAR_INK = 'var(--faction-everymen-bill-cta-ink)'
const PAPER_DEEP = 'var(--everymen-paper-deep)'
const SHADOW = 'var(--faction-everymen-bill-shadow)'
/** #1449's alarm rung, measured on this paper. Not the neutral `--color-danger`. */
const ALARM = 'var(--faction-everymen-card-alarm)'

const BEBAS = 'var(--faction-everymen-card-font)' /* Bebas Neue */
const COURIER = 'var(--font-body)' /* Courier Prime */

/** The cogs' period, the work order's own 22s. Ornament timing. */
const COG_PERIOD = '22s'

/* ── Ornament geometry (WORLD_ZERO_STYLE §4a: not layout spacing) ── */
/** The masthead pair, at the size the work order's nameplate turns them. */
const MAST_COG = 16
/** The stage cog beside the page's question. */
const STAGE_COG = { desktop: 40, mobile: 32 }
/** The mark each calling wears in the picker — the size every chooser draws (#2223). */
const PICKER_SIGIL = 18

export default function EverymenCreateCharacter({ state }: { state: CreateCharacterState }) {
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

  /**
   * Bebas, struck in tracked caps — every label and headline on the paper.
   *
   * 13px and 0.2em are this kit's OWN label metrics (#1828/#1830): the design
   * draws the Everymen label a size larger than the other seven, and
   * `composerLabelStyle`'s 12 is a default rather than a ceiling. 13 falls
   * between --text-lg and --text-xl and takes the louder rung.
   */
  const stencil = (overrides: CSSProperties = {}): CSSProperties =>
    composerLabelStyle({
      fontFamily: BEBAS,
      fontSize: 'var(--text-xl)',
      letterSpacing: '0.2em',
      ...overrides,
    })

  /** Section heads sit on the paper, in its own ink. Red is never a label here. */
  const sectionLabel = stencil({ color: INK })

  /** A plate: panel stock inside the printed frame rule. Radius 0 throughout. */
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

  /** The counter row under a field: quiet, and alarmed on the cap. */
  const counter = (used: number, max: number) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: COURIER, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: used >= max ? ALARM : QUIET }}>
        {t('createCharacter.charsLeft', { count: max - used })}
      </span>
    </div>
  )

  const sheetStyle = {
    background: PAPER,
    border: `2px solid ${SHEET_FRAME}`,
    borderRadius: 0,
    boxShadow: SHADOW,
  }

  /* The nameplate: cog · the paper's name · cog, on the union's red bar, under a
     3px double rule and the printed-in shadow of its own ink. Named once so it
     is the identical element the work order mounts. */
  const masthead = (
    <ComposerMasthead
      background={MAST}
      style={{
        height: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-sm)',
        padding: sizes.isMobile
          ? 'var(--space-sm) var(--space-lg)'
          : 'var(--space-md) var(--space-lg)',
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

  /* THE FACTION'S ONE ORNAMENT (#2195). Not a `ComposerGround`: that component
     owns a position, an inset and a drift, and `.em-burst` already carries an
     anchored inset-0 layer with `pointer-events: none`. This page never stands
     on a faction backdrop — it declares no ground, so `FactionBackdrop` serves
     the site watercolour — so it wears the ornament always and takes no
     alternation branch, exactly as the composer does. */
  const ground = <div aria-hidden className="em-burst" />

  /* The bill's rule, drawn ONCE above the footer (#1707). Seven dashed reds read
     as a form to be filled in, not as a work order; the sheet's own gap parts
     the regions. */
  const dashRule = (
    <ComposerRule
      style={{ height: 0, background: 'transparent', borderTop: `2px dashed ${RED}` }}
    />
  )

  return (
    <ComposerPage sizes={sizes} style={{ fontFamily: COURIER, color: INK }}>
      {/* A REAL `<form>`, not a bare button with an onClick. The Default skin
          submits through one and so must this: it is what makes Enter commit
          from a text field. `handleSubmit` calls `preventDefault()` itself. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} ground={ground}>
          {/* The stage: the union's cog turning beside the page's own question,
              which is the heading this surface has always asked. */}
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
              {t('createCharacter.heading')}
            </h1>
          </div>

          {/* The life being enlisted, live. The card dispatches its own faction
              dress, so it is already wearing this kit the moment the calling is
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
              data-composer-field
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={NAME_MAX}
              placeholder={t('createCharacter.namePlaceholder')}
              autoFocus
              style={{ ...fieldBox, fontFamily: BEBAS, letterSpacing: '0.02em' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: COURIER, fontSize: 'var(--text-lg)' }}>
              <span style={{ color: QUIET }}>@{handle}</span>
              <span style={{ color: displayName.length >= NAME_MAX ? ALARM : QUIET }}>
                {t('createCharacter.charsLeft', { count: NAME_MAX - displayName.length })}
              </span>
            </div>
          </ComposerSection>

          {/* About */}
          <ComposerSection rule={false} label={t('createCharacter.aboutLabel')} labelStyle={sectionLabel}>
            <textarea
              data-composer-field
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={BIO_MAX}
              placeholder={t('createCharacter.aboutPlaceholder')}
              rows={3}
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.6 }}
            />
            {counter(bio.length, BIO_MAX)}
          </ComposerSection>

          {/* Tagline — a slogan line, not a short bio (#1628). Its counter turns
              alarm on the cap the way the name field's does: this is the field
              the profile header's identity slot is laid out against, so running
              out of room is worth seeing before the text stops appearing. */}
          <ComposerSection rule={false} label={t('createCharacter.taglineLabel')} labelStyle={sectionLabel}>
            <textarea
              data-composer-field
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={TAGLINE_MAX}
              placeholder={t('createCharacter.taglinePlaceholder')}
              rows={2}
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.6 }}
            />
            {counter(tagline.length, TAGLINE_MAX)}
          </ComposerSection>

          {/* Portrait — the shared picker owns the hidden input and the "what's
              chosen" readout (#1149); the credential card above opens the same
              input through `fileInputRef`. Dressed rather than left in site
              chrome: `.btn-outline` brings its own near-white
              `--color-bg-surface` ground and neutral ink, which reads as a
              browser control dropped on the bill. The error ink is passed for a
              measured reason — see the prop's own note. */}
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
            <PortraitPicker
              inputRef={fileInputRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
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

          {/* Answer a calling — only when the account holds invitations
              (ADR-0019). It stays drawn in this skin: tapping the union's own
              name must not be a one-way door, and clearing the pick returns the
              page to the Default archetype. */}
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
                      aria-pressed={selected}
                      onClick={() => setFactionSlug(selected ? '' : slug)}
                      /* NOT `stencil` — it forces uppercase and its own
                         tracking, and both would be inherited by the name
                         inside. A calling wears its OWN card face at its own
                         case, which is what every other chooser draws. The
                         chosen row takes this kit's CTA fill, which is the
                         report bar's near-black: the design's control dress
                         says a faction's active state is "its CTA fill … never
                         a generic accent block". */
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        width: '100%',
                        cursor: 'pointer',
                        textAlign: 'left',
                        borderRadius: 0,
                        padding: 'var(--space-md) var(--space-lg)',
                        background: selected ? BAR : PANEL,
                        border: `2px solid ${selected ? BAR : FRAME}`,
                        /* The faction's own hue as a struck OFFSET SHADOW —
                           the union's printed-in idiom (the work order's proof
                           slips carry the same 3px offset) rather than the ring
                           another kit would draw. A hue is a FILL here and
                           never an ink: the row's type stays on this kit's own
                           measured pair. */
                        boxShadow: selected ? `3px 3px 0 ${factionCssVar(slug)}` : 'none',
                      }}
                    >
                      {/* The faction's own mark, from the dispatcher every other
                          chooser draws (#2223). */}
                      <FactionSigil slug={slug} size={PICKER_SIGIL} />
                      <span
                        style={{
                          fontFamily: factionCssVar(slug, 'card-font'),
                          fontSize: 'var(--text-content)',
                          color: selected ? BAR_INK : INK,
                        }}
                      >
                        {factionName(slug)}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p style={{ fontFamily: COURIER, fontSize: 'var(--text-content)', color: QUIET, margin: 0, lineHeight: 1.55 }}>
                {t('createCharacter.callingHint')}
              </p>
            </ComposerSection>
          )}

          <ErrorBanner message={error ?? ''} style={{ color: ALARM }} />

          {dashRule}

          {/* [Cancel] … [Create] — the global order from #646, with the cast
              stacked as a full-bleed BAR rather than an inline button. */}
          <ComposerFooter
            band
            start={
              <>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  style={stencil({
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: QUIET,
                    textDecoration: 'underline',
                  })}
                >
                  {t('createCharacter.cancel')}
                </button>
                <span style={{ fontFamily: COURIER, fontSize: 'var(--text-content)', color: QUIET }}>
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
                    /* Design band: 15 / 400 / 0.22em in the label face, which
                       for the Everymen IS Bebas. 15 takes --text-content so the
                       band still outranks this kit's own 13px labels. */
                    fontFamily: BEBAS,
                    fontSize: 'var(--text-content)',
                    letterSpacing: '0.22em',
                    /* The SHEET's frame — gold by day, deep red by night — and
                       NOT `--everymen-frame`, which is the ink the plates are
                       ruled in. */
                    frame: SHEET_FRAME,
                    color: BAR_INK,
                    background: BAR,
                  }),
                  cursor: submitting ? 'wait' : 'pointer',
                  opacity: canSubmit ? 1 : 0.5,
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

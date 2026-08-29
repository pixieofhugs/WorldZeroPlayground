/**
 * Warriors of Whimsy — THE CHARTER, WOW's character-creation archetype (#2350,
 * epic #2346).
 *
 * NO DESIGN WAS DRAWN FOR THIS and none was needed: the owner's ruling is that
 * the two surfaces WOW already ships carry the whole register between them.
 * `components/taskCard/WowTaskCard` (THE QUEST DECREE) holds the ground, the
 * inks, the rules and the faces; `pages/editPraxis/archetypes/WowEditPraxis`
 * (THE WRIT) holds the same kit applied to a FORM — labelled fields, character
 * counters, a primary commit, a cancel path — which is structurally what this
 * page is. This file is that dress over this page's fields.
 *
 * A quest is ISSUED by decree and proof is RECORDED in the chronicle (ADR-0050).
 * A life is CHARTERED: this is the sheet a name is entered on before either can
 * happen, so it wears the writ's chassis and the decree's head — the barber
 * ribbon, the pennant run, the gilt frame, one wavy gold→plum rule closing the
 * sheet, and the bunch of googly balloons keeping the muster.
 *
 * ## The chassis is the composer's, not a second one
 *
 * `ComposerPage` / `ComposerSheet` / `ComposerSection` / `ComposerFooter` are
 * geometry with no praxis in them, so this page mounts the same blocks the writ
 * does rather than restating a sheet, a masthead slot and a footer row. The
 * CONTROLS in `editPraxis/archetypes/controls.tsx` are the half that does not
 * fit — every one of them takes an `EditPraxisState` — so the fields below are
 * plain inputs wearing the writ's own `fieldBox`, the same geometry row
 * (parchment plate, `1.5px` gilt, radius 6) that file's fields wear. Nothing
 * under `pages/editPraxis/` is written to; it is read as the reference the issue
 * names it as. This is the shape `EphemeristsCreateCharacter` set in #2347.
 *
 * ## One responsive component, no mobile twin
 *
 * `useComposerSizes()` reads `useFormFactor()` and picks the size set; there is
 * one tree at two widths and no second file. Every fixed number here is
 * ornament geometry, never a layout grid (SPEC-faction-ui-profile §1a).
 *
 * ## Copy — none of its own
 *
 * Every string is an existing `forms:createCharacter.*` key, unchanged and
 * un-reordered: chosen name → about → tagline → portrait → answer a calling →
 * commit / cancel. WOW's knightly vocabulary is NOT reintroduced here; ADR-0065
 * §3 deleted `editPraxis.wow.*` outright and the faction carries identity in
 * dress alone.
 *
 * ONE FIELD-SET DEVIATION FROM THE DEFAULT, the same one #2347 flagged. The na
 * kit's PHONE branch deliberately carries no prose fields — it is framed as
 * "Step 1 of 2 · Identity" and has never offered `bio`, with `tagline`
 * following `bio` so the two stay a pair (#1628). This charter offers all six
 * fields at both widths, because #2350 states the field list once and
 * unconditionally, and because the two-step framing is the na phone skin's own
 * chrome rather than something this sheet wears.
 *
 * ## Two WOW rules that are load-bearing, not taste (§3)
 *
 * - **The gilt is theme-invariant and is never an ink.** {@link GOLD} measures
 *   2.24:1 on the cream, so it frames, rules and fills and never sets text.
 *   Where gold has to be READ — the submit band's label — the pairing is
 *   {@link ON_GOLD} (7.64:1 on the gold, both themes). There is no `dark ?`
 *   anywhere below; the flip is the `[data-theme="dark"]` cascade's.
 * - **`--faction-wow-card-muted` is legible on the CREAM and not on the PANEL**
 *   (4.77:1 against 4.25:1 — a pairing, not a property, §3/#1028). So the quiet
 *   ink is spent only on the sheet, and every string that lands on a parchment
 *   field takes an ink measured there instead. Every pairing this file draws is
 *   already a row in `utils/__tests__/factionContrast.test.ts`; see the
 *   constants below for which.
 *
 * ## The ornament never sits behind type
 *
 * The writ floats its balloons on `ComposerGround`, under the content column.
 * This sheet has no ground layer at all: the bunch is a FLEX SIBLING in the
 * heading row, which is the placement `WowTaskDetail`, `WowPraxisDetail` and
 * `WowFactionBody` all use and the one #2032 settled for the decree ("flex
 * siblings with a gap, never absolute over it"). So every ink below is measured
 * against an OPAQUE ground — the cream sheet, the parchment plate, the plum
 * fill or the gilt band — and there is no composite to be optimistic about.
 * Every mark comes from `components/factionMarks` (§6/#849); this file draws no
 * balloon, no pennant and no rule of its own.
 *
 * ## The measurement (#2350's agent-verifiable half)
 *
 * Measured on the real ground, both themes, worst case light:
 *
 *     what                                                  light   dark
 *     heading / cream                                       14.02   14.72
 *     @handle, counters, status line, hint, "starts at"       4.76    6.85
 *     section labels + cancel / cream                         5.32    8.83
 *     error banner and a spent counter / cream                7.57    9.56
 *     field text, portrait button, unpicked calling / plate  12.49   12.77
 *     the picked calling / plum                               5.16    5.16
 *     the cast's label and its ✦ / gilt                       7.64    7.64
 *
 * The 4.76 floor is WOW's own shipped floor and is the quiet ink on the cream —
 * NOT on the plate, where it is 4.25 (see {@link MUTED}). All eight pairings are
 * already rows in `utils/__tests__/factionContrast.test.ts`; restating them in a
 * second file would be a second name for one measurement, which is the split
 * `__tests__/createCharacterContrast.test.ts` records in as many words.
 *
 * THE ONE NUMBER THAT WAS NOT IN THAT TABLE IS NOT THIS SKIN'S ANY MORE (#2486,
 * ruled). The cast used to dim to `opacity: 0.5` until there was a name to
 * submit, which folded the band AND its label over the sheet: 3.14:1 in light,
 * 1.81:1 in dark. This file was right that forking WOW's answer would make one
 * skin the odd one out, and the cross-archetype question it flagged came back
 * ruled — the disabled state is the state character creation OPENS in, so it is
 * measured rather than exempted. It is `.control-off` now, in `index.css`, for
 * all ten sites; the pair it lands on is measured in
 * `__tests__/disabledControlContrast.test.ts`. Nothing about it is WOW's.
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
import { factionRoleVars } from '../../../utils/factionRoles'
import CredentialCard from '../../../components/CredentialCard'
import FactionSigil from '../../../components/sigil/FactionSigil'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import { BalloonBunch, Bunting, Zig } from '../../../components/factionMarks/wowOrnament'
import { WowSpark } from '../../../components/factionMarks/wowMobile'
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
  ComposerMasthead,
  ComposerPage,
  ComposerSection,
  ComposerSheet,
  ErrorBanner,
  composerBandStyle,
  composerLabelStyle,
  useComposerSizes,
} from '../../editPraxis/archetypes/shared'

const SLUG = 'wow'

/* ── WOW's two faces (§3) ── */
/**
 * MedievalSharp — the chronicle's display hand.
 *
 * THE FOUR CORE ROLES ARE ASKED FOR BY NAME (#2674). `ComposerPage` below puts
 * the style object it is handed straight on its root element, so
 * `factionRoleVars('wow', 'wow-create')` declares the prefix on the page this
 * file dresses without a prop being threaded through a shared block — that
 * would be tree work, and this is paint.
 *
 * Every read carries today's token as its fallback. The names below that are
 * NOT roles stay put: the inset plate, the label olive, the plum FILL and its
 * ink, the gold and its quiet rung are this surface's own extras (decision 07).
 */
const MED = 'var(--wow-create-face)'
/** Lora — body AND label on the writ, per that design's type row. */
const LORA = 'var(--faction-wow-body-font)'

/* ── The chronicle palette. Every one a shipped --faction-wow-* token, and
   every pairing below already measured in `factionContrast.test.ts`. ── */
/** The sheet: cream parchment by day, the deep ground by night. */
const SHEET = 'var(--wow-create-paper)'
/** The inset parchment plate every editable field is set on. */
const FIELD = 'var(--faction-wow-chronicle-panel)'
/** Body ink. 14:1 on the cream, and measured on the plate too. */
const INK = 'var(--wow-create-ink)'
/** Quiet ink — CREAM ONLY (4.77:1 there, 4.25:1 on the plate). */
const MUTED = 'var(--wow-create-quiet)'
/** The label/eyebrow ink, the one measured on BOTH chronicle grounds. */
const LABEL = 'var(--faction-wow-accent-deep)'
/** Plum as a SURFACE. Theme-invariant, with its own AA ink beside it. */
const PLUM_FILL = 'var(--faction-wow-plum-surface)'
const ON_PLUM = 'var(--faction-wow-on-plum)'
/** Frame + rule gold. Theme-invariant, and never an ink. */
const GOLD = 'var(--faction-wow-chronicle-gold)'
/** The QUIET gold — the same gilt at 40%. An edge that only suggests a plate. */
const RULE = 'var(--faction-wow-rule)'
/** The AA ink for anything printed ON the gold. */
const ON_GOLD = 'var(--faction-wow-on-gold)'
/** The band along the head of the charter: gold 0-11px, plum 11-22px. */
const RIBBON = 'var(--faction-wow-quest-ribbon)'
/** A whole page's lift rather than a card's — the sheet is the page here. */
const SHEET_SHADOW = 'var(--faction-wow-detail-shadow)'
/* The error banner's and the spent-counter's ink. The neutral `--color-danger`
 * is 4.08:1 on this cream in light and so misses AA; this is #1449's alarm rung,
 * already measured on the parchment. The veil and the edge stay neutral
 * (ADR-0061). Same swap `WowEditPraxis` and `PortraitPicker`'s `errorStyle`
 * prop exist for. */
const ALARM = 'var(--faction-wow-card-alarm)'

/* ── Ornament geometry (WORLD_ZERO_STYLE §4a: illustration, not layout) ──
   The bunch keeping the muster beside the charter's question, at the two sizes
   the faction's other pages draw it (34 on a page head, 38 on a section). */
const BUNCH = { desktop: 38, mobile: 30 }
/** The mark each calling wears in the picker — the size every other chooser draws (#2223). */
const PICKER_SIGIL = 18
/** The charter's corner, the one every WOW plate takes. */
const RADIUS = 6

export default function WowCreateCharacter({ state }: { state: CreateCharacterState }) {
  const { t } = useTranslation(['forms', 'common'])
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

  /** Lora label ink on the cream — every section head on this sheet. */
  const sectionLabel: CSSProperties = { fontFamily: LORA, color: LABEL }
  /** A parchment field in a gilt frame — the writ's whole geometry row. */
  const fieldBox = {
    width: '100%',
    background: FIELD,
    color: INK,
    border: `1.5px solid ${GOLD}`,
    borderRadius: RADIUS,
    padding: 'var(--space-md)',
    boxSizing: 'border-box',
    fontFamily: LORA,
    fontSize: 'var(--text-content)',
  } as const

  /** The counter row under a field: quiet on the cream, alarmed on the cap. */
  const counter = (used: number, max: number) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: LORA, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: used >= max ? ALARM : MUTED }}>
        {t('createCharacter.charsLeft', { count: max - used })}
      </span>
    </div>
  )

  const sheetStyle = {
    background: SHEET,
    border: `1.5px solid ${GOLD}`,
    borderRadius: RADIUS,
    boxShadow: SHEET_SHADOW,
  }

  /* The decree's head, in the order the task card strings it: the 7px barber
     ribbon straight off `--faction-wow-quest-ribbon`, then the pennant run
     beneath it (#2032's own swap). Both are the shipped devices — no geometry
     is drawn here. The masthead slot is a full-bleed child of the sheet, which
     clips it to the corner radius, so neither needs positioning. */
  const masthead = (
    <>
      <ComposerMasthead background={RIBBON} height={7} />
      <Bunting />
    </>
  )

  return (
    <ComposerPage
      sizes={sizes}
      style={{ ...factionRoleVars('wow', 'wow-create'), fontFamily: LORA, color: INK }}
    >
      {/* A REAL `<form>`, not a bare button with an onClick. The Default skin
          submits through one and so must this: it is what makes Enter commit
          from a text field, and what gives the browser's own required-field
          behaviour something to attach to. `handleSubmit` calls
          `preventDefault()` itself. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead}>
          {/* The charter's head: the faction's ✦ device, the page's own
              question, a wavy gold→plum rule taking up the slack, and one bunch
              of googly balloons keeping the muster. The row is the decree's own
              hero row (mark · rule · device) and it WRAPS, so a phone stacks it
              rather than crushing the heading. */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontFamily: MED, fontSize: 'var(--text-heading)', lineHeight: 1 }}>
              <WowSpark />
            </span>
            <h1
              style={{
                fontFamily: MED,
                fontSize: sizes.titleSize,
                lineHeight: 1.1,
                color: INK,
                margin: 0,
              }}
            >
              {t('createCharacter.heading')}
            </h1>
            <Zig id="charter" style={{ flex: 1, minWidth: 0 }} />
            <BalloonBunch size={BUNCH[factor]} />
          </div>

          {/* The life being chartered, live. The card dispatches its own faction
              dress, so it is already wearing WOW's the moment the calling is
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
              style={{ ...fieldBox, fontFamily: MED }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: LORA, fontSize: 'var(--text-lg)' }}>
              <span style={{ color: MUTED }}>@{handle}</span>
              <span style={{ color: displayName.length >= NAME_MAX ? ALARM : MUTED }}>
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
              input through `fileInputRef`. */}
          <ComposerSection
            rule={false}
            label={
              <>
                {t('character.portrait')}{' '}
                <span style={{ textTransform: 'none', letterSpacing: 0 }}>{t('createCharacter.optional')}</span>
              </>
            }
            labelStyle={sectionLabel}
          >
            {/* Dressed rather than left in site chrome. `.btn-outline` brings
                its own near-white `--color-bg-surface` ground and neutral ink,
                which reads as a browser control dropped on parchment; every
                other control on this sheet is a gilt-framed plate. The status
                line sits on the SHEET, so it takes the cream's quiet ink; the
                error ink is passed for the measured reason on the prop itself. */}
            <PortraitPicker
              inputRef={fileInputRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
              error={avatarError}
              buttonStyle={composerLabelStyle({
                fontFamily: MED,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                borderRadius: RADIUS,
                padding: 'var(--space-sm) var(--space-lg)',
                background: FIELD,
                color: INK,
                border: `1.5px solid ${GOLD}`,
              })}
              statusStyle={{ fontFamily: LORA, fontStyle: 'italic', color: MUTED }}
              errorStyle={{ color: ALARM }}
            />
          </ComposerSection>

          {/* Answer a calling — only when the account holds invitations
              (ADR-0019). It stays drawn in this skin: tapping the charter's own
              faction must not be a one-way door, and clearing the pick returns
              the page to the Default archetype. */}
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
                         below. A calling wears its OWN card face at its own
                         case, which is what every other chooser draws. Solid
                         gilt only on the calling you are IN; the rest take the
                         quiet gold, which is the writ's mode-chip rule (#1830). */
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        width: '100%',
                        cursor: 'pointer',
                        textAlign: 'left',
                        borderRadius: RADIUS,
                        padding: 'var(--space-md) var(--space-lg)',
                        background: selected ? PLUM_FILL : FIELD,
                        border: `1.5px solid ${selected ? GOLD : RULE}`,
                        // The faction's own hue as a RING, never as ink (§3) —
                        // the row's type stays on a measured chronicle pair.
                        boxShadow: selected ? `0 0 0 2px ${factionCssVar(slug)}` : 'none',
                      }}
                    >
                      {/* The faction's own mark, from the dispatcher every other
                          chooser draws (#2223). Selected, the ground becomes
                          PLUM_FILL — this kit's own fill, not the offered
                          slug's — so the mark has to move to this kit's
                          `onFill` ink the same way the label beside it already
                          does (#2852). */}
                      <FactionSigil slug={slug} size={PICKER_SIGIL} color={selected ? ON_PLUM : undefined} />
                      <span
                        style={{
                          fontFamily: factionCssVar(slug, 'card-font'),
                          fontSize: 'var(--text-content)',
                          color: selected ? ON_PLUM : INK,
                        }}
                      >
                        {factionName(slug)}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p style={{ fontFamily: LORA, fontStyle: 'italic', fontSize: 'var(--text-content)', color: MUTED, margin: 0, lineHeight: 1.55 }}>
                {t('createCharacter.callingHint')}
              </p>
            </ComposerSection>
          )}

          <ErrorBanner message={error ?? ''} style={{ color: ALARM }} />

          {/* The zigzag, drawn ONCE above the footer (#1707) rather than at the
              head of every section — the sheet's own gap parts the regions, and
              six of these would make a ladder of the charter. */}
          <Zig id="footer" />

          {/* [Cancel] … [Create] — the global order from #646, with the cast as
              a full-bleed gilt band flush to the sheet's bottom edge (#1828). */}
          <ComposerFooter
            band
            start={
              <>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  style={composerLabelStyle({
                    fontFamily: LORA,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: LABEL,
                    textDecoration: 'underline',
                  })}
                >
                  {t('common:actions.cancel')}
                </button>
                <span style={{ fontFamily: LORA, fontStyle: 'italic', fontSize: 'var(--text-content)', color: MUTED }}>
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
                    /* The band is the one control WOW letters in its DISPLAY
                       face — the writ's own `band.font: 'title'` row, at the
                       same rung, so the charter's cast matches the writ's. */
                    fontFamily: MED,
                    fontSize: 'var(--text-content)',
                    letterSpacing: '0.14em',
                    frame: GOLD,
                    color: ON_GOLD,
                    background: GOLD,
                  }),
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {submitting ? t('createCharacter.submitBusy') : t('createCharacter.submitIdle')}
                {/* The ✦ following the cast, in the ink measured ON the gilt. */}
                <WowSpark color={ON_GOLD} />
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

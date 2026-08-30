/**
 * Warriors of Whimsy — THE AMENDED CHARTER, WOW's edit-character archetype
 * (#2537, the seven-faction fan-out).
 *
 * NO DESIGN WAS DRAWN FOR THIS AND NONE WAS COMMISSIONED. The owner ruled twice
 * — 2026-08-27 and again on 2026-08-28, walking the eight create pages in a
 * running stack — that each faction's edit page is DERIVED from that faction's
 * `createCharacter` page. So this file is `WowCreateCharacter` on this page's
 * fields: the same chassis (`ComposerPage` / `ComposerSheet` / `ComposerSection`
 * / `ComposerFooter`), the same head (barber ribbon, pennant run, ✦, wavy rule,
 * one bunch of balloons), the same parchment-plate-in-a-gilt-frame field, the
 * same full-bleed gold cast band. A life is CHARTERED on that sheet; this is the
 * sheet it is AMENDED on, and an amendment wears the same hand as the charter.
 *
 * ## Derived means create PLUS FOUR, not a copy
 *
 * The 2026-08-28 ruling corrects the issue body on this: EDIT is the superset.
 * Four fields carry over (chosen name, story, catchphrase, portrait), `answer a
 * calling` is create-only and meaningless here, and four groups are edit-only —
 * where you're based, the handle, THE FACTION ROW and THE DELETE DANGER ZONE.
 * The first two are ordinary fields and take the writ's field geometry unchanged.
 * The last two are the slots a create dress has no room for.
 *
 * ## The two slots are MOUNTED, never redrawn
 *
 * `FactionRow` and `DeleteCharacter` live in `../editCharacterSlots`, designed
 * once in #2788 and reviewed on screen before this fan-out was allowed to start.
 * What they DO and what they READ AS is that file's; where they SIT is this
 * archetype's, which is the split its docblock states in terms. Nothing here
 * re-implements the confirm, the busy state, or the `na`-goes-to-the-DIRECTORY
 * href — `factionDetailHref` is that rule said once.
 *
 * ## Where they sit: THE CODICIL, a second sheet below the charter
 *
 * `DefaultEditCharacter` records the precedent — *desktop: below Save, outside
 * the card stack, so the irreversible act cannot be read as part of the form* —
 * and both shipped surfaces mount `FactionRow` then `DeleteCharacter` in that
 * order. This agrees with them, and it takes WOW's own shape to do it: the
 * charter has no "outside the card stack" to fall out of, because the cast band
 * is flush to the sheet's bottom edge (#1828). So the tail is a SECOND, plainer
 * sheet in the same column — no ribbon, no bunting, no cast — carrying the
 * calling this life already has and the one act that cannot be undone. It is
 * outside the `<form>`, so Enter in a text field can never reach it.
 *
 * At both widths, because a slot present on one width only is the mobile-only
 * split #2346 retired and #2788 closed on this very page. `useComposerSizes()`
 * reads `useFormFactor()` and both sheets take the same column, so the codicil
 * stacks under the charter on a phone with nothing said twice.
 *
 * ## The measurement this fan-out was warned it would skip
 *
 * `editCharacterSlots.tsx` carries a `ponytail:` note: its alarm ink is measured
 * on the na page's WASHED PAGE ground, the only ground an edit archetype drew on
 * when it landed. This archetype lands both slots on WOW's OWN SHEET, so every
 * claim measured on that other ground has to be re-taken here — the alarm, and
 * also the two neutral tiers the shared slot draws, which now sit on parchment
 * rather than on app paper. `__tests__/wowEditCharacterContrast.test.ts` is that
 * measurement; see its header for why it is a file of its own rather than a row
 * in `utils/__tests__/factionContrast.test.ts`.
 *
 *     what                                       light   dark
 *     delete outline + confirm frame / cream      7.57    9.56
 *     faction label + confirm prompt / cream      7.78    8.13
 *     faction help / cream                        7.83    8.72
 *     the row's own plate ink, plate over cream   7.31    6.99
 *
 * The charter's own eight pairings are unchanged and are already rows in
 * `utils/__tests__/factionContrast.test.ts`; restating them would be a second
 * name for one measurement, which that file warns against in as many words.
 *
 * ## The two WOW rules that are load-bearing, not taste (§3)
 *
 * - **The gilt is theme-invariant and is never an ink.** {@link GOLD} measures
 *   2.24:1 on the cream, so it frames, rules and fills and never sets type.
 *   Where gold has to be READ — the save band's label — the pairing is
 *   {@link ON_GOLD}. There is no `dark ?` below; the flip is the cascade's.
 * - **`--faction-wow-card-muted` is legible on the CREAM and not on the PLATE**
 *   (4.76 against 4.24 — a pairing, not a property). So {@link MUTED} is spent
 *   only on the sheet, and anything landing on a parchment field takes
 *   {@link INK}, measured there.
 *
 * ## Copy — none of its own, and no visible labels
 *
 * Every string is an existing `forms:` key. The fields are placeholder-only
 * since #2793 and `namedField()` sets `placeholder` and `aria-label` from one
 * string, because on this form the visible label WAS the accessible name.
 * `ComposerSection` draws no heading row when no `label` is passed, so the field
 * sections are bare frames. The na kit's `eyebrow`, `intro`, `avatarLabel` and
 * `avatarHint` are NOT read here: all four speak the unaffiliated page in terms
 * ("Unaffiliated · this is who you are", "framed in the full spectrum"), and a
 * WOW charter is neither. WOW's knightly vocabulary is not reintroduced either —
 * ADR-0065 §3 deleted it and the faction carries identity in dress alone.
 *
 * ## Presentation only
 *
 * `useEditCharacter` stays the single source of state. Nothing here touches the
 * persist path, the delete path, `PortraitPicker` or `useAvatarPicker`. The
 * load / not-found / not-yours guards are this archetype's own, as they are the
 * na kit's — they are what keeps a half-loaded record out of the tree below.
 */
import { useRef, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionRoleVars } from '../../../utils/factionRoles'
import { mediaUrl } from '../../../utils/media'
import CredentialCard from '../../../components/CredentialCard'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import { BalloonBunch, Bunting, Zig } from '../../../components/factionMarks/wowOrnament'
import { WowSpark } from '../../../components/factionMarks/wowMobile'
import PortraitPicker from '../PortraitPicker'
import { namedField } from '../characterFields'
import { DeleteCharacter, FactionRow } from '../editCharacterSlots'
import { TAGLINE_MAX } from '../useCreateCharacter'
import type { EditCharacterState } from '../useEditCharacter'
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

/* ── The edit page's own caps ──
   Deliberately NOT `NAME_MAX` / `BIO_MAX`, whose values are the CREATE page's
   22 and 160. The edit form has always allowed more (`useEditCharacter` sends
   the field either way; the server column is the real ceiling), and the
   `editCharacter.*Count` strings below print these very numbers, so a skin that
   invented its own would draw "51/50". Only `TAGLINE_MAX` is genuinely one cap
   for both surfaces, which is why it alone is imported. */
const NAME_LIMIT = 50
const STORY_LIMIT = 500
const LOCATION_LIMIT = 100

/* ── WOW's two faces (§3) ──
   THE FOUR CORE ROLES ARE ASKED FOR BY NAME (#2674). `ComposerPage` puts the
   style object it is handed straight on its root, so `factionRoleVars('wow',
   'wow-edit')` declares the prefix on the page this file dresses. No read below
   carries a fallback arm: the map always emits for an identified faction, so an
   arm would be unreachable code (ADR-0089 / #2690). The names that are NOT roles
   stay put — the inset plate, the label olive, the gold and its quiet rung are
   this surface's own extras. */
const MED = 'var(--wow-edit-face)'
/** Lora — body AND label on the writ, per that design's type row. */
const LORA = 'var(--faction-wow-body-font)'

/* ── The chronicle palette. Every one a shipped --faction-wow-* token. ── */
/** The sheet: cream parchment by day, the deep ground by night. */
const SHEET = 'var(--wow-edit-paper)'
/** The inset parchment plate every editable field is set on. */
const FIELD = 'var(--faction-wow-chronicle-panel)'
/** Body ink. 14:1 on the cream, and measured on the plate too. */
const INK = 'var(--wow-edit-ink)'
/** Quiet ink — CREAM ONLY (4.76:1 there, 4.24:1 on the plate). */
const MUTED = 'var(--wow-edit-quiet)'
/** The label/eyebrow ink, the one measured on BOTH chronicle grounds. */
const LABEL = 'var(--faction-wow-accent-deep)'
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
/** #1449's alarm rung. `--color-danger` is 4.40:1 on this cream and misses AA. */
const ALARM = 'var(--faction-wow-card-alarm)'

/* ── Ornament geometry (WORLD_ZERO_STYLE §4a: illustration, not layout) ── */
/** The bunch keeping the muster, at the two sizes the faction's pages draw it. */
const BUNCH = { desktop: 38, mobile: 30 }
/** The charter's corner, the one every WOW plate takes. */
const RADIUS = 6

export default function WowEditCharacter({ state }: { state: EditCharacterState }) {
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

  // The three one-line states, in the site's own neutral chrome rather than in a
  // half-built charter: there is nothing to dress until the record lands, and a
  // sheet that appears and then says "not yours" is a faction flashed and taken
  // back. Same shape and same words as the na kit's.
  if (loading) return <div className="py-8 font-body text-muted">{t('common:loading')}</div>
  if (!character) return <div className="py-8 font-body text-muted">{t('editCharacter.notFound')}</div>
  if (!isOwner) return <div className="py-8 font-body text-muted">{t('editCharacter.notOwner')}</div>

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

  /** The counter row under a field: quiet on the cream, alarmed at the cap. */
  const counter = (text: string, spent: boolean) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: LORA, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: spent ? ALARM : MUTED }}>{text}</span>
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
     beneath it (#2032's own swap). Both are the shipped devices — no geometry is
     drawn here. The masthead slot is a full-bleed child of the sheet, which
     clips it to the corner radius, so neither needs positioning. */
  const masthead = (
    <>
      <ComposerMasthead background={RIBBON} height={7} />
      <Bunting />
    </>
  )

  // A freshly cropped portrait (object URL) shows immediately, before Save
  // (#985); otherwise the persisted avatar.
  const portraitSrc = avatarPreview ?? (character.avatar_url ? mediaUrl(character.avatar_url) : null)

  return (
    <ComposerPage
      sizes={sizes}
      style={{ ...factionRoleVars('wow', 'wow-edit'), fontFamily: LORA, color: INK }}
    >
      {/* A REAL `<form>`, not a bare button with an onClick — it is what makes
          Enter commit from a text field, and what gives the browser's own
          required-field behaviour something to attach to. `handleSubmit` calls
          `preventDefault()` itself. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        <ComposerSheet
          sizes={sizes}
          style={sheetStyle}
          masthead={masthead}
          // The charter's usual tail padding belongs to the page, not to this
          // sheet: the codicil follows it in the same column and the two want
          // one gap between them rather than two stacked.
          pageStyle={{ paddingBottom: 'var(--space-xl)' }}
        >
          {/* The charter's head: the faction's ✦ device, the page's own title, a
              wavy gold→plum rule taking up the slack, and one bunch of googly
              balloons keeping the muster. The row is the decree's hero row
              (mark · rule · device) and it WRAPS, so a phone stacks it rather
              than crushing the heading. */}
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
              {t('editCharacter.heading')}
            </h1>
            <Zig id="amend-head" style={{ flex: 1, minWidth: 0 }} />
            <BalloonBunch size={BUNCH[factor]} />
          </div>

          {/* The life being amended, live. The card dispatches its own faction
              dress, so it is already wearing WOW's — this page's whole reason to
              exist is that the calling is already answered. Unlike the charter's
              preview it carries the REAL level and score: they are facts about
              this character rather than the 1 / 0 a new life opens on. */}
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

          {/* Chosen name */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={NAME_LIMIT}
              {...namedField(t('character.namePlaceholder'))}
              style={{ ...fieldBox, fontFamily: MED }}
            />
            {counter(
              t('editCharacter.displayNameCount', { count: displayName.length }),
              displayName.length >= NAME_LIMIT,
            )}
          </ComposerSection>

          {/* The handle — read-only, because `username` is auto-derived and
              permanent (ADR-0019). A real `readOnly` input rather than a styled
              readout: with the visible label deleted by #2793 an inert <div>
              would announce a bare handle and nothing else. It takes the quiet
              gold rather than the gilt, so the sheet says at a glance which
              plates a quill can reach. */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              readOnly
              value={`@${character.username}`}
              {...namedField(t('character.handlePlaceholder'))}
              style={{ ...fieldBox, border: `1.5px solid ${RULE}`, color: INK }}
            />
            <p style={{ fontFamily: LORA, fontStyle: 'italic', fontSize: 'var(--text-content)', color: MUTED, margin: 'var(--space-sm) 0 0', lineHeight: 1.55 }}>
              {t('editCharacter.handleHint')}
            </p>
          </ComposerSection>

          {/* Your story */}
          <ComposerSection rule={false}>
            <textarea
              data-composer-field
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={STORY_LIMIT}
              {...namedField(t('character.bioPlaceholder'))}
              rows={4}
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.7 }}
            />
            {counter(t('editCharacter.storyCount', { count: bio.length }), bio.length >= STORY_LIMIT)}
          </ComposerSection>

          {/* Catchphrase — a slogan line, not a short bio (#1628). Its counter
              turns alarm at the cap the way the name's does: this is the field
              the profile header's identity slot is laid out against, so running
              out of room is worth seeing before the text stops appearing. */}
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
              tagline.length >= TAGLINE_MAX,
            )}
          </ComposerSection>

          {/* Where you're based — AN AIRPORT CODE, and the placeholder is the
              only thing that says so (owner ruling on #2793): close enough for
              two players to find each other, too coarse to track anyone. Nothing
              validates the format, so the placeholder is the whole convention. */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={LOCATION_LIMIT}
              {...namedField(t('character.locationPlaceholder'))}
              style={{ ...fieldBox, maxWidth: 280 }}
            />
            {counter(
              t('editCharacter.basedCount', { count: location.length }),
              location.length >= LOCATION_LIMIT,
            )}
          </ComposerSection>

          {/* Portrait — the shared picker owns the hidden input and the "what's
              chosen" readout (#1149); the credential card above opens the same
              input through `fileInputRef`. `hasCurrentPortrait` is what makes
              "nothing new chosen" read as KEEPING the saved one rather than as
              having none, which is the whole difference from the charter. */}
          <ComposerSection rule={false} label={t('character.portrait')} labelStyle={sectionLabel}>
            {/* Dressed rather than left in site chrome. `.btn-outline` brings its
                own near-white ground and neutral ink, which reads as a browser
                control dropped on parchment; every other control on this sheet is
                a gilt-framed plate. The status line sits on the SHEET and takes
                the cream's quiet ink; the error ink is the measured swap the prop
                exists for — `--color-danger` is 4.40:1 here. */}
            <PortraitPicker
              inputRef={fileInputRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
              hasCurrentPortrait={Boolean(character.avatar_url)}
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

          <ErrorBanner message={error} style={{ color: ALARM }} />

          {/* The zigzag, drawn ONCE above the footer (#1707) rather than at the
              head of every section — the sheet's own gap parts the regions, and
              six of these would make a ladder of the charter. */}
          <Zig id="amend-footer" />

          {/* [Cancel] … [Save] — the global order from #646, with the save as a
              full-bleed gilt band flush to the sheet's bottom edge (#1828). */}
          <ComposerFooter
            band
            start={
              <button
                type="button"
                onClick={() => navigate(`/characters/${id}`)}
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
            }
            end={
              <button
                type="submit"
                disabled={!canSubmit}
                className="control-off"
                style={{
                  ...composerBandStyle(sizes, {
                    /* The band is the one control WOW letters in its DISPLAY
                       face — the writ's own `band.font: 'title'` row. */
                    fontFamily: MED,
                    fontSize: 'var(--text-content)',
                    letterSpacing: '0.14em',
                    frame: GOLD,
                    color: ON_GOLD,
                    background: GOLD,
                  }),
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                {saving ? t('editCharacter.saveBusy') : t('editCharacter.saveIdle')}
                {/* The ✦ following the cast, in the ink measured ON the gilt. */}
                <WowSpark color={ON_GOLD} />
              </button>
            }
          />
        </ComposerSheet>
      </form>

      {/* ── THE CODICIL — the calling this life already has, and the one act that
           cannot be undone. A second, plainer sheet in the charter's own column:
           outside the <form> and below Save, which is the na kit's placement in
           WOW's shape. No ribbon, no bunting and no cast, so it can never be
           mistaken for a second charter — one wavy rule stands it off the sheet
           above and the gilt frame keeps it in the kit's hand.

           The two slots are `editCharacterSlots`' own and are mounted, not
           redrawn. Their inks land on THIS sheet rather than on the na page they
           were measured over; `__tests__/wowEditCharacterContrast.test.ts` is
           the re-measurement that buys. ── */}
      <ComposerSheet sizes={sizes} style={sheetStyle} pageStyle={{ paddingTop: 0 }}>
        <Zig id="amend-codicil" />
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

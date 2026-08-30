/**
 * The Everymen edit-character archetype — THE SAME BILL, AMENDED (#2537, the
 * seven-faction fan-out).
 *
 * DERIVED, and derived from ONE file: `EverymenCreateCharacter`. The owner
 * ruling (2026-08-27, re-affirmed 2026-08-28) is that each faction's edit page
 * is that faction's create page's dress — no sheet was commissioned and none is
 * invented here. Every token, every face, every piece of geometry below is
 * already on the enlistment paper: the same masthead, the same `.em-burst`, the
 * same plates, the same dashed rule, the same full-bleed report bar. What
 * changes is the field list.
 *
 * The union files a work order to start a job; the enlistment paper starts a
 * LIFE. This is that same paper, filed again to correct the record.
 *
 * ## What is NOT inherited from the create plate, and where it went
 *
 * Edit is the superset (the 2026-08-28 ruling's table): `answer a calling` and
 * `starts at Lvl 1` are create-only and are gone, and four groups have no
 * create-side treatment at all — handle, location, the FACTION ROW and the
 * DESTRUCTIVE ACTION. The first two are ordinary fields and wear this kit's
 * `fieldBox` like every other. The last two are the two slots designed once in
 * `../editCharacterSlots`, and this file MOUNTS them: their treatment, their
 * confirm friction, their busy state and their `na`-goes-to-the-DIRECTORY
 * routing are all that file's, unchanged. What this file decides is WHERE.
 *
 * ## Where the two slots sit, and why it is not `DefaultEditCharacter`'s answer
 *
 * The na kit puts them below Save, outside the card stack. The intent —
 * *the irreversible act cannot sit among the ordinary fields* — is kept exactly;
 * the position is not, and `editCharacterSlots`'s own contract is that placement
 * is a per-archetype decision by design.
 *
 * The Everymen dress genuinely demands the difference. This kit's Save is
 * `composerBandStyle` — the FULL-BLEED report bar #1828 welded to the sheet's
 * bottom edge by negating the column's own insets. Nothing can be drawn under it
 * inside the sheet, and the only place left below it is the page, where the
 * slots would land on the site watercolour: an unmeasured ground, and the
 * undressed neutral chrome mid-page that the derived ruling exists to prevent.
 *
 * So the slots stay on the paper, in the stub the union's own idiom already has
 * for them: a PERFORATION — this kit's dashed red rule, the one it already draws
 * above the footer — and then the two rows, below every field and above the bar
 * that files them. The weight split the gate approved is untouched: delete is an
 * outline in the faction's alarm ink, Save is the filled bleed, and no
 * treatment on either was rewritten to make this placement work.
 *
 * They sit inside the `<form>` rather than beside it (the na desktop plate's
 * other half), which costs nothing: `DeleteCharacter` renders `type="button"`
 * throughout and `FactionRow` is a `<Link>`, so neither can submit.
 *
 * ## The one measurement the fan-out is told not to skip
 *
 * The shared alarm ink is measured on the `na` page's washed ground only. This
 * archetype lands both slots on a DIFFERENT ground — `--everymen-paper` under
 * `.em-burst` — so it owes that measurement, and it is
 * `__tests__/everymenEditCharacterContrast.test.ts`: the alarm rung plus the two
 * global neutral tiers the shared slots draw with, over the worst burst corner,
 * both themes. All six clear AA (alarm 5.13 light / 6.53 dark at worst). Had one
 * missed, the answer would have been to move the slot, not to repaint the shared
 * file.
 *
 * ## Colour, copy, motion — all three inherited whole
 *
 * COLOUR: the `--everymen-*` family and the `-bill-` / `-sheet-` roles the v2
 * task card and the work order minted. Nothing new is declared, and the two
 * pairings that decide where red may be ink are the create plate's verbatim —
 * red is a rule, a fill and a mark on the paper, never a label; every plate is
 * `--faction-everymen-sheet-panel`, the stock the accent was measured on. The
 * quiet rung is `--everymen-quiet` and not `--everymen-muted`, because the burst
 * washes the paper before a word is drawn and the muted brown misses there
 * (4.09:1 under the olive corner) — the same swap, for the same measured reason,
 * as the create plate. Light/dark flips through the `[data-theme="dark"]`
 * cascade; there is no `dark ?` branch in this file.
 *
 * COPY: every string is an existing key. The fields speak `forms:character.*`,
 * the one vocabulary #2793 unified across both character forms, and the counters
 * and the two save states speak this surface's own `forms:editCharacter.*`. The
 * masthead's one word is the faction's NAME out of `factions.json`, which is
 * what every other Everymen surface puts there under ADR-0057.
 *
 * MOTION: the masthead's two cogs counter-turn and the stage cog turns forward,
 * all three as CLASSES behind the shared `prefers-reduced-motion` guard —
 * an inline `animation:` would bypass it (#1003).
 *
 * ## Presentation only
 *
 * `useEditCharacter` is the single source of state for every archetype. Nothing
 * here touches the persist path, the delete path, `PortraitPicker` or
 * `useAvatarPicker`. The load / not-found / not-yours guards are drawn in this
 * file because the dispatcher hands the state straight through (`EditCharacter.tsx`).
 *
 * ONE RESPONSIVE COMPONENT, no mobile twin: `useComposerSizes()` reads
 * `useFormFactor()` and picks the size set. Every fixed number below is ornament
 * geometry, never a layout grid (SPEC-faction-ui-profile §1a).
 *
 * NO FIELD LABELS, AND THAT IS RULED RATHER THAN MISSING (#2793). Both character
 * forms are placeholder-only; `namedField()` sets `placeholder` and `aria-label`
 * from the one string, because here the visible label WAS the accessible name.
 * The fields carry `data-composer-field` for the composer's shared focus ring
 * (#2266, #2825) and suppress no outline of their own.
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
import { namedField } from '../characterFields'
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
import { EverymenCog } from '../../../components/factionMarks/everymenCogs'
import { factionRoleVars } from '../../../utils/factionRoles'

const SLUG = 'everymen'

/* ── The sheet's palette, role by role. The same names and the same tokens as
 *    `EverymenCreateCharacter`, so the two surfaces cannot drift. ── */
/** The newsprint the paper is printed on — the faction's own card ground. */
const PAPER = 'var(--everymen-paper)'
/** The pasted-on plate: every field on the sheet. */
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
/** The masthead bar, theme-INVARIANT: a life edited at night is the same life. */
const MAST = 'var(--faction-everymen-bill-mast)'
const MAST_INK = 'var(--faction-everymen-bill-mast-ink)'
/** The full-width bar at the foot of the sheet. */
const BAR = 'var(--faction-everymen-bill-cta-bg)'
const BAR_INK = 'var(--faction-everymen-bill-cta-ink)'
const PAPER_DEEP = 'var(--everymen-paper-deep)'
const SHADOW = 'var(--faction-everymen-bill-shadow)'
/** #1449's alarm rung, measured on this paper. Not the neutral `--color-danger`. */
const ALARM = 'var(--faction-everymen-card-alarm)'

const BEBAS = 'var(--ev-path-face)' /* Bebas Neue */
const COURIER = 'var(--font-body)' /* Courier Prime */

/** The cogs' period, the work order's own 22s. Ornament timing. */
const COG_PERIOD = '22s'

/* ── Ornament geometry (WORLD_ZERO_STYLE §4a: not layout spacing) ── */
/** The masthead pair, at the size the work order's nameplate turns them. */
const MAST_COG = 16
/** The stage cog beside the page's heading. */
const STAGE_COG = { desktop: 40, mobile: 32 }

/* ── The edit-side caps. They are the na kit's, restated because nothing
 *    exports them and each is spent twice here (the field's own `maxLength`,
 *    and the counter that turns alarm on it). `TAGLINE_MAX` is the one cap the
 *    two forms share, so it is imported rather than repeated. ── */
const NAME_MAX = 50
const BIO_MAX = 500
const LOCATION_MAX = 100

export default function EverymenEditCharacter({ state }: { state: EditCharacterState }) {
  const { t } = useTranslation(['forms', 'common'])
  const navigate = useNavigate()
  const sizes = useComposerSizes()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const factor = sizes.isMobile ? 'mobile' : 'desktop'
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

  /* The three one-line states, in the site's own chrome. There is no bill to
     dress yet: the record has not arrived, does not exist, or is not this
     player's — and a masthead over "Character not found" would be the page
     claiming a life it cannot show. Same markup as every other archetype's. */
  if (state.loading) return <div className="py-8 font-body text-muted">{t('common:loading')}</div>
  if (!character) return <div className="py-8 font-body text-muted">{t('editCharacter.notFound')}</div>
  if (!state.isOwner) return <div className="py-8 font-body text-muted">{t('editCharacter.notOwner')}</div>

  /**
   * Bebas, struck in tracked caps — every label and headline on the paper. The
   * create plate's own metrics (#1828/#1830): this kit draws its label a size
   * larger than the other seven.
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
  const counter = (text: string, used: number, max: number) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: COURIER, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: used >= max ? ALARM : QUIET }}>{text}</span>
    </div>
  )

  const sheetStyle = {
    background: PAPER,
    border: `2px solid ${SHEET_FRAME}`,
    borderRadius: 0,
    boxShadow: SHADOW,
  }

  /* The nameplate — the identical element the enlistment paper and the work
     order mount: cog · the paper's name · cog, on the union's red bar. */
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

  /* THE FACTION'S ONE ORNAMENT (#2195), mounted exactly as the create plate
     mounts it: `.em-burst` is an anchored inset-0 layer with its own
     `pointer-events: none`, so it is not a `ComposerGround`. */
  const ground = <div aria-hidden className="em-burst" />

  /* The bill's dashed rule. Drawn TWICE on this sheet and only twice (#1707):
     once as the stub's perforation, once above the footer. */
  const dashRule = (
    <ComposerRule style={{ height: 0, background: 'transparent', borderTop: `2px dashed ${RED}` }} />
  )

  // A freshly cropped portrait (object URL) shows immediately, before Save
  // (#985); otherwise fall back to the persisted avatar.
  const portraitSrc = avatarPreview ?? (character.avatar_url ? mediaUrl(character.avatar_url) : null)

  return (
    <ComposerPage
      sizes={sizes}
      style={{ ...factionRoleVars('everymen', 'ev-path'), fontFamily: COURIER, color: INK }}
    >
      {/* A REAL `<form>`: it is what makes Enter commit from a text field, and
          `handleSubmit` calls `preventDefault()` itself. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} ground={ground}>
          {/* The stage: the union's cog turning beside the page's own heading. */}
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
              {t('editCharacter.heading')}
            </h1>
          </div>

          {/* The life being amended, live — the same card the enlistment paper
              draws, now carrying real levels and points rather than Lvl 1 · 0.
              It dispatches its own faction dress, so it is already in this
              kit's hand, and its portrait opens the same hidden input. */}
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
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={NAME_MAX}
              {...namedField(t('character.namePlaceholder'))}
              style={{ ...fieldBox, fontFamily: BEBAS, letterSpacing: '0.02em' }}
            />
            {counter(
              t('editCharacter.displayNameCount', { count: displayName.length }),
              displayName.length,
              NAME_MAX,
            )}
          </ComposerSection>

          {/* The handle — auto-derived, unique and permanent (ADR-0019). A real
              `readOnly` input rather than a styled div, which could carry no
              accessible name at all now the visible label is gone (#2793). */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              readOnly
              value={`@${character.username}`}
              {...namedField(t('character.handlePlaceholder'))}
              style={{ ...fieldBox, color: QUIET }}
            />
            <p style={{ fontFamily: COURIER, fontSize: 'var(--text-lg)', color: QUIET, margin: 0 }}>
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
              rows={3}
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.6 }}
            />
            {counter(t('editCharacter.storyCount', { count: bio.length }), bio.length, BIO_MAX)}
          </ComposerSection>

          {/* Tagline — the slogan line, not a short bio (#1628). */}
          <ComposerSection rule={false}>
            <textarea
              data-composer-field
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={TAGLINE_MAX}
              {...namedField(t('character.taglinePlaceholder'))}
              rows={2}
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.6 }}
            />
            {counter(
              t('editCharacter.taglineCount', { count: tagline.length }),
              tagline.length,
              TAGLINE_MAX,
            )}
          </ComposerSection>

          {/* Where you're based — an AIRPORT CODE, and the placeholder is the
              only thing that says so (owner ruling on #2793): close enough for
              two players to find each other, too coarse to track anyone.
              Nothing validates the format, so the words in the box are the
              whole of the convention. */}
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
            {counter(
              t('editCharacter.basedCount', { count: location.length }),
              location.length,
              LOCATION_MAX,
            )}
          </ComposerSection>

          {/* Portrait — the shared picker owns the hidden input and the "what's
              chosen" readout (#1149), and `hasCurrentPortrait` is what makes
              "nothing new chosen" read as KEEPING the saved one rather than as
              having none. Dressed rather than left in site chrome: `.btn-outline`
              brings a near-white ground that reads as a browser control dropped
              on the bill. The error ink is this kit's alarm for the measured
              reason the prop's own note gives. */}
          <ComposerSection rule={false} label={t('character.portrait')} labelStyle={sectionLabel}>
            <PortraitPicker
              inputRef={fileInputRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
              hasCurrentPortrait={Boolean(character.avatar_url)}
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

          <ErrorBanner message={error} style={{ color: ALARM }} />

          {/* ── THE STUB. The two slots a create dress has no room for, behind
               the union's perforation: the chapter this life already belongs to,
               and the one act that cannot be undone. Above the report bar
               because that bar is welded to the sheet's bottom edge (#1828) and
               the only place below it is off the paper entirely — see the
               header. The treatment is `editCharacterSlots`'; only the place is
               here. ── */}
          {dashRule}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <FactionRow slug={character.faction_slug} />
            <DeleteCharacter slug={character.faction_slug} deleting={deleting} onDelete={handleDelete} />
          </div>

          {dashRule}

          {/* [Cancel] … [Save] — the global order from #646, with the commit
              stacked as a full-bleed BAR rather than an inline button. */}
          <ComposerFooter
            band
            start={
              <button
                type="button"
                onClick={() => navigate(`/characters/${id}`)}
                style={stencil({
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: QUIET,
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
                    /* Design band: 15 / 0.22em in the label face, which for the
                       Everymen IS Bebas. 15 takes --text-content so the band
                       still outranks this kit's own labels. */
                    fontFamily: BEBAS,
                    fontSize: 'var(--text-content)',
                    letterSpacing: '0.22em',
                    /* The SHEET's frame, NOT `--everymen-frame` — that is the
                       ink the plates are ruled in. */
                    frame: SHEET_FRAME,
                    color: BAR_INK,
                    background: BAR,
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

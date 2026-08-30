/**
 * The Singularity edit-character archetype — A LIFE, RECOMPILED (#2537).
 *
 * DERIVED, not designed (owner rulings 2026-08-27 and 2026-08-28). This is
 * `SingularityCreateCharacter`'s dress on the edit form: the same chassis, the
 * same window bar and lamp cluster, the same readout boxes with a quiet foot,
 * the same one face, the same full-bleed commit band. Nothing new is drawn and
 * no colour is minted. Read that file's header first — every paragraph in it
 * about the terminal's register, its two ornament classes and its `-term-dim`
 * rule is load-bearing here and is not restated.
 *
 * ## What create has no drawn treatment for
 *
 * Edit is the SUPERSET. Four fields carry over (name, bio, tagline, portrait),
 * one is create-only (answer a calling — a character that exists has already
 * answered), and four are edit-only. Three of the four are ordinary fields and
 * take the readout box create already draws: the handle (read-only, its hint in
 * the box's foot), the location, and the two counters. The fourth is the pair
 * that has nowhere in a create dress to land — the FACTION ROW and the
 * DESTRUCTIVE ACTION — and those are MOUNTED from `../editCharacterSlots`,
 * never re-drawn. What they do and what they read as is that file's; where they
 * sit, and the ground they sit on, is this one's.
 *
 * ## Where the two slots sit, and why they get a pane of their own
 *
 * A SECOND TERMINAL PANE below the sheet, outside the `<form>` — the same
 * placement both shipped surfaces chose (`DefaultEditCharacter`: "below Save,
 * outside the card stack, so the irreversible act cannot be read as part of the
 * form"), and the same order, `FactionRow` then `DeleteCharacter`.
 *
 * It is a PANE rather than a bare tail because on this faction the ground is
 * the whole question, and the answer is forced rather than chosen. The slot inks
 * its delete with `factionCssVar(slug, 'card-alarm')`, and
 * `--faction-singularity-card-alarm` is `#fca5a5` in BOTH themes — a pale red
 * cut for this faction's always-near-black card (§6). Measured:
 *
 *   • on the app's own page ground (`--color-bg-page`, #f7f4ee light) it is
 *     1.73:1. The na kit's tail ground does not transfer here at all.
 *   • on this kit's raised panel (`--faction-singularity-term-panel`) it is
 *     9.4:1, which is the row `singularityCreateCharacterGround.test.ts`
 *     already carries as "a counter at its cap".
 *
 * So the slot has to land on a Singularity ground. In LIGHT that is provably
 * incompatible with the neutral tiers the shared slot also reads — a ground
 * dark enough for `#fca5a5` is one where `--color-text-secondary` (#554b3c) is
 * 2.2:1, which is the 2.27:1 `.eslint-legacy-faction-ink.txt` names this sheet
 * for. There is no ground on which both read.
 *
 * ## So the pane REPOINTS the seam rather than the slot redrawing itself
 *
 * `SLOT_INK` below is the same move `SingularityFeedFrame` already makes for the
 * shared feed body, for the same reason and onto the same tokens: the globals
 * were chosen against a near-white page, this chassis is near-black in both
 * themes, so a frame repoints them on its own root. That is the mechanism
 * `local/no-global-ink-on-faction-surface`'s own message names ("the label seam
 * a frame repoints on its own root"), and it is what lets an archetype dress a
 * shared slot without a style prop the slot does not have and without a second
 * copy of it. Every target is a `-term-*` token that already shipped, and every
 * resulting pairing is one `singularityCreateCharacterGround.test.ts` measures.
 *
 * `--color-danger` / `--color-on-danger` are deliberately NOT repointed. The
 * slot's own docblock says why: the confirm's filled button is a GROUND and its
 * ink, not type on a wash, so the chassis never reaches it. ADR-0061 — danger
 * is the platform speaking.
 *
 * `singularityEditCharacterTail.test.tsx` is the guard for all of the above:
 * the pane's ground, the repoint's completeness, and the two behaviours the
 * slots carry.
 *
 * ## Copy is the EDIT page's, the dress is the create page's
 *
 * Deriving takes the chassis, ground, ornament, type and field treatments — not
 * the words. Every string is an existing `forms:editCharacter.*` /
 * `forms:character.*` key. Two na-specific ones are refused: `eyebrow` says
 * "Unaffiliated · this is who you are" and `avatarHint` promises "framed in the
 * full spectrum", and neither is true of a Singularity life. The caps are the
 * edit form's (50 / 500 / 140 / 100), which is what the count keys already
 * print and what `DefaultEditCharacter` sends — not create's tighter pair.
 *
 * ## The one deviation from the create plate, and it is required
 *
 * The fields take `data-composer-field` — the shared focus ring (#2266) — where
 * the create plate deliberately keeps the user agent's. `editCharacterDispatch`
 * sweeps this registry for it in terms ("no edit skin claims that [exception],
 * and one that did would amend this row with its reason"), and the ring is
 * `currentColor` at a negative offset, which on these boxes is the phosphor on
 * the panel it was measured against. Nothing here sets `outline: none`.
 *
 * ## Presentation only
 *
 * `useEditCharacter` stays the single source of state. Nothing here touches the
 * persist path, the delete path, `PortraitPicker` or `useAvatarPicker`. The
 * load / not-found / not-yours guards are the na kit's three lines, on the app's
 * own neutral ground, because no sheet is drawn in those states.
 */
import { useRef, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { mediaUrl } from '../../../utils/media'
import CredentialCard from '../../../components/CredentialCard'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import SingularityLamps from '../../../components/factionMarks/SingularityLamps'
import PortraitPicker from '../PortraitPicker'
import { DeleteCharacter, FactionRow } from '../editCharacterSlots'
import { namedField } from '../characterFields'
import { factionRoleVars } from '../../../utils/factionRoles'
import { TAGLINE_MAX } from '../useCreateCharacter'
import type { EditCharacterState } from '../useEditCharacter'
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

const SLUG = 'singularity'

/* The terminal's two-theme contract (#1023/#1034), named for the ROLE each
   plays. Identical to the create plate's block — see that file's header. */
const CHASSIS = 'var(--faction-singularity-term-bg)'
const CHROME = 'var(--faction-singularity-term-chrome)'
/** The raised box: every field, the portrait key, the tail pane. */
const PANEL = 'var(--faction-singularity-term-panel)'
const INK = 'var(--faction-singularity-term-ink)'
/** Titles and the lit key's edge. */
const BRIGHT = 'var(--faction-singularity-term-bright)'
/** The caption tier — PANEL ONLY on this surface. See the create plate. */
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

/** One face for the whole surface, through the faction's own accessor (§4). */
const FACE = 'var(--sg-path-face)'

/** The design's geometry: radius 2, borderW 1. A terminal has square corners. */
const RADIUS = 2
/** The travelling band's depth, and the sweep's overhang. Ornament (§4a). */
const SWEEP_HEIGHT = 38

/* Ornament, not copy — module constants so they reach JSX as identifiers. */
const PROC_NAME = 'character.edit'
const PROMPT = '>'

/* The EDIT form's caps, which are what the `editCharacter.*Count` keys print
   and what `useEditCharacter` sends. Deliberately not create's NAME_MAX (22) /
   BIO_MAX (160): a life that already exists has more room, and an archetype
   that quietly tightened them would truncate a saved bio on first edit. */
const NAME_CAP = 50
const BIO_CAP = 500
const LOCATION_CAP = 100

/**
 * The repoint the two shared slots get, on the tail pane's own root.
 *
 * See the header. Each target is measured on `-term-panel` (the pane's ground)
 * or on `-term-bg` (the recessed well the faction link and the confirm's cancel
 * become) by `singularityCreateCharacterGround.test.ts`, which is why nothing
 * new is declared and nothing new is invented:
 *
 *   --color-text-primary    → BRIGHT   the confirm's cancel key
 *   --color-text-secondary  → INK      the faction label, its link, the prompt
 *   --color-text-tertiary   → DIM      the faction help and the row's chevron
 *   --color-bg-surface-alt  → CHASSIS  the faction link's well
 *   --color-bg-surface      → CHASSIS  the confirm's cancel ground
 *   --color-border-strong   → BORDER   both of those wells' frames
 *
 * `--color-danger` / `--color-on-danger` are NOT here, on purpose — see header.
 */
const SLOT_INK = {
  '--color-text-primary': BRIGHT,
  '--color-text-secondary': INK,
  '--color-text-tertiary': DIM,
  '--color-bg-surface-alt': CHASSIS,
  '--color-bg-surface': CHASSIS,
  '--color-border-strong': BORDER,
} as CSSProperties

/** The composer's label tier in the terminal's face, on the chassis's own ink. */
function chassisLabel(overrides: CSSProperties = {}): CSSProperties {
  return composerLabelStyle({ fontFamily: FACE, color: INK, ...overrides })
}

export default function SingularityEditCharacter({ state }: { state: EditCharacterState }) {
  const { t } = useTranslation(['forms', 'common'])
  const navigate = useNavigate()
  const sizes = useComposerSizes()
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  /* The three one-line states, on the app's own ground — no sheet is drawn in
     any of them, so the neutral tier is the right tier. Same three lines and
     same order as the na kit, so the two cannot drift. */
  if (state.loading) return <div className="py-8 font-body text-muted">{t('common:loading')}</div>
  if (!character) return <div className="py-8 font-body text-muted">{t('editCharacter.notFound')}</div>
  if (!state.isOwner) return <div className="py-8 font-body text-muted">{t('editCharacter.notOwner')}</div>

  // A freshly cropped portrait (object URL) shows immediately, before Save
  // (#985); otherwise fall back to the persisted avatar.
  const portraitSrc = avatarPreview ?? (character.avatar_url ? mediaUrl(character.avatar_url) : null)

  /** The readout box: a lit panel inside a hard 1px frame. */
  const boxStyle: CSSProperties = {
    background: PANEL,
    border: `1px solid ${BORDER}`,
    borderRadius: RADIUS,
    // So the foot strip's own edge cannot poke past the frame's corners.
    overflow: 'hidden',
  }

  /* Borderless INSIDE the box — the frame belongs to the readout, not to the
     control. No `outline: none`, and `data-composer-field` at every call site:
     see the header. */
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
   * `-term-dim` lives here and only here on this page family — the strip
   * declares the panel as its own background, which is both the ground the ink
   * was measured on and what makes the rule machine-checkable.
   */
  const foot = (lead: ReactNode, count?: ReactNode, atCap = false) => (
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
      <span style={atCap ? { color: ALARM } : undefined}>{count}</span>
    </div>
  )

  const masthead = (
    /* The window bar. Its whole content is aria-hidden chrome. */
    <ComposerMasthead
      background={CHROME}
      style={{
        height: 'auto',
        padding: 'var(--space-sm) var(--space-lg)',
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <div aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        {/* The kit's lamp cluster (#1979), drawn once for all six of this
            faction's window bars. */}
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
    /* The standing raster at inset 0, with the travelling band riding inside
       it and overhanging horizontally so its soft ends never show. */
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
    <ComposerPage
      sizes={sizes}
      style={{ ...factionRoleVars(SLUG, 'sg-path'), fontFamily: FACE, color: INK }}
    >
      {/* A REAL `<form>`: it is what makes Enter commit from a text field, and
          `handleSubmit` calls `preventDefault()` itself. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} ground={ground}>
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
              {t('editCharacter.heading')}
            </h1>
          </div>

          {/* The life being edited, live. The card dispatches its own faction
              dress, so it is already wearing this terminal. */}
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
            <div style={boxStyle}>
              <input
                data-composer-field
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={NAME_CAP}
                {...namedField(t('character.namePlaceholder'))}
                style={inputStyle}
              />
              {foot(
                null,
                t('editCharacter.displayNameCount', { count: displayName.length }),
                displayName.length >= NAME_CAP,
              )}
            </div>
          </ComposerSection>

          {/* The handle. Read-only: `username` is the auto-derived, unique
              identifier (ADR-0019). A real `readOnly` input rather than a
              styled readout, for the reason the na kit gives — a role-less
              <div> cannot carry an accessible name at all, and the visible
              label this field used to have was deleted by #2793. Its hint is
              the foot's lead, which is where this surface keeps quiet text. */}
          <ComposerSection rule={false}>
            <div style={boxStyle}>
              <input
                data-composer-field
                readOnly
                value={`@${character.username}`}
                {...namedField(t('character.handlePlaceholder'))}
                style={inputStyle}
              />
              {foot(t('editCharacter.handleHint'))}
            </div>
          </ComposerSection>

          {/* The story */}
          <ComposerSection rule={false}>
            <div style={boxStyle}>
              <textarea
                data-composer-field
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={BIO_CAP}
                {...namedField(t('character.bioPlaceholder'))}
                rows={4}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }}
              />
              {foot(
                null,
                t('editCharacter.storyCount', { count: bio.length }),
                bio.length >= BIO_CAP,
              )}
            </div>
          </ComposerSection>

          {/* Tagline — a slogan line, not a short bio (#1628). */}
          <ComposerSection rule={false}>
            <div style={boxStyle}>
              <textarea
                data-composer-field
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                maxLength={TAGLINE_MAX}
                {...namedField(t('character.taglinePlaceholder'))}
                rows={2}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }}
              />
              {foot(
                null,
                t('editCharacter.taglineCount', { count: tagline.length }),
                tagline.length >= TAGLINE_MAX,
              )}
            </div>
          </ComposerSection>

          {/* Where you're based — an AIRPORT CODE, and the placeholder is the
              only thing that says so (owner ruling on #2793). Nothing
              validates the format; the words inside the box are the whole
              convention. */}
          <ComposerSection rule={false}>
            <div style={boxStyle}>
              <input
                data-composer-field
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={LOCATION_CAP}
                {...namedField(t('character.locationPlaceholder'))}
                style={inputStyle}
              />
              {foot(
                null,
                t('editCharacter.basedCount', { count: location.length }),
                location.length >= LOCATION_CAP,
              )}
            </div>
          </ComposerSection>

          {/* Portrait — the shared picker owns the hidden input and the "what's
              chosen" readout (#1149); the credential card above opens the same
              input through `fileInputRef`. `hasCurrentPortrait` is the edit
              screen's own case: "nothing new chosen" reads as keeping the
              saved one rather than as having none. The error ink is passed for
              the measured reason the prop's own note gives. */}
          <ComposerSection
            rule={false}
            label={t('character.portrait')}
            labelStyle={{ fontFamily: FACE, color: INK }}
          >
            <PortraitPicker
              inputRef={fileInputRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
              hasCurrentPortrait={Boolean(character.avatar_url)}
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

          <ErrorBanner message={error} style={{ color: ALARM }} />

          {/* The footer's own divider — a dashed hair, drawn ONCE above the
              footer (#1707); the sheet's gap parts the regions. */}
          <ComposerRule style={{ height: 0, background: 'none', borderTop: `1px dashed ${HAIR}` }} />

          {/* [Cancel] … [Save] — the global order from #646, with the commit as
              a full-bleed band flush to the chassis's bottom edge (#1828). */}
          <ComposerFooter
            band
            start={
              <button
                type="button"
                onClick={() => navigate(`/characters/${id}`)}
                style={chassisLabel({
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                })}
              >
                {t('common:actions.cancel')}
              </button>
            }
            end={
              <button
                type="submit"
                disabled={!canSubmit}
                /* The ONE disabled override in the app (#2486): the house
                   neutral would lay a pale slab on a black terminal.
                   `.sg-control-off` re-points the pair at this kit's own panel
                   and dim ink and declares no paint of its own. */
                className="control-off sg-control-off"
                style={{
                  ...composerBandStyle(sizes, {
                    fontFamily: FACE,
                    fontSize: 'var(--text-xl)',
                    letterSpacing: '0.1em',
                    frame: BORDER,
                    color: CTA_INK,
                    background: CTA_BG,
                    boxShadow: CTA_GLOW,
                  }),
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                {saving ? t('editCharacter.saveBusy') : t('editCharacter.saveIdle')}
                {/* The prompt's block cursor, trailing the word. `.sg-cursor`
                    carries the reduced-motion-guarded blink; stilled it stays
                    drawn, because it is punctuation and not an indicator. */}
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

      {/* ── The tail pane: the calling this life already has, and the one act
           that cannot be undone. Outside the <form> and below the commit band,
           in a raised panel of its own — the placement half of "delete must not
           read at the same weight as Save". The treatment half is
           `editCharacterSlots`; the GROUND, and the seam repoint that ground
           forces, are this file's. See the header. ── */}
      <ComposerSheet
        sizes={sizes}
        // The sheet above already spent the gap between the two panes.
        pageStyle={{ paddingTop: 0 }}
        style={{
          ...SLOT_INK,
          background: PANEL,
          border: `1px solid ${BORDER}`,
          borderRadius: RADIUS,
        }}
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

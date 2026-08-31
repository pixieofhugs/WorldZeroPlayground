/**
 * The S.N.I.D.E. edit-character archetype — THE SAME NAME, RE-FLYPOSTED
 * (part of #2537's seven-faction fan-out).
 *
 * DERIVED, and that word has a ruling behind it (owner, 2026-08-27 and again
 * 2026-08-28): this page is `SnideCreateCharacter`'s dress, not a second design.
 * Same chassis (`ComposerPage`/`ComposerSheet`/`ComposerSection`/
 * `ComposerFooter`), same masthead, same `fieldBox`, same censor stripe, same
 * acid cast band. No new sheet, no new mark, no new token, no new copy key.
 * Read that file beside this one: every value here already had a reader there.
 *
 * WHAT CREATE HAS NO DRAWN TREATMENT FOR, and this page must: the character's
 * LOCATION, its permanent handle, the FACTION it already belongs to, and the one
 * irreversible act. The first two are ordinary fields and wear the field
 * treatment create already established. The last two are
 * `../editCharacterSlots`' — MOUNTED, never re-drawn (the 2026-08-27 gate: "a
 * generic treatment inherited by eight files is cheap to change once and
 * expensive to change eight times"). What this file decides about them is only
 * WHERE they sit.
 *
 * ## Where they sit: a SECOND POSTER, pasted under the first
 *
 * `DefaultEditCharacter` puts the two slots below Save and outside the card
 * stack, "so the irreversible act cannot be read as part of the form". This skin
 * agrees with that placement and reaches it in its own register. The S.N.I.D.E.
 * footer is a FULL-BLEED cast band that runs to the sheet's bottom edge, so
 * nothing can follow it inside the sheet — the tail is therefore its own
 * `ComposerSheet` on the same wall, headed by the censor stripe the create page
 * strikes above its footer. Two things flyposted on one wall, which is what this
 * faction's ground is for. Order is `FactionRow` then `DeleteCharacter`, the
 * order both shipped surfaces already mount them in.
 *
 * ## THE MEASUREMENT THIS FAN-OUT WAS WARNED IT WOULD SKIP
 *
 * `DeleteCharacter` inks itself with `factionCssVar(slug, 'card-alarm')`, and
 * the slots file measured that on the na page's washed ground ONLY — its own
 * `ponytail:` note says so and says a faction landing this slot on its own sheet
 * must re-measure. Re-measured, on the wall's four readings:
 *
 *     --faction-snide-card-alarm   1.61 / 1.39 / 1.47 / 1.24  (light)
 *     --faction-snide-wall-alarm   6.67 / 5.79 / 6.11 / 5.13  (light)
 *                                  7.41 / 7.63 / 5.95 / 6.99  (dark)
 *
 * The na claim does NOT transfer — it inverts. `-card-alarm` is pinned bright
 * (#fca5a5) for the slabs pasted ON this wall, which are photocopier-black in
 * BOTH themes (§6); spent as type on the wall itself it is 1.24:1 in the pink
 * corner. This is the same collapse #2333 refused for `-composer-alarm`, one
 * token over, and the ratchet's own header already names this faction as a sheet
 * where a global tier is wrong.
 *
 * SO THE TAIL SHEET RE-POINTS THE TOKEN, exactly as `.snd-praxis-frame` does in
 * `css/03-faction-chrome-1.css` for exactly this reason: "the frame re-points
 * them at the wall's family, which is the cascade doing what a missing prop
 * cannot (#1153)." `DeleteCharacter` takes no ink prop, and it is not this PR's
 * to grow one — a custom property set on an ancestor is the seam that already
 * exists. It is a REFERENCE to an existing token, not a colour: no hex reaches
 * this file, and the swap flips with the wall in the `[data-theme="dark"]`
 * cascade with no `dark ?` anywhere.
 *
 * The slot's other inks are the app's neutrals and they were measured on this
 * ground too rather than assumed — worst wall reading, light / dark:
 * `--color-text-secondary` 5.56 / 7.11, `--color-text-tertiary` 5.60 / 7.63,
 * `--color-text-primary` on the confirm's Cancel 16.52 / 11.43. All clear AA, so
 * the slot is mounted as it stands. `__tests__/snideEditCharacterContrast.test.ts`
 * is those numbers as a runnable check, including the refusal.
 *
 * ## Colour, and the two families this faction keeps apart
 *
 * As on the create page: `-composer-*` is the SHEET's ink and FLIPS with the
 * wall; `-acid` / `-ink` are the PRESS and do not. Type printed on acid reads the
 * press's near-black in both themes. Every value below is a `--faction-snide-*`
 * token and this file writes no `--color-text-*` — it is clean from birth on
 * `local/no-global-ink-on-faction-surface`, which the ink ratchet requires of a
 * new file in as many words.
 *
 * ## Presentation only
 *
 * `useEditCharacter` stays the single source of state. Nothing here touches the
 * persist path, the delete path, `PortraitPicker` or `useAvatarPicker`. The
 * three one-line guards keep the na kit's exact treatment — they are states, not
 * dress, and a loading line in a faction's hand is chrome nobody asked for.
 *
 * PLACEHOLDER-ONLY, EVERY FIELD NAMED (#2793). No visible label anywhere:
 * `namedField()` sets `placeholder` and `aria-label` from one string, and the
 * caps are the EDIT page's (50 / 500 / 140 / 100), not create's — `NAME_MAX` is
 * 22 there and would silently truncate a name a player already has.
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
import { WALL } from '../../../components/factionMarks/snideAtoms'

const SLUG = 'snide'

/* The EDIT form's caps, which are not create's. `useEditCharacter` sends all
   four fields unconditionally and the server takes 50 / 500 / 140 / 100; the
   `editCharacter.*Count` keys below print the same numbers, so they are named
   here rather than spelled twice. `TAGLINE_MAX` is genuinely shared and is
   imported. */
const NAME_MAX = 50
const BIO_MAX = 500
const LOCATION_MAX = 100

/* The sheet's inks — the family that FLIPS with the wall. Same five constants,
   same tokens, as `SnideCreateCharacter` and `SnideEditPraxis` name. */
const INK = 'var(--faction-snide-composer-ink)'
const MUTED = 'var(--faction-snide-composer-muted)'
const FAINT = 'var(--faction-snide-composer-faint)'
const FIELD = 'var(--faction-snide-composer-field)'
const RULE = 'var(--faction-snide-composer-rule)'
const BAR = 'var(--faction-snide-composer-bar)'
/* The alarm the composer passes rather than `--faction-snide-card-alarm`, for
   the reason measured in this file's header. */
const ALARM = 'var(--faction-snide-composer-alarm)'

/* THE PRESS — theme-invariant pigments. */
const ACID = 'var(--faction-snide-acid)'
const PRESS_INK = 'var(--faction-snide-ink)'

const TITLE_FACE = 'var(--faction-snide-font-impact)' /* Anton */
const BODY_FACE = 'var(--faction-snide-font-type)' /* Special Elite */

/* ── Ornament geometry (WORLD_ZERO_STYLE §4a: not layout spacing) ── */
/** The dashed acid rule in the masthead — the flicker of a tube light. */
const MASTHEAD_RULE_HEIGHT = 6
/** The censor stripe: a redaction bar, not a hairline. */
const CENSOR_HEIGHT = 10

/** The label tier with S.N.I.D.E.'s face on it — geometry shared, face local. */
function punkLabel(overrides: CSSProperties = {}): CSSProperties {
  return composerLabelStyle({ fontFamily: BODY_FACE, ...overrides })
}

export default function SnideEditCharacter({ state }: { state: EditCharacterState }) {
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

  // The na kit's exact three lines. A state is not a dress (see the header).
  if (state.loading) return <div className="py-8 font-body text-muted">{t('common:loading')}</div>
  if (!character) return <div className="py-8 font-body text-muted">{t('editCharacter.notFound')}</div>
  if (!state.isOwner) return <div className="py-8 font-body text-muted">{t('editCharacter.notOwner')}</div>

  /** Section heads sit on the wall, where the prose tier is measured. */
  const sectionLabel = { fontFamily: BODY_FACE, color: MUTED }

  /* Every field is a block cut from the sheet: square corners, a drawn hairline,
     one shade off the stock so it reads inset rather than painted on. */
  const fieldBox = {
    width: '100%',
    background: FIELD,
    color: INK,
    border: `1px solid ${RULE}`,
    borderRadius: 0,
    padding: 'var(--space-md)',
    boxSizing: 'border-box',
    fontFamily: BODY_FACE,
    fontSize: 'var(--text-content)',
  } as const

  /** The counter row under a field: faint, and alarmed on the cap. */
  const counter = (text: string, atCap: boolean) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: BODY_FACE, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: atCap ? ALARM : FAINT }}>{text}</span>
    </div>
  )

  /* radius 0, borderW 0 — the sheet has no edge but its own stock, and the stock
     is the wall (#2177). */
  const sheetStyle = { background: WALL, borderRadius: 0 }

  /* A freshly cropped portrait (object URL) shows immediately, before Save
     (#985); otherwise the persisted avatar, which is a stored RELATIVE path and
     needs `mediaUrl` — `CredentialCard` takes a `src` and resolves nothing. */
  const portraitSrc = avatarPreview ?? (character.avatar_url ? mediaUrl(character.avatar_url) : null)

  const masthead = (
    <ComposerMasthead
      background={BAR}
      style={{ height: 'auto', padding: 'var(--space-sm) var(--space-lg)' }}
    >
      {/* Ornament, and hidden as such: the page announces itself with its own
          heading one row down, and the wordmark is a printed thing. */}
      <span aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
        <span
          style={{
            fontFamily: TITLE_FACE,
            // eslint-disable-next-line local/no-raw-style-values -- ornament: the wordmark is a poster face at its drawn optical size, not a tier of the text scale (§4a).
            fontSize: 20,
            lineHeight: 1,
            letterSpacing: '0.06em',
            color: ACID,
            whiteSpace: 'nowrap',
          }}
        >
          {factionName(SLUG)}
        </span>
        {/* The one motion — `ep-pulse`, slowed. Its keyframe and its
            reduced-motion gate both live in the stylesheet; nothing here writes
            an inline `animation:` (#1003). */}
        <span
          className="ep-pulse"
          style={{
            flex: 1,
            height: MASTHEAD_RULE_HEIGHT,
            background: `repeating-linear-gradient(90deg, ${ACID} 0 6px, transparent 6px 10px)`,
            ...({ '--ep-pulse-dur': '3.6s' } as CSSProperties),
          }}
        />
      </span>
    </ComposerMasthead>
  )

  return (
    <ComposerPage sizes={sizes} style={{ fontFamily: BODY_FACE, color: INK }}>
      {/* A REAL `<form>`: it is what makes Enter commit from a text field.
          `handleSubmit` calls `preventDefault()` itself. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        {/* The form poster keeps its bottom inset off the tail poster below it —
            two sheets stacked would otherwise stand a page's worth of air
            apart. */}
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} pageStyle={{ paddingBottom: 0 }}>
          <h1
            style={{
              fontFamily: TITLE_FACE,
              fontSize: sizes.titleSize,
              letterSpacing: '0.02em',
              lineHeight: 1.1,
              color: INK,
              margin: 0,
            }}
          >
            {t('editCharacter.heading')}
          </h1>

          {/* The life as it stands, live — the same card the create page pastes
              up, now carrying real level and points. It dispatches its own
              faction dress, so it is already in this kit's hand. */}
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

          {/* Chosen name, with the handle it can never change beside it. */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={NAME_MAX}
              {...namedField(t('character.namePlaceholder'))}
              style={{ ...fieldBox, fontFamily: TITLE_FACE, letterSpacing: '0.02em' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: BODY_FACE, fontSize: 'var(--text-lg)' }}>
              <span style={{ color: FAINT }}>@{character.username}</span>
              <span style={{ color: displayName.length >= NAME_MAX ? ALARM : FAINT }}>
                {t('editCharacter.displayNameCount', { count: displayName.length })}
              </span>
            </div>
            {/* A READOUT, not a field. `username` is auto-derived and permanent
                (ADR-0019), and the na kit says so with a real read-only input
                because its handle IS a box on that page; here the handle has
                never been a box, so a box that refuses input would be a control
                invented to be disabled. */}
            <span style={{ fontFamily: BODY_FACE, fontSize: 'var(--text-lg)', color: FAINT }}>
              {t('editCharacter.handleHint')}
            </span>
          </ComposerSection>

          {/* The story. */}
          <ComposerSection rule={false}>
            <textarea
              data-composer-field
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={BIO_MAX}
              {...namedField(t('character.bioPlaceholder'))}
              rows={4}
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.7 }}
            />
            {counter(t('editCharacter.storyCount', { count: bio.length }), bio.length >= BIO_MAX)}
          </ComposerSection>

          {/* Tagline — a slogan line, not a short bio (#1628). */}
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
            {counter(t('editCharacter.taglineCount', { count: tagline.length }), tagline.length >= TAGLINE_MAX)}
          </ComposerSection>

          {/* Where you are based — an AIRPORT CODE, and the placeholder is the
              whole of the convention (owner ruling on #2793): close enough for
              two players to find each other, too coarse to track anyone. One of
              the four groups create has no drawn treatment for; it takes this
              skin's field treatment unchanged. */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={LOCATION_MAX}
              {...namedField(t('character.locationPlaceholder'))}
              style={fieldBox}
            />
            {counter(t('editCharacter.basedCount', { count: location.length }), location.length >= LOCATION_MAX)}
          </ComposerSection>

          {/* Portrait — the shared picker owns the hidden input and the "what's
              chosen" readout (#1149); the credential card above opens the same
              input through `fileInputRef`. `hasCurrentPortrait` is what makes
              "nothing new chosen" read as KEEPING the saved one rather than as
              having none — the edit page's whole difference here. The error ink
              is passed for the measured reason in the header. */}
          <ComposerSection
            rule={false}
            label={t('character.portrait')}
            labelStyle={sectionLabel}
          >
            <PortraitPicker
              inputRef={fileInputRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
              hasCurrentPortrait={Boolean(character.avatar_url)}
              error={avatarError}
              buttonStyle={punkLabel({
                cursor: 'pointer',
                borderRadius: 0,
                padding: 'var(--space-sm) var(--space-lg)',
                background: FIELD,
                color: INK,
                border: `1px solid ${RULE}`,
              })}
              statusStyle={{ fontFamily: BODY_FACE, color: MUTED }}
              errorStyle={{ fontFamily: BODY_FACE, color: ALARM, margin: 'var(--space-sm) 0 0' }}
            />
          </ComposerSection>

          <ErrorBanner message={error} style={{ fontFamily: BODY_FACE, color: ALARM }} />

          {/* The censor stripe, this skin's rule: a solid redaction bar rather
              than a hairline, struck ONCE above the footer (#1707). */}
          <ComposerRule style={{ height: CENSOR_HEIGHT, background: BAR }} />

          {/* [Cancel] … [Save] — the global order from #646, stacked rather than
              ranged because S.N.I.D.E.'s cast is a full-bleed bar. */}
          <ComposerFooter
            band
            start={
              <button
                type="button"
                onClick={() => navigate(`/characters/${id}`)}
                style={punkLabel({
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: FAINT,
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
                    fontFamily: TITLE_FACE,
                    fontSize: 'var(--text-content)',
                    letterSpacing: '0.2em',
                    /* This stock has no border of its own — radius 0, borderW 0
                       — so the band's top rule takes the sheet's own rule ink. */
                    frame: RULE,
                    background: ACID,
                    color: PRESS_INK,
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

      {/* ── THE TAIL: a second poster on the same wall ──
          Outside the <form> and below Save, which is the placement both shipped
          edit surfaces already agree on. It carries the alarm re-point for the
          measured reason in this file's header — `-card-alarm` is 1.24:1 on this
          ground and `-wall-alarm` is 5.13:1, and `DeleteCharacter` reads the
          former through `factionCssVar`, so the cascade is the only seam that
          exists (the `.snd-praxis-frame` shape, #1153). */}
      <ComposerSheet
        sizes={sizes}
        pageStyle={{ paddingTop: 'var(--space-lg)' }}
        masthead={<ComposerMasthead background={BAR} height={CENSOR_HEIGHT} />}
        style={{
          ...sheetStyle,
          ...({
            '--faction-snide-card-alarm': 'var(--faction-snide-wall-alarm)',
          } as CSSProperties),
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

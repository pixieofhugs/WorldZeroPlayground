/**
 * Cozy Coven editing a life — THE SPELL SLIP, RE-OPENED (#2537, fan-out of the
 * chassis PR #2788).
 *
 * DERIVED, and derived means one thing here: this is `CovenCreateCharacter`'s
 * dress over this page's fields (owner ruling, 2026-08-27, gate cleared
 * 2026-08-27). Same chassis (`ComposerPage` / `ComposerSheet` / `Composer-
 * Section` / `ComposerFooter`), same masthead, same ground, same `fieldBox`
 * geometry, same cast band, same marks out of `components/factionMarks/coven-
 * Slip`. NOTHING NEW IS DRAWN: no sheet, no SVG, no token, no copy key. If a
 * mark or a ratio is not already answered on the create slip, it is not
 * answered here either — that is what makes the seven-file fan-out cheap.
 *
 * ## What create has that this does not, and the reverse
 *
 * Gone: the calling picker (a life already has one — see the tail) and
 * `startsAt` (meaningless once you have levels). Arrived: `location`, the
 * read-only handle, the FACTION ROW and the DESTRUCTIVE ACTION.
 *
 * ## The two slots are MOUNTED, never re-drawn
 *
 * `FactionRow` and `DeleteCharacter` come from `../editCharacterSlots`, designed
 * once so eight archetypes cannot each bolt a delete somewhere arbitrary. This
 * file decides only WHERE they sit, which that file's contract hands to the
 * archetype in as many words. It also carries the behaviour this page may not
 * lose: `na` routes to the `/factions` DIRECTORY, because `/factions/na` is a
 * 404 for the exact population that branch serves — `factionDetailHref` is that
 * rule said once, and nothing here hand-rolls a href.
 *
 * ## WHERE THEY SIT, and why it is BELOW the sheet rather than on it
 *
 * The tail is OUTSIDE the `<form>` and OUTSIDE the slip, in the sheet's own
 * column, separated by a hairline. That is `DefaultEditCharacter`'s desktop
 * placement — "below Save, outside the card stack, so the irreversible act
 * cannot sit among the ordinary fields" — and both shipped surfaces mount
 * `FactionRow` then `DeleteCharacter` in that order, which this keeps at both
 * widths.
 *
 * It is also the answer the MEASUREMENT picks, which is the part worth writing
 * down. The slip's ground is `--faction-coven-ward-card` under two blooms at
 * `--faction-coven-ward-haze`, and the two slots draw the app's own neutral
 * chrome — a `--color-bg-surface-alt` row, a `--color-border-strong` rule,
 * `--color-text-secondary`. Landing that chrome on the washed sheet puts the
 * faction row's ink at **4.06:1 in dark** under the pink bloom: a fail, on a
 * shared slot this file is forbidden to repaint. Below the sheet the ground is
 * the app's own `--color-bg-page` — the register those neutrals were measured
 * on — and the one genuinely new reading is Coven's `-card-alarm` there:
 *
 *     --faction-coven-card-alarm on --color-bg-page   7.57 light / 9.80 dark
 *
 * That is the row `editCharacterSlots`' `ponytail:` note says a faction
 * archetype owes when it moves this slot to a new ground. It lives in
 * `__tests__/covenEditCharacterContrast.test.ts`, which also pins the tail OFF
 * the sheet so the claim cannot rot silently.
 *
 * ## The caps are the EDIT page's, not create's
 *
 * `NAME_MAX` is 22 and `BIO_MAX` is 160 on the creation form — creation-time
 * design choices, not column widths. The edit form has always allowed 50 / 500 /
 * 100, and `editCharacter.displayNameCount` / `storyCount` / `basedCount` print
 * those numbers. `TAGLINE_MAX` is genuinely shared and is imported.
 *
 * ponytail: the three edit-only caps are restated here because `useEdit-
 * Character` does not export them and `DefaultEditCharacter` hardcodes them too.
 * The ceiling is seven copies once the fan-out lands; the upgrade path is to
 * lift them beside `TAGLINE_MAX` in one pass over the whole registry, not to
 * mint a private module here.
 *
 * ## No autofocus
 *
 * The create slip opens the caret in the name box because a blank form has one
 * obvious first move. An edit form does not — the player came to change one
 * thing and it is usually not their name — so stealing focus would scroll the
 * page to a field they did not ask for.
 *
 * ## Copy, colour, motion
 *
 * Every string is an existing `forms:` key. Light and dark flip entirely through
 * the `[data-theme="dark"]` cascade; there is no `dark ? a : b`. Motion is
 * reached by class only (`.cvn-wheel`, inside `CovenCat`), behind the shared
 * `prefers-reduced-motion` gate.
 *
 * ## Presentation only
 *
 * `useEditCharacter` stays the single source of state for every archetype.
 * Nothing here touches the persist path, the delete path, `PortraitPicker` or
 * the avatar hook. The three one-line guards are drawn here because this
 * archetype is the whole page for a Coven life — the dispatcher hoists nothing.
 *
 * NO FIELD LABELS, AND THAT IS RULED RATHER THAN MISSING (#2793). The form is
 * placeholder-only and `namedField()` sets `placeholder` and `aria-label` from
 * one string, because on these two pages the visible label WAS the accessible
 * name. `editCharacterDispatch.test.tsx` sweeps this registry for both halves,
 * for the shared `[data-composer-field]` focus ring, and for the orphan `<label>`
 * shape #2834 caught on the phone column.
 */
import { useRef, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionName } from '../../../utils/factions'
import { mediaUrl } from '../../../utils/media'
import CredentialCard from '../../../components/CredentialCard'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import PortraitPicker from '../PortraitPicker'
import { LOCATION_FIELD_MIN_WIDTH, namedField } from '../characterFields'
import { DeleteCharacter, FactionRow } from '../editCharacterSlots'
import type { EditCharacterState } from '../useEditCharacter'
import { TAGLINE_MAX } from '../useCreateCharacter'
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
  DEEP,
  DISPLAY,
  GOLD,
  INK,
  LABEL,
  PAGE,
  PINK,
  SHADOW,
  Spark,
} from '../../../components/factionMarks/covenSlip'
import { CovenSigil } from '../../../components/sigil/CovenSigil'

const SLUG = 'coven'

/* The three tokens `covenSlip` does not export — the wash's second pigment, the
   alarm ink and the haze strength — read by name for the same reasons the create
   slip gives beside its own copies. */
const LAV = 'var(--faction-coven-slip-lav)'
const ALARM = 'var(--faction-coven-card-alarm)'
const HAZE = 'var(--faction-coven-ward-haze)'
const CTA_BAND = `linear-gradient(180deg, ${CTA_FROM}, ${CTA_TO})`

/** The skin's geometry: radius 14, borders 1.5, and the sheet's edge is gold. */
const RADIUS = 14
const FIELD_RADIUS = 10
const RULE = `1.5px solid ${BORDER}`

/* ── The edit form's own caps. See the header. ── */
const EDIT_NAME_MAX = 50
const EDIT_BIO_MAX = 500
const EDIT_LOCATION_MAX = 100

/* ── Ornament geometry (WORLD_ZERO_STYLE §4a: not layout spacing) ── */
/** The masthead's faction mark — the composer's 30. */
const BADGE = 30
/** The sparks flanking the wordmark. */
const MAST_SPARK = 11
/** The spark leading the commit. */
const CAST_SPARK = 12
/** The watermark, sized to the column it turns in — the create slip's two. */
const CAT = { desktop: 320, mobile: 240 }
/** Its inset, and its strength — the two figures every page mount already runs. */
const CAT_INSET = 16
const CAT_OPACITY = 0.09

export default function CovenEditCharacter({ state }: { state: EditCharacterState }) {
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

  // The three one-line states, in site chrome on the site's own ground: the
  // page has no dress until it has a character to dress it for.
  if (loading) return <div className="py-8 font-body text-muted">{t('common:loading')}</div>
  if (!character) return <div className="py-8 font-body text-muted">{t('editCharacter.notFound')}</div>
  if (!isOwner) return <div className="py-8 font-body text-muted">{t('editCharacter.notOwner')}</div>

  /** Quicksand, the slip's chrome voice, over the layout's own tracking. */
  const sectionLabel: CSSProperties = { fontFamily: CHROME, color: LABEL }
  /* The inset `ComposerSheet` puts between the viewport and its centred column.
     ponytail: it is restated here because that block owns the figure privately
     and this is the first region on any composer page to sit OUTSIDE the sheet
     and still need to line up with it. The upgrade path is a `pageInset` field
     on `ComposerSizes` when a second surface wants it — not a copy in each of
     the seven archetypes this fan-out lands. */
  const pageInset = sizes.isMobile ? 'var(--space-md)' : 'var(--space-lg)'
  /** Radius 10, 1.5px in `-slip-border`, on the ward PAGE — the composer's row. */
  const fieldBox = {
    width: '100%',
    background: PAGE,
    color: INK,
    border: RULE,
    borderRadius: FIELD_RADIUS,
    padding: 'var(--space-md)',
    boxSizing: 'border-box',
    fontFamily: CHROME,
    fontSize: 'var(--text-content)',
  } as const

  /** The counter row under a field: quiet, and alarmed on the cap. */
  const counter = (text: ReactNode, atCap: boolean) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: CHROME, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: atCap ? ALARM : LABEL }}>{text}</span>
    </div>
  )

  const sheetStyle = {
    background: CARD,
    border: `1.5px solid ${GOLD}`,
    borderRadius: RADIUS,
    boxShadow: SHADOW,
  }

  // A freshly cropped portrait (object URL) shows immediately, before Save
  // (#985); otherwise the persisted avatar.
  const portraitSrc = avatarPreview ?? (character.avatar_url ? mediaUrl(character.avatar_url) : null)

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
        {/* The twinkles are IN the row rather than behind it — see the create
            slip's note on #1983: an absolutely-positioned twinkle field walks a
            star under the lettering as the viewport narrows. */}
        <Spark size={MAST_SPARK} color={GOLD} />
        <CovenSigil size={BADGE} color={DEEP} />
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
      {/* The glow and the lavender at the create slip's two anchors, at the haze
          token's strength rather than a hard 0.7 — the ratios in
          `covenCreateCharacterContrast.test.ts` are measured on exactly this. */}
      <ComposerGround
        inset={0}
        opacity={HAZE}
        background={`radial-gradient(62% 48% at 12% 0%, ${PINK}, transparent 70%), radial-gradient(58% 46% at 100% 100%, ${LAV}, transparent 72%)`}
      />
      {/* The cat, on its own layer so it keeps its own strength instead of
          inheriting the wash's. Bottom-right and fully inside (#2041). */}
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
      {/* A REAL `<form>`: it is what makes Enter commit from a text field.
          `handleSubmit` calls `preventDefault()` itself. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        <ComposerSheet
          sizes={sizes}
          style={sheetStyle}
          masthead={masthead}
          ground={ground}
          // The sheet's own bottom inset is `--space-4xl`, which is the page's
          // last word on the create slip. Here the tail follows, so the sheet
          // hands that clearance to the gap above the hairline instead.
          pageStyle={{ paddingBottom: 'var(--space-xl)' }}
        >
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
            {t('editCharacter.heading')}
          </h1>

          {/* The life as it stands, live — the create slip's preview, now showing
              a character that exists: its real level, its real score, and the
              faction it already answered. The card dispatches its own dress, so
              it is already wearing this slip. */}
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

          {/* Chosen name — and the handle beside it, which is auto-derived and
              permanent (ADR-0019). It is a readout on both forms, so it stays the
              create slip's `@handle` span rather than becoming a control the
              player can put a caret in and not change. */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={EDIT_NAME_MAX}
              {...namedField(t('character.namePlaceholder'))}
              style={{ ...fieldBox, fontFamily: DISPLAY, fontSize: 'var(--text-title)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: CHROME, fontSize: 'var(--text-lg)' }}>
              <span style={{ color: LABEL }}>@{character.username}</span>
              <span style={{ color: displayName.length >= EDIT_NAME_MAX ? ALARM : LABEL }}>
                {t('editCharacter.displayNameCount', { count: displayName.length })}
              </span>
            </div>
          </ComposerSection>

          {/* The story */}
          <ComposerSection rule={false}>
            <textarea
              data-composer-field
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={EDIT_BIO_MAX}
              {...namedField(t('character.bioPlaceholder'))}
              rows={3}
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.7 }}
            />
            {counter(
              t('editCharacter.storyCount', { count: bio.length }),
              bio.length >= EDIT_BIO_MAX,
            )}
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
            {counter(
              t('editCharacter.taglineCount', { count: tagline.length }),
              tagline.length >= TAGLINE_MAX,
            )}
          </ComposerSection>

          {/* Where you're based — an AIRPORT CODE, and the placeholder is the
              only thing that says so (owner ruling on #2793). Nothing validates
              the format, so the words in the box are the whole convention. */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={EDIT_LOCATION_MAX}
              {...namedField(t('character.locationPlaceholder'))}
              style={{ ...fieldBox, maxWidth: LOCATION_FIELD_MIN_WIDTH }}
            />
            {counter(
              t('editCharacter.basedCount', { count: location.length }),
              location.length >= EDIT_LOCATION_MAX,
            )}
          </ComposerSection>

          {/* Portrait — the shared picker owns the hidden input and the readout
              (#1149); the credential card above opens the same input. On this
              page a portrait may already exist, so `hasCurrentPortrait` makes
              "nothing new chosen" read as keeping it rather than as having none.
              Dressed rather than left in site chrome, and the error ink is this
              faction's card alarm for the measured reason the prop documents. */}
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

          <ErrorBanner message={error} style={{ color: ALARM }} />

          {/* THE ONE BRAID (#1707) — the sheet's rule, called exactly once,
              immediately above the footer. */}
          <Braid />

          {/* [Cancel] … [Save] — the global order from #646, stacked because
              Coven's cast is a full-bleed band rather than an inline button. */}
          <ComposerFooter
            band
            start={
              <button
                type="button"
                onClick={() => navigate(`/characters/${id}`)}
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
                    // The one place Coven speaks in the LABEL face rather than
                    // the title one. Design band: 14 / 700 / 0.12em.
                    fontFamily: CHROME,
                    fontSize: 'var(--text-xl)',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    // The SHEET's frame, which for Coven is the gilt edge.
                    frame: GOLD,
                    color: CTA_INK,
                    background: CTA_BAND,
                  }),
                  cursor: saving ? 'wait' : 'pointer',
                  // `.control-off` rather than `opacity: 0.5` (#2486): CTA_BAND
                  // is a gradient, so opacity folded the two-stop fill and the
                  // label together and there was never one colour to fade.
                }}
              >
                <Spark size={CAST_SPARK} color={CTA_INK} />
                {saving ? t('editCharacter.saveBusy') : t('editCharacter.saveIdle')}
              </button>
            }
          />
        </ComposerSheet>
      </form>

      {/* ── The tail: the calling this life already has, and the one act that
           cannot be undone. Outside the <form>, outside the slip, below Save,
           behind a hairline — the placement half of "delete must not read at the
           same weight as Save"; the treatment half is `editCharacterSlots`'.
           On the app's own page ground, which is the register those two slots
           were measured in — see the header. ── */}
      <div data-skin={SLUG} style={{ ...tailPage, paddingLeft: pageInset, paddingRight: pageInset }}>
        <div style={{ maxWidth: sizes.maxWidth, margin: '0 auto' }}>
          <div style={tail}>
            <FactionRow slug={character.faction_slug} />
            <DeleteCharacter slug={character.faction_slug} deleting={deleting} onDelete={handleDelete} />
          </div>
        </div>
      </div>

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

/* The region under the sheet, aligned to the SLIP'S OWN EDGE: the hairline runs
   the paper's width, so the tail reads as what follows the slip rather than as a
   second column beside it. `maxWidth` is `sizes.maxWidth` — the same figure
   `ComposerSheet` centres its column on — and the horizontal inset is
   `pageInset` below. */
const tailPage: CSSProperties = {
  paddingBottom: 'var(--space-4xl)',
}
const tail: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-xl)',
  borderTop: '1px solid var(--color-border)',
  paddingTop: 'var(--space-xl)',
}

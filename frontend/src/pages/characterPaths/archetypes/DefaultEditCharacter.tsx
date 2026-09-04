/**
 * The Default (na) edit-character archetype — the unaffiliated kit, and the skin
 * every unregistered slug lands on (#2537, rebuilt on the chassis in #2991).
 *
 * ## The chassis is the composer's, not a second one
 *
 * `ComposerPage` / `ComposerSheet` / `ComposerSection` / `ComposerFooter` out of
 * `pages/editPraxis/archetypes/shared.tsx` — the same blocks the other seven
 * edit kits already mount, and the same ones `DefaultCreateCharacter` took in
 * #2992. This file used to hand-author a desktop card stack plus a separate
 * phone column, and both of #2991's defects came with that pairing:
 *
 *   1. the phone column offered name, bio and tagline where the desktop plate
 *      offered five fields — no handle and no LOCATION at all, on the
 *      widest-reach archetype in the game (ADR-0030: every life starts `na`);
 *   2. that column drew the delete slot mid-page, ABOVE its sticky Save, which
 *      with the Everymen stub made two of eight kits read `[Delete] … [Save]`.
 *
 * Neither is fixed here so much as dissolved: the chassis is ONE responsive
 * tree, so there is no second field list for a phone to disagree with, and one
 * footer means one place for the tail to follow.
 *
 * **The dress is na's own and is not new.** `DefaultEditPraxis` has shipped this
 * exact kit on this exact chassis since #1181 — ADR-0065 calls that file *"the
 * REFERENCE implementation of the layout contract the seven faction skins
 * inherit"* — and `DefaultCreateCharacter` wears it on this very surface family.
 * Every token below is one of those two files already reads on this ground. NO
 * DESIGN WAS DRAWN FOR THIS AND NONE WAS NEEDED.
 *
 * **This is not a merge.** One file per faction still stands (ADR-0065 §"What
 * this ADR does not do", `frontend/CLAUDE.md`): what is forbidden is a single
 * component with a runtime skin table rendering nine trees. This file keeps its
 * own tree, its own dress, its own ground and its own role map, and stops
 * re-authoring a sheet, a section and a footer from scratch.
 *
 * THE SLUG THAT PICKS THIS ARCHETYPE IS THE EDITED CHARACTER'S, not the
 * viewer's. They are usually the same life and not always, and the page is about
 * the one it edits. `''` / `na` is an unaffiliated life and renders this, full
 * stop — never UA and never the viewer's faction, which is the guard
 * `FactionSelectCard` did not have when its `UaSelectCard` fallback "dressed
 * every unaffiliated and unknown slug in UA's costume" (#796).
 *
 * ## The order, and the tail
 *
 * `heading → intro → CredentialCard → name → handle → bio → tagline → location
 * → portrait → footer → tail` is the order the seven siblings already draw. The
 * TWO EDIT-ONLY SLOTS — the faction row and the destructive action — live in
 * `../editCharacterSlots`, designed once so eight files inherit them rather than
 * each bolting a delete somewhere arbitrary (owner ruling, 2026-08-27). This
 * file decides only WHERE: behind the sheet's one hairline, below Save, so the
 * irreversible act is read after the ordinary one (#2991 AC 2) and cannot be
 * mistaken for part of the form.
 *
 * They sit inside the `<form>` rather than beside it, which costs nothing:
 * `DeleteCharacter` renders `type="button"` throughout and `FactionRow` is a
 * `<Link>`, so neither can submit.
 *
 * ## THE GROUND CHANGED, AND THAT IS WHAT MOVED THE INKS (#2991)
 *
 * This page stood on bare app page under the `.na-backdrop` wash, where the
 * global neutral tiers clear AA and the na card family does not — which is what
 * bought it the `eslint.config.js` exemption from
 * `local/no-global-ink-on-faction-surface`. On a `ComposerSheet` the stock is
 * `--faction-default-card-bg` under the drifting aurora, a different composite
 * with the opposite answer, so the neutrals are GONE from this file and the
 * exemption went with the ground it was measured on. The replacement rows are
 * already in the suite:
 * `pages/editPraxis/archetypes/__tests__/composerGround.test.ts` owns
 * `--faction-default-card-text` and `--faction-default-composer-faint` on this
 * exact composite, and `__tests__/createCharacterContrast.test.ts`'s sheet block
 * owns the bare alarm ink.
 *
 * THE TWO SHARED SLOTS TAKE A DRESS, which is what #2956's seam is for. Their
 * defaults are the global neutrals over `--color-bg-surface-alt`, measured on
 * the washed page — the ground this file just left. Rather than re-measure six
 * globals on the aurora sheet, they are handed na's own composer tokens, which
 * are the pair already measured on it. No token is repointed and no row is
 * weakened: the seam exists precisely so an archetype supplies ink without
 * re-drawing the slot (`editCharacterSlots`'s own header, and its ponytail's
 * named upgrade path).
 *
 * THE TIER SPLIT IS BY GROUND, NOT BY LOUDNESS (#2485): FAINT is the ink for the
 * aurora-WASHED sheet and the field's own MUTED rung is for the opaque box laid
 * on top of it. If you are choosing between them, ask what is behind the type.
 *
 * ## PRESENTATION ONLY
 *
 * `useEditCharacter` is the single source of state for every archetype. Nothing
 * here touches the persist path, the delete path, `PortraitPicker` or
 * `useAvatarPicker`. The load / not-found / not-yours guards are drawn in this
 * file because the dispatcher hands the state straight through
 * (`EditCharacter.tsx`); they are the one thing that renders OUTSIDE the sheet,
 * on the app's own page, and they keep the app's own neutral chrome for it.
 *
 * PLACEHOLDER-ONLY, AND EVERY FIELD NAMES ITSELF (#2793). No field on this page
 * wears a visible label: the owner ruling unified the two character forms'
 * vocabulary AROUND THE CHARACTER — "Character name", "Character bio" — and put
 * those words inside the boxes rather than above them. On an edit form every box
 * is already full, so a returning player reads their own contents rather than a
 * placeholder; that cost is known and was accepted (the #2772 trade).
 * `namedField()` sets `placeholder` and `aria-label` from one string, because
 * here the visible label WAS the accessible name. The fields carry
 * `data-composer-field` for the composer's shared focus ring (#2266, #2825) and
 * suppress no outline of their own.
 *
 * ## The one motion
 *
 * `ep-drift` wanders the aurora, and it is a CLASS: the keyframes live in
 * `index.css` behind the shared `prefers-reduced-motion` guard, and an inline
 * `animation:` would bypass that guard (#1003). Albescent's delta on this page
 * is the credential card's portrait ring, which wears `.spectrum-dial` in
 * `components/CredentialCard.tsx` — see `AlbescentEditCharacter`.
 */
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { mediaUrl } from '../../../utils/media'
import CredentialCard from '../../../components/CredentialCard'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import PortraitPicker from '../PortraitPicker'
import { DeleteCharacter, FactionRow } from '../editCharacterSlots'
import { namedField } from '../characterFields'
import {
  ComposerFooter,
  ComposerPage,
  ComposerRule,
  ComposerSection,
  ComposerSheet,
  ErrorBanner,
  composerLabelStyle,
  useComposerSizes,
} from '../../editPraxis/archetypes/shared'
import {
  ALARM,
  EDGE,
  FAINT,
  FIELD,
  HAIR,
  INK,
  MUTED,
  TITLE_FACE,
  composerGround,
  fieldBox,
  labelStyle,
  primaryStyle,
  sheetStyle,
} from '../../editPraxis/archetypes/defaultComposerDress'
import type { EditCharacterState } from '../useEditCharacter'
import { TAGLINE_MAX } from '../useCreateCharacter'

/* The edit form's own caps. They are NOT the create form's: a life being
 * amended has room the enlistment does not (50/500 against 22/160), and only
 * TAGLINE_MAX is one number shared by both, which is why it is the one import.
 * The same three literals the seven faction kits each hold. */
const NAME_MAX = 50
const BIO_MAX = 500
const LOCATION_MAX = 100

/* THE DRESS IS THE SHARED ONE (#2993). Every ink, {@link EDGE}, the sheet's
 * spectrum frame, the aurora and the field box come from
 * `editPraxis/archetypes/defaultComposerDress` — the same set
 * `DefaultCreateCharacter` and `DefaultProposeTask` read, because all three
 * stand on the same stock. See the header on why none of them is a
 * `--color-text-*`, and that module on why the edge is the mark rung rather
 * than the 12% hairline.
 *
 * The ponytail this file used to carry — "the create form draws the hairline
 * and I may not edit it" — is discharged: importing the same module is what
 * closes #3023's open half, and
 * `pages/editPraxis/archetypes/__tests__/defaultComposerDressEdges.test.tsx`
 * holds the rows for all three consumers. */

/* THE TWO SHARED SLOTS' DRESS (#2956's seam, used as intended — see the header).
 * na's composer tokens, so nothing global lands on the aurora sheet. The
 * destructive ink is left to default: `factionCssVar(slug, 'card-alarm')`
 * resolves to `--faction-default-card-alarm` for this kit, which is the token
 * `createCharacterContrast.test.ts` measures bare on this exact composite.
 *
 * Both plates are CONTROLS — the faction row is a `<Link>`, the confirm's cancel
 * is a `<button>` — so their edge is 1.4.11's question and takes {@link EDGE}
 * rather than the hairline token. See its note. */
const slotLabel = { color: FAINT }
const slotRow = {
  background: FIELD,
  border: `1px solid ${EDGE}`,
  borderRadius: 10,
  color: INK,
}
const slotQuiet = { color: FAINT }
const slotCancel = {
  background: FIELD,
  border: `1px solid ${EDGE}`,
  borderRadius: 10,
  color: INK,
}

export default function DefaultEditCharacter({ state }: { state: EditCharacterState }) {
  const { t } = useTranslation(['forms', 'common'])
  const navigate = useNavigate()
  const sizes = useComposerSizes()
  const fileRef = useRef<HTMLInputElement>(null)
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

  // Three one-line states, drawn on the APP's page rather than on the sheet —
  // there is no sheet yet when they render, so the app's own quiet chrome is
  // the measured answer for them and not this kit's.
  if (loading) return <div className="py-8 font-body text-muted">{t('common:loading')}</div>
  if (!character) return <div className="py-8 font-body text-muted">{t('editCharacter.notFound')}</div>
  if (!isOwner) return <div className="py-8 font-body text-muted">{t('editCharacter.notOwner')}</div>

  // A freshly cropped portrait (object URL) shows immediately, before Save
  // (#985); otherwise fall back to the persisted avatar.
  const portraitSrc = avatarPreview ?? (character.avatar_url ? mediaUrl(character.avatar_url) : null)

  /** The counter row under a field: quiet, and alarmed on the cap. */
  const counter = (label: string, used: number, max: number) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)' }}>
      <span style={{ color: used >= max ? ALARM : FAINT }}>{label}</span>
    </div>
  )

  return (
    <ComposerPage sizes={sizes} style={{ fontFamily: TITLE_FACE, color: INK }}>
      {/* A REAL `<form>`, not a bare button with an onClick: it is what makes
          Enter commit from a text field. `handleSubmit` calls `preventDefault()`
          itself. */}
      <form onSubmit={handleSubmit} data-skin="default">
        <ComposerSheet sizes={sizes} style={sheetStyle} ground={composerGround}>
          <h1
            style={{
              fontFamily: TITLE_FACE,
              fontStyle: 'italic',
              fontWeight: 700,
              fontSize: sizes.titleSize,
              lineHeight: 1.1,
              color: INK,
              margin: 0,
            }}
          >
            {t('editCharacter.heading')}
          </h1>

          {/* The one sentence on this page that says what an unaffiliated life
              IS. It was the desktop plate's hero-band lede and the phone column
              never had it; the key is promoted onto the one tree rather than
              retired with the band, the same call #2992 made for the create
              kit's born-unaffiliated explainer. */}
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-content)', color: FAINT, margin: 0, lineHeight: 1.6 }}>
            {t('editCharacter.intro')}
          </p>

          {/* The life being amended, live — FIRST in the sheet at both widths,
              carrying real levels and points. The card dispatches its own
              faction dress, and for an unaffiliated (or Albescent, #783) life
              that means the spectrum portrait ring: `.spectrum-dial` in
              `CredentialCard`, which is the single mount `AlbescentEditCharacter`
              sets turning. Its portrait opens the same hidden input the picker
              below owns. */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <CredentialCard
              displayName={displayName || character.username}
              handle={character.username}
              factionSlug={character.faction_slug}
              level={character.level}
              score={character.score}
              avatarUrl={portraitSrc}
              onAvatarClick={() => fileRef.current?.click()}
            />
          </div>

          {/* Chosen name */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={NAME_MAX}
              {...namedField(t('character.namePlaceholder'))}
              style={{ ...fieldBox, fontFamily: TITLE_FACE, fontStyle: 'italic', fontSize: 'var(--text-title)' }}
            />
            {counter(
              t('editCharacter.displayNameCount', { count: displayName.length }),
              displayName.length,
              NAME_MAX,
            )}
          </ComposerSection>

          {/* The handle — auto-derived, unique and permanent (ADR-0019). A real
              `readOnly` input rather than the styled <div> it used to be: the div
              could carry no accessible name at all (`aria-label` on a role-less
              element is ignored), and with the visible "Handle" label deleted by
              #2793 that left the readout announcing a bare handle and nothing
              else. */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              readOnly
              value={`@${character.username}`}
              {...namedField(t('character.handlePlaceholder'))}
              /* MUTED, not FAINT. The tier split above is by GROUND, and what is
                 behind this type is the OPAQUE well laid over the sheet rather
                 than the aurora-washed sheet itself — so it takes the well's
                 quiet rung. FAINT here was the rule's own file breaking it.
                 #2992 measures this exact pair at 6.05:1 light / 5.23:1 dark. */
              style={{ ...fieldBox, color: MUTED }}
            />
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)', color: FAINT, margin: 0 }}>
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
              rows={4}
              style={fieldBox}
            />
            {counter(t('editCharacter.storyCount', { count: bio.length }), bio.length, BIO_MAX)}
          </ComposerSection>

          {/* Tagline — a slogan line, not a short bio (#1628). This is the field
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
              style={fieldBox}
            />
            {counter(
              t('editCharacter.taglineCount', { count: tagline.length }),
              tagline.length,
              TAGLINE_MAX,
            )}
          </ComposerSection>

          {/* Where you're based — an AIRPORT CODE, and the placeholder is the
              only thing that says so (owner ruling on #2793): close enough for
              two players to find each other, too coarse to track anyone. Nothing
              validates the format — the column is free text to 100 chars — so
              the words in the box are the whole of the convention.

              IT TAKES THE CHASSIS FIELD'S OWN WIDTH, AND THAT IS THE ANSWER TO
              #2990. The retired desktop plate pinned `maxWidth: 280`, which
              clipped the placeholder's closing parenthesis by 5px; the literal
              was not carried across, and #2990 re-measured on this field. The
              column is 720 less the sheet's 3px frame and its `--space-2xl`
              inset each side — 650 — so the field's inner width is 624 against
              259px of placeholder. It clears by 365px and is deliberately
              uncapped: `LOCATION_FIELD_MIN_WIDTH` is a FLOOR for the kits that
              cap this field, not a width this one owes. */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={LOCATION_MAX}
              {...namedField(t('character.locationPlaceholder'))}
              style={fieldBox}
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
              having none. The credential card above opens the same input. */}
          <ComposerSection rule={false} label={t('character.portrait')} labelStyle={labelStyle}>
            <PortraitPicker
              inputRef={fileRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
              hasCurrentPortrait={Boolean(character.avatar_url)}
              error={avatarError}
              buttonStyle={composerLabelStyle({
                cursor: 'pointer',
                borderRadius: 10,
                padding: 'var(--space-sm) var(--space-lg)',
                background: FIELD,
                color: INK,
                border: `1px solid ${EDGE}`,
              })}
              statusStyle={{ color: FAINT }}
              errorStyle={{ color: ALARM }}
            />
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)', color: FAINT, margin: 'var(--space-md) 0 0', lineHeight: 1.5 }}>
              {t('editCharacter.avatarHint', { initial: (displayName.trim()[0] || character.username[0] || '?').toUpperCase() })}
            </p>
          </ComposerSection>

          <ErrorBanner message={error} style={{ color: ALARM }} />

          {/* THE COMPOSER'S ONE RULE (#1707). Every section passes `rule={false}`
              and the regions are parted by the content column's own gap; the
              form's single hairline sits immediately above the footer. The tail
              below draws a SECOND one, and that is not this rule twice — see
              its own note. */}
          <ComposerRule style={{ background: HAIR }} />

          {/* [Cancel] … [Save] — the global order from #646. na keeps the INLINE
              commit button rather than the full-bleed band (#1828), which is the
              owner ruling that made `composerBandStyle` a per-skin style. */}
          <ComposerFooter
            start={
              <button
                type="button"
                onClick={() => navigate(`/characters/${id}`)}
                style={composerLabelStyle({
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: FAINT,
                })}
              >
                {t('common:actions.cancel')}
              </button>
            }
            end={
              <button
                type="submit"
                disabled={!canSubmit}
                /* `.control-off` rather than an opacity fade (#2486): Save is
                   gated until something has changed, so this is how the page
                   opens. The delete control keeps its own answer —
                   `disabled={deleting}` is a transient busy state, not a state a
                   reader arrives in. */
                className="control-off"
                style={{ ...primaryStyle, cursor: saving ? 'wait' : 'pointer' }}
              >
                {saving ? t('editCharacter.saveBusy') : t('editCharacter.saveIdle')}
              </button>
            }
          />

          {/* ── THE TAIL: the calling this life already has, and the one act that
               cannot be undone — BELOW Save (#2991 AC 2). The intent the desktop
               plate stated is kept exactly, "the irreversible act cannot be read
               as part of the form"; what changed is that the phone no longer
               disagrees with it. The treatment is `editCharacterSlots`'; the
               place, and the ink, are here.

               THE HAIRLINE IS THE TAIL'S OWN, not a second composer rule. The
               retired desktop plate parted this region with a `borderTop` of its
               own for exactly this reason, and #1707's rule is about the FORM's
               regions — which are parted by the column gap, all the way down to
               the one rule above the footer. This one says where the form stops.
               Drop the tail and it goes with it. ── */}
          <ComposerRule style={{ background: HAIR }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
            <FactionRow
              slug={character.faction_slug}
              labelStyle={slotLabel}
              rowStyle={slotRow}
              chevronStyle={slotQuiet}
              helpStyle={slotQuiet}
            />
            <DeleteCharacter
              slug={character.faction_slug}
              deleting={deleting}
              onDelete={handleDelete}
              buttonStyle={{ borderRadius: 10 }}
              promptStyle={slotQuiet}
              cancelStyle={slotCancel}
            />
          </div>
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

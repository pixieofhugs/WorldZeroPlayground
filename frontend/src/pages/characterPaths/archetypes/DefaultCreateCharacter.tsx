/**
 * The Default (na) character-creation archetype — the unaffiliated kit, and the
 * fallback every unregistered slug lands on (#2346, rebuilt on the chassis in
 * #2992).
 *
 * ## The chassis is the composer's, not a second one
 *
 * `ComposerPage` / `ComposerSheet` / `ComposerSection` / `ComposerFooter` out of
 * `pages/editPraxis/archetypes/shared.tsx` — the same blocks the other eight
 * create kits already mount. This file used to hand-author a `twoCol` flex
 * plate plus a separate phone column, and four defects came with that
 * (#2992): a footer with no `flexWrap` that broke `CREATE & STEP OUT`
 * mid-phrase, a credential card that wrapped off the fold below 634px, a
 * hardcoded `1fr 1fr` calling grid that went ragged, and an unclassed conic on
 * the preview's portrait ring.
 *
 * **The dress is na's own and is not new.** `DefaultEditPraxis` has shipped this
 * exact kit on this exact chassis since #1181 — ADR-0065 calls that file *"the
 * REFERENCE implementation of the layout contract the seven faction skins
 * inherit"* — so every token below is one that file already reads on this
 * ground. NO DESIGN WAS DRAWN FOR THIS AND NONE WAS NEEDED, which is the same
 * finding `CovenCreateCharacter`'s header records for its own kit.
 *
 * **This is not a merge.** One file per faction still stands (ADR-0065 §"What
 * this ADR does not do", `frontend/CLAUDE.md`): what is forbidden is a single
 * component with a runtime skin table rendering nine trees. This file keeps its
 * own tree, its own dress, its own ground and its own role map, and stops
 * re-authoring a sheet, a section and a footer from scratch.
 *
 * ## One responsive tree, no phone branch
 *
 * `useComposerSizes()` picks the size set and there is one tree at two widths.
 * The first-run phone column retired with #2992 — with it went the "Step 1 of 2
 * · Identity" framing, the 104px photo ring, the sticky Create bar, and the
 * deliberate absence of `bio`/`tagline` on the phone (#516, #1628). na is the
 * ninth kit offering the same fields at both widths; Coven and the Ephemerists
 * already deviate this way on purpose and say so in their own headers. Nothing
 * below is a fixed-px layout grid (SPEC-faction-ui-profile §1a).
 *
 * ## The order, and why it is not this file's to choose
 *
 * `heading → CredentialCard → name → bio → tagline → portrait → calling picker
 * → footer` is the order all eight siblings already draw (#2995's census). The
 * calling picker goes AFTER the portrait section for that reason and no other.
 * The footer keeps the global `[Cancel] … [Create]` order settled in #646, and
 * na keeps the INLINE commit button rather than the full-bleed band — that is
 * the owner ruling on #1828 and the reason `composerBandStyle` is a per-skin
 * style rather than something `ComposerFooter` does on its own.
 *
 * ## PRESENTATION ONLY
 *
 * `useCreateCharacter` is the single source of state for all nine archetypes.
 * Nothing here touches the submit path, the payload, `PortraitPicker` or
 * `useAvatarPicker`. THE DEFAULT IS THE `na` KIT, NOT UA AND NOT THE VIEWER'S
 * FACTION: an empty `factionSlug` means born unaffiliated and renders this, full
 * stop (#796, the third instance of #418/#636). `albescent` reaches here too and
 * deliberately — it is pickable at creation since #2399, and every Albescent
 * registration is a WRAPPER rather than a skin (ADR-0027).
 *
 * NO FIELD LABELS, AND THAT IS RULED RATHER THAN MISSING (#2793). This form is
 * placeholder-only: the name, bio and catchphrase boxes carry their own words,
 * shared with Edit Character so the two surfaces speak one vocabulary — around
 * the CHARACTER, with no pronouns. `namedField()` sets `aria-label` from that
 * same string, because here the visible label WAS the accessible name. The
 * portrait key and the calling picker keep their headings: those head groups of
 * BUTTONS, are section headings rather than field labels, and `ComposerSection`
 * draws them as a `<span>` when no `htmlFor` is passed — which is the shared
 * answer, not a local one.
 *
 * ## The one motion
 *
 * `ep-drift` wanders the aurora, and it is a CLASS: the keyframes live in
 * `index.css` behind the shared `prefers-reduced-motion` guard, and an inline
 * `animation:` would bypass that guard (#1003). Albescent's delta on this page
 * is the credential card's portrait ring, which wears `.spectrum-dial` in
 * `components/CredentialCard.tsx` — see `AlbescentCreateCharacter`.
 */
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { factionCssVar, factionName, factionSpectrumSheet } from '../../../utils/factions'
import CredentialCard from '../../../components/CredentialCard'
import FactionSigil from '../../../components/sigil/FactionSigil'
import ImageEditModal from '../../../components/imageEdit/ImageEditModal'
import { AVATAR_ASPECT } from '../../../components/imageEdit/imageEditHelpers'
import PortraitPicker from '../PortraitPicker'
import { namedField } from '../characterFields'
import {
  ComposerFooter,
  ComposerGround,
  ComposerPage,
  ComposerRule,
  ComposerSection,
  ComposerSheet,
  ErrorBanner,
  composerLabelStyle,
  useComposerSizes,
} from '../../editPraxis/archetypes/shared'
import {
  NAME_MAX,
  BIO_MAX,
  TAGLINE_MAX,
  type CreateCharacterState,
} from '../useCreateCharacter'

/* The na kit's inks and grounds, named once — the same set
 * `DefaultEditPraxis` reads, because this page now stands on the same stock.
 *
 * THE APP'S NEUTRAL TIERS ARE GONE, AND SO IS THE LINT EXEMPTION THEY BOUGHT
 * (#2992). `--color-text-secondary` / `-tertiary` were right here while the page
 * had no card: type sat on `--color-bg-page` under the `.na-backdrop` wash,
 * where the neutrals clear AA and the na card family does not. On a
 * `ComposerSheet` the ground is `--faction-default-card-bg` washed by the
 * aurora, which is a different measurement with a different answer — the one
 * `pages/editPraxis/archetypes/__tests__/composerGround.test.ts` already makes
 * for this exact composite. The `eslint.config.js` exemption for this file went
 * with the ground it was measured on; `__tests__/createCharacterContrast.test.ts`
 * carries the sheet-ground rows.
 *
 * THE TIER SPLIT IS BY GROUND, NOT BY LOUDNESS (#2485), and the names read
 * backwards because of it: FAINT is the ink for the aurora-WASHED sheet and
 * MUTED is the ink for the opaque field laid on top of it. If you are choosing
 * between them, ask what is behind the type. */
const INK = 'var(--faction-default-card-text)'
const MUTED = 'var(--faction-default-card-muted)'
const FAINT = 'var(--faction-default-composer-faint)'
/* NOT `--color-danger`, and this is a fix rather than a preference (#2346,
 * #1302): a shared functional ink inside a faction frame takes that faction's
 * own card family, measured on the frame's ground. */
const ALARM = 'var(--faction-default-card-alarm)'
const FIELD = 'var(--faction-default-composer-field)'
const BORDER = 'var(--faction-default-border)'
const HAIR = 'var(--faction-default-composer-hair)'
const ON_ACCENT = 'var(--faction-default-on-accent)'

/* The design's title face is Lora (--font-display); the label face is Courier
 * Prime (--font-body), which is what `composerLabelStyle` already defaults to.
 * The token names read backwards here and that is not a mistake. */
const TITLE_FACE = 'var(--font-display)'

const labelStyle = { color: FAINT }

/* THE SHEET'S FRAME IS THE SPECTRUM (#2520) — a 3px transparent border with the
   ramp painted into the border box under it, the same `border-box` idiom
   `DefaultTaskCard`, `DefaultPraxisCard`, `DefaultSeal` and `DefaultEditPraxis`
   all wear. Only the width is stated here; the composition belongs to the
   helper, because the ramp has to be appended to all three of the sheet's
   background lists. */
const sheetStyle = {
  border: '3px solid transparent',
  ...factionSpectrumSheet(),
  boxShadow: '0 16px 40px -24px var(--color-cast-shadow)',
}

/* na's drifting aurora, clipped to the sheet by `ComposerSheet`'s own
   `overflow: hidden` (#1028). */
const ground = (
  <ComposerGround
    background="var(--faction-default-aurora)"
    opacity="var(--faction-default-aurora-opacity)"
    filter="var(--faction-default-aurora-filter)"
    mixBlendMode="var(--faction-default-aurora-blend)"
    animated
  />
)

const fieldBox = {
  width: '100%',
  background: FIELD,
  color: INK,
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  padding: 'var(--space-md)',
  boxSizing: 'border-box',
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-content)',
  lineHeight: 1.6,
  resize: 'vertical',
} as const

/** The commit button's paint, minus the busy cursor the form adds. */
const primaryStyle = composerLabelStyle({
  border: 'none',
  borderRadius: 10,
  padding: 'var(--space-md) var(--space-xl)',
  color: ON_ACCENT,
  background: INK,
  fontWeight: 700,
})

export default function DefaultCreateCharacter({ state }: { state: CreateCharacterState }) {
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

  /** The counter row under a prose field: quiet, and alarmed on the cap. */
  const counter = (used: number, max: number) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)' }}>
      <span style={{ color: used >= max ? ALARM : FAINT }}>
        {t('createCharacter.charsLeft', { count: max - used })}
      </span>
    </div>
  )

  /** A section heading with its `· optional` tail in sentence case. */
  const optionalHead = (label: string, tail: string) => (
    <>
      {label} <span style={{ textTransform: 'none', letterSpacing: 0 }}>{tail}</span>
    </>
  )

  return (
    <ComposerPage sizes={sizes} style={{ fontFamily: TITLE_FACE, color: INK }}>
      {/* A REAL `<form>`, not a bare button with an onClick: it is what makes
          Enter commit from a text field. `handleSubmit` calls `preventDefault()`
          itself. */}
      <form onSubmit={handleSubmit} data-skin="default">
        <ComposerSheet sizes={sizes} style={sheetStyle} ground={ground}>
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
            {t('createCharacter.heading')}
          </h1>

          {/* The life being written, live — FIRST in the sheet at both widths,
              which is the whole of defect 2. The card dispatches its own faction
              dress, so it is already wearing the picked calling. */}
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
              style={{ ...fieldBox, fontFamily: TITLE_FACE, fontStyle: 'italic', fontSize: 'var(--text-title)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)' }}>
              <span style={{ color: FAINT }}>@{handle}</span>
              <span style={{ color: displayName.length >= NAME_MAX ? ALARM : FAINT }}>
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
              style={fieldBox}
            />
            {counter(bio.length, BIO_MAX)}
          </ComposerSection>

          {/* Tagline — a slogan line, not a short bio (#1628). Its counter turns
              alarm on the cap the way the name field's does: this is the field the
              profile header's identity slot is laid out against, so running out of
              room is worth seeing before the text stops appearing. */}
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
            {counter(tagline.length, TAGLINE_MAX)}
          </ComposerSection>

          {/* Portrait — the shared picker owns the hidden input and the "what's
              chosen" readout (#1149); the credential card above opens the same
              input through `fileInputRef`. */}
          <ComposerSection
            rule={false}
            label={optionalHead(t('character.portrait'), t('createCharacter.optional'))}
            labelStyle={labelStyle}
          >
            <PortraitPicker
              inputRef={fileInputRef}
              onChange={handleAvatarChange}
              chosenFile={avatarFile}
              error={avatarError}
              buttonStyle={composerLabelStyle({
                cursor: 'pointer',
                borderRadius: 10,
                padding: 'var(--space-sm) var(--space-lg)',
                background: FIELD,
                color: INK,
                border: `1px solid ${BORDER}`,
              })}
              statusStyle={{ color: FAINT }}
              errorStyle={{ color: ALARM }}
            />
          </ComposerSection>

          {/* Answer a calling — only when the account holds invitations
              (ADR-0019). SINGLE COLUMN, which is defect 3: the `1fr 1fr` grid
              this used to draw went ragged the moment one name wrapped, and the
              eight siblings all stack. */}
          {showPicker && (
            <ComposerSection
              rule={false}
              label={optionalHead(t('createCharacter.callingLabel'), t('createCharacter.callingOptional'))}
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
                      /* NOT `composerLabelStyle` — it forces uppercase and its
                         own tracking, and the calling's own card face below
                         would inherit both. */
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        width: '100%',
                        cursor: 'pointer',
                        textAlign: 'left',
                        background: FIELD,
                        border: `1px solid ${BORDER}`,
                        borderRadius: 10,
                        padding: 'var(--space-md) var(--space-lg)',
                        // The faction's own hue as a RING, never as ink (§3).
                        boxShadow: selected ? `0 0 0 2px ${factionCssVar(slug)}` : 'none',
                      }}
                    >
                      {/* The faction's own mark, from the dispatcher every other
                          chooser draws (#2223). The row's ground is na's own
                          field either way, so the mark keeps its default ink. */}
                      <FactionSigil slug={slug} size={18} />
                      <span
                        style={{
                          fontFamily: factionCssVar(slug, 'card-font'),
                          fontSize: 'var(--text-content)',
                          color: MUTED,
                        }}
                      >
                        {factionName(slug)}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-content)', color: FAINT, margin: 0, lineHeight: 1.6 }}>
                {t('createCharacter.callingHint')}
              </p>
            </ComposerSection>
          )}

          {/* The born-unaffiliated explainer. It was `createCharacter.mobile.help`
              and drawn on the phone only; the key moved out of the retired
              `mobile.*` block rather than dying with it, because it is the one
              sentence on this page that says what being born `na` means and the
              wide branch never had it (#2992). */}
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-content)', color: FAINT, margin: 0, lineHeight: 1.6 }}>
            {t('createCharacter.help')}
          </p>

          <ErrorBanner message={error ?? ''} style={{ color: ALARM }} />

          {/* THE ONE RULE (#1707). Every section passes `rule={false}` and the
              regions are parted by the content column's own gap; the single
              hairline on the page sits immediately above the footer. */}
          <ComposerRule style={{ background: HAIR }} />

          {/* [Cancel] … [Create] — the global order from #646. `ComposerFooter`
              wraps, which is defect 1: the hand-rolled row this replaces was a
              bare `display: flex` with no `flexWrap` inside a 440px column, so
              the commit label broke mid-phrase. na keeps the INLINE button
              rather than the full-bleed band (#1828). */}
          <ComposerFooter
            start={
              <>
                <button
                  type="button"
                  onClick={() => navigate('/')}
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
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-content)', color: FAINT }}>
                  {t('createCharacter.startsAt')}
                </span>
              </>
            }
            end={
              <button
                type="submit"
                disabled={!canSubmit}
                /* `.control-off` rather than an opacity fade (#2486): the form
                   gates this control, and a gated control that reads like a live
                   one is the inverse defect the phone bar used to have. */
                className="control-off"
                style={{ ...primaryStyle, cursor: submitting ? 'wait' : 'pointer' }}
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

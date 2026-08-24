/**
 * The S.N.I.D.E. character-creation archetype — A NEW NAME FLYPOSTED TO THE WALL
 * (#2349, epic #2346).
 *
 * NO DESIGN WAS DRAWN FOR THIS, and the owner's ruling is that none is needed:
 * the two surfaces this faction already ships carry the whole register between
 * them. `components/taskCard/SnideTaskCard` holds the ground, the inks and the
 * faces; `pages/editPraxis/archetypes/SnideEditPraxis` holds that same kit
 * applied to a FORM — labelled fields, counters, a primary commit, a cancel path
 * — which is structurally what this page is. This file is that dress over this
 * page's fields. It draws no new mark and mints no token: the wall comes from
 * `factionMarks/snideAtoms`, the chassis from the composer's own blocks, and
 * every colour is a `--faction-snide-*` custom property that already had a
 * reader.
 *
 * ## The chassis is the composer's, not a second one
 *
 * `ComposerPage` / `ComposerSheet` / `ComposerSection` / `ComposerFooter` /
 * `composerBandStyle` are geometry with no praxis in them, so this page mounts
 * the blocks the composer mounts rather than restating a sheet, a masthead slot
 * and a full-bleed cast bar. The CONTROLS in `editPraxis/archetypes/controls.tsx`
 * are the half that does not fit — every one of them takes an `EditPraxisState`
 * — so the fields below are plain inputs wearing this skin's `fieldBox`, which is
 * the same geometry row (`radius 0`, a 1px drawn hairline, one shade off the
 * stock) that file's fields wear. Nothing under `pages/editPraxis/` is written
 * to; it is read as the reference the issue names it as.
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
 * `factions.json` — a name, not a voice — and it is `aria-hidden`, because a
 * masthead that announced itself would put the faction's chrome ahead of the
 * page's first real content.
 *
 * ONE FIELD-SET DEVIATION FROM THE DEFAULT, the same one the Ephemerists plate
 * carries and worth the same second pair of eyes. The na kit's PHONE branch
 * deliberately offers no prose fields — it is framed as "Step 1 of 2 · Identity"
 * and has never drawn `bio`, with `tagline` following `bio` so the two stay a
 * pair (#1628). This skin offers all six fields at both widths, because #2349
 * states the field list once and unconditionally, and because the two-step
 * framing is the na phone skin's own chrome rather than something a faction
 * dress wears.
 *
 * ## Colour — and the composite, which is the whole hazard on this faction
 *
 * Every value is a `--faction-snide-*` token, so the register flips in the
 * `[data-theme="dark"]` cascade with no `dark ?` branch anywhere below. Two
 * families are kept apart exactly as the composer keeps them: `-composer-*` is
 * the SHEET's ink and FLIPS, while `-acid` / `-ink` / `-paper` are the PRESS and
 * do not. Type printed on an acid ground reads the press's near-black in both
 * themes — paper-white on acid green measures 1.07:1.
 *
 * THE GROUND IS THE FLYPOSTED WALL, WHICH IS FOUR GROUNDS. `WALL` is a ramp from
 * `-wall` to `-wall-deep` with an acid wash off the top-left corner and a pink
 * one off the bottom-right, and a page this tall puts its footer inside the pink
 * one. #2450 is 36 nightly-e2e failures that are three pairings on this faction's
 * note ground, all specified correctly against the paper and failing against the
 * washes stacked on it, so nothing here is trusted flat. Measured on all four
 * readings, in both themes, worst case first:
 *
 *     ink                              worst (light)   worst (dark)   where
 *     -composer-ink   heading, fields      11.89           13.29       pink / acid corner
 *     -composer-muted labels, hint          5.03            9.39
 *     -composer-faint counters, @handle     4.58            4.73
 *     -composer-alarm the cap, the error    4.98            5.62
 *
 * The alarm's BARE reading is the one row this PR adds to
 * `factionContrast.test.ts` (SNIDE_WALL_INKS). The generator already measured it
 * UNDER the danger veil, for the error BANNER; the portrait picker's error line
 * and a counter at its cap carry the same ink with no veil beneath it, and "a
 * reading through a veil does not vouch for the reading without one" is that
 * file's own rule (#1028 in the direction people forget).
 *
 * ONE INK IS DELIBERATELY ABSENT. `-composer-acid-ink` is 3.71:1 in the wall's
 * pink corner and is therefore never spent as type on the wall here; it is
 * measured on `-composer-field` (4.71:1 light), which is where the composer
 * spends it, and this page has no field caption that needs it. Acid stays what
 * §3 says a faction hue is — a FILL: the wordmark on the black bar (15.55:1),
 * the selected calling, and the cast band, all carrying `-ink` on top.
 *
 * ## Presentation only
 *
 * `useCreateCharacter` stays the single source of state for every archetype.
 * Nothing here touches the submit path, the payload, `PortraitPicker` or
 * `useAvatarPicker`, and THE PICKER STAYS DRAWN in this skin — a player must be
 * able to change their mind, or clear the pick and be born unaffiliated, which
 * returns the page to the Default archetype.
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
import { WALL } from '../../../components/factionMarks/snideAtoms'

const SLUG = 'snide'

/* The sheet's inks — the family that FLIPS with the wall. Same five constants,
   same tokens, as `SnideEditPraxis` names. */
const INK = 'var(--faction-snide-composer-ink)'
const MUTED = 'var(--faction-snide-composer-muted)'
const FAINT = 'var(--faction-snide-composer-faint)'
const FIELD = 'var(--faction-snide-composer-field)'
const RULE = 'var(--faction-snide-composer-rule)'
const BAR = 'var(--faction-snide-composer-bar)'
/* The alarm the composer passes rather than `--faction-snide-card-alarm`: the
   CARD is photocopier-black in both themes (§6) so that rung is pinned bright
   and reads 1.56:1 on the light stock, while THIS ground flips. */
const ALARM = 'var(--faction-snide-composer-alarm)'

/* THE PRESS — theme-invariant pigments. `ACID` is acid as a DRAWN THING and
   `PRESS_INK` is the near-black that prints on it in either cascade. */
const ACID = 'var(--faction-snide-acid)'
const PRESS_INK = 'var(--faction-snide-ink)'

const TITLE_FACE = 'var(--faction-snide-font-impact)' /* Anton */
const BODY_FACE = 'var(--faction-snide-font-type)' /* Special Elite */

/* ── Ornament geometry (WORLD_ZERO_STYLE §4a: not layout spacing) ── */
/** The dashed acid rule in the masthead — the flicker of a tube light. */
const MASTHEAD_RULE_HEIGHT = 6
/** The censor stripe: a redaction bar, not a hairline. */
const CENSOR_HEIGHT = 10
/** The mark each calling wears in the picker — the size every other chooser draws (#2223). */
const PICKER_SIGIL = 18

/** The label tier with S.N.I.D.E.'s face on it — geometry shared, face local. */
function punkLabel(overrides: CSSProperties = {}): CSSProperties {
  return composerLabelStyle({ fontFamily: BODY_FACE, ...overrides })
}

export default function SnideCreateCharacter({ state }: { state: CreateCharacterState }) {
  const { t } = useTranslation('forms')
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
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: BODY_FACE,
    fontSize: 'var(--text-content)',
  } as const

  /** The counter row under a field: faint, and alarmed on the cap. */
  const counter = (used: number, max: number) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: BODY_FACE, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: used >= max ? ALARM : FAINT }}>
        {t('createCharacter.charsLeft', { count: max - used })}
      </span>
    </div>
  )

  /* radius 0, borderW 0 — the sheet has no edge but its own stock, and the stock
     is the wall (#2177). */
  const sheetStyle = { background: WALL, borderRadius: 0 }

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
            reduced-motion gate both live in `index.css`; nothing here writes an
            inline `animation:` (#1003). */}
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
      {/* A REAL `<form>`, not a bare button with an onClick. The Default skin
          submits through one and so must this: it is what makes Enter commit
          from a text field. `handleSubmit` calls `preventDefault()` itself. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead}>
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
            {t('createCharacter.heading')}
          </h1>

          {/* The life being pasted up, live. The card dispatches its own faction
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
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={NAME_MAX}
              placeholder={t('createCharacter.namePlaceholder')}
              autoFocus
              style={{ ...fieldBox, fontFamily: TITLE_FACE, letterSpacing: '0.02em' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: BODY_FACE, fontSize: 'var(--text-lg)' }}>
              <span style={{ color: FAINT }}>@{handle}</span>
              <span style={{ color: displayName.length >= NAME_MAX ? ALARM : FAINT }}>
                {t('createCharacter.charsLeft', { count: NAME_MAX - displayName.length })}
              </span>
            </div>
          </ComposerSection>

          {/* About */}
          <ComposerSection rule={false} label={t('createCharacter.aboutLabel')} labelStyle={sectionLabel}>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={BIO_MAX}
              placeholder={t('createCharacter.aboutPlaceholder')}
              rows={3}
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.7 }}
            />
            {counter(bio.length, BIO_MAX)}
          </ComposerSection>

          {/* Tagline — a slogan line, not a short bio (#1628). Its counter turns
              alarm on the cap the way the name field's does: this is the field
              the profile header's identity slot is laid out against, so running
              out of room is worth seeing before the text stops appearing. */}
          <ComposerSection rule={false} label={t('createCharacter.taglineLabel')} labelStyle={sectionLabel}>
            <textarea
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={TAGLINE_MAX}
              placeholder={t('createCharacter.taglinePlaceholder')}
              rows={2}
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.7 }}
            />
            {counter(tagline.length, TAGLINE_MAX)}
          </ComposerSection>

          {/* Portrait — the shared picker owns the hidden input and the "what's
              chosen" readout (#1149); the credential card above opens the same
              input through `fileInputRef`. Dressed rather than left in site
              chrome: `.btn-outline` brings its own near-white ground and neutral
              ink, which reads as a browser control dropped on the wall. The
              error ink is passed for the measured reason in this file's header —
              the neutral danger red does not clear this ground in light. */}
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

          {/* Answer a calling — only when the account holds invitations
              (ADR-0019). It stays drawn in this skin: tapping this faction must
              not be a one-way door, and clearing the pick returns the page to
              the Default archetype. */}
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
                      /* NOT `punkLabel` — it forces `uppercase` and its own
                         tracking, and both would be inherited by the name below.
                         A calling wears its OWN card face at its own case, which
                         is what every other chooser draws. */
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        width: '100%',
                        cursor: 'pointer',
                        textAlign: 'left',
                        borderRadius: 0,
                        padding: 'var(--space-md) var(--space-lg)',
                        background: selected ? ACID : FIELD,
                        border: `1px solid ${selected ? ACID : RULE}`,
                        // The faction's own hue as a RING, never as ink (§3) —
                        // the row's type stays on this skin's measured pair.
                        boxShadow: selected ? `0 0 0 2px ${factionCssVar(slug)}` : 'none',
                      }}
                    >
                      {/* The faction's own mark, from the dispatcher every other
                          chooser draws (#2223). */}
                      <FactionSigil slug={slug} size={PICKER_SIGIL} />
                      <span
                        style={{
                          fontFamily: factionCssVar(slug, 'card-font'),
                          fontSize: 'var(--text-content)',
                          color: selected ? PRESS_INK : INK,
                        }}
                      >
                        {factionName(slug)}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p style={{ fontFamily: BODY_FACE, fontSize: 'var(--text-content)', color: MUTED, margin: 0, lineHeight: 1.55 }}>
                {t('createCharacter.callingHint')}
              </p>
            </ComposerSection>
          )}

          <ErrorBanner message={error ?? ''} style={{ fontFamily: BODY_FACE, color: ALARM }} />

          {/* The censor stripe, this skin's rule: a solid redaction bar rather
              than a hairline, struck ONCE above the footer (#1707) rather than
              between the sections — the sheet's own gap parts the regions. */}
          <ComposerRule style={{ height: CENSOR_HEIGHT, background: BAR }} />

          {/* [Cancel] … [Create] — the global order from #646, stacked rather
              than ranged because S.N.I.D.E.'s cast is a full-bleed bar and not a
              button. The exits keep the start, the cast keeps the end. */}
          <ComposerFooter
            band
            start={
              <>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  style={punkLabel({
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: FAINT,
                    textDecoration: 'underline',
                  })}
                >
                  {t('createCharacter.cancel')}
                </button>
                <span style={{ fontFamily: BODY_FACE, fontSize: 'var(--text-content)', color: MUTED }}>
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
                    /* The composer's own band: 15 / 0.2em in the TITLE face. A
                       bar the width of the sheet set at the label tier reads as
                       a rule rather than as the page's one irreversible act, so
                       15 takes --text-content. */
                    fontFamily: TITLE_FACE,
                    fontSize: 'var(--text-content)',
                    letterSpacing: '0.2em',
                    /* This stock has no border of its own — radius 0, borderW 0
                       — so the band's top rule takes the sheet's own rule ink. */
                    frame: RULE,
                    background: ACID,
                    color: PRESS_INK,
                  }),
                  cursor: submitting ? 'wait' : 'pointer',
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

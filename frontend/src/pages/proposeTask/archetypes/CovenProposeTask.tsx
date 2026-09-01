/**
 * Cozy Coven proposing a task — THE SPELL SLIP, WRITTEN FOR A TASK THAT DOES NOT
 * EXIST YET (#2538, fan-out of the chassis that shipped with `na` + Albescent).
 *
 * DERIVED, and derived means exactly what it meant on the edit slip (#2537):
 * this is `CovenCreateCharacter`'s dress over this page's fields (owner ruling,
 * 2026-08-23, re-stated 2026-08-24). Same chassis (`ComposerPage` /
 * `ComposerSheet` / `ComposerSection` / `ComposerFooter`), same masthead, same
 * two blooms at the same haze token, same cat at the same alpha and inset, same
 * `fieldBox` geometry, same cast band, same marks out of
 * `components/factionMarks/covenSlip`. NOTHING NEW IS DRAWN: no sheet, no SVG,
 * no token, no copy key, no colour. If a mark or a ratio is not already answered
 * on the create slip, it is not answered here either — which is what makes the
 * seven-file fan-out cheap.
 *
 * THE SLUG THIS PAGE WEARS IS THE TASK'S, NOT THE VIEWER'S. `ProposeTask.tsx`
 * dispatches on `state.factionSlug` — the faction the task is being proposed
 * FOR — so this file is on screen exactly while the Coven chip is picked, and
 * the page returns to the na kit the moment the pick changes. The archetype
 * therefore draws the chips it is itself selected by, and the Coven row is the
 * one wearing the cast band. That is the same live-reskin seam
 * `CovenCreateCharacter` sits on, and the reason its calling picker "stays drawn
 * in this skin": tapping the slip's own faction must not be a one-way door.
 *
 * ## The two gates are NOT here
 *
 * `state.isLoggedIn` and `state.canProposeTask` are answered in the dispatcher,
 * above every archetype. This file only ever draws the happy-path form or its
 * success screen. `canProposeMetatask` is different and IS here — it is a field
 * of the form rather than a gate on the page, and the metatask control is hidden
 * below it exactly as the na kit hides it (`metataskProposal.test.tsx` walks
 * every registered archetype for that).
 *
 * ## What the na kit draws that this does NOT mount, and why
 *
 * Three shared controls are deliberately re-drawn in the slip's own furniture
 * rather than mounted, and the reason is the one `CovenEditCharacter` wrote down
 * for its tail: **app chrome landed on a washed faction sheet is a ground those
 * neutrals were never measured on**, and this archetype may not repaint a shared
 * control to fix it.
 *
 *  - `ChipRow`'s `Chip` (the faction radiogroup) paints
 *    `--color-bg-surface` / `--color-text-primary`.
 *  - `FilterLevelNodes` (the minimum-level row) paints
 *    `--color-bg-surface` / `--color-text-secondary`, and takes no style hook at
 *    all, so it cannot be dressed from here.
 *  - `proposeTask/factionSurfaces.ts`'s `proposeCardStyle` / `taskNameInputStyle`
 *    / `metaBoxStyle` / `submitButtonStyle` are the NA KIT's four surfaces —
 *    a `--faction-default-card-bg` frame, a `--color-border-strong` rule, a
 *    rounded pill CTA. They are that kit's dress, not a shared chassis, and
 *    `unaffiliatedOption.test.tsx` says so in as many words: "a faction
 *    archetype draws its own register and would fail them by doing its job."
 *
 * What replaces each is the SAME geometry the create slip already ships — radius
 * 10, a 1.5px `-slip-border` rule, the ward page as the field's stock, the CTA
 * band for the picked one — so nothing here is a new treatment. The one control
 * that IS mounted is `FactionSigil`, because a faction's own mark is dispatched
 * rather than drawn (#2223), and it is handed `CTA_INK` on a picked row for the
 * reason #2852 gives: the ground under it becomes this kit's fill, so the mark
 * has to move with the label beside it.
 *
 * ## The chips are a WRAPPING row of the picker's rows, not a column
 *
 * The create slip's calling picker is a vertical column because an account holds
 * one or two invitations. This page always offers eight — unaffiliated plus the
 * seven — so the same row furniture flows and wraps instead of stacking. Same
 * radius, same rule, same fill, same ring; only the flow answers the count.
 * `role="radiogroup"` / `role="radio"` / `aria-checked` are kept from the na kit
 * because the SEMANTICS are the page's and not the dress's — eight mutually
 * exclusive choices are one radiogroup on every skin.
 *
 * NA TAKES NO RING, AND THAT IS NOT A DEGRADE TO GREY. The create slip's rule is
 * "the faction's own hue as a RING, never as ink"; `factionCssVar('na')` is
 * deliberately neutral grey (ADR-0039), so painting a ring for it would be the
 * #983 failure — unaffiliated grey written as a border. Unaffiliated's identity
 * on this row is carried by `FactionSigil`, which already falls through to the
 * spectrum mark for that slug, and its selection by the cast band every other
 * row takes.
 *
 * ## Colour, and it is measured ALREADY
 *
 * Every ink on this page is a pairing the Coven kit has already measured, which
 * is why this archetype ships no contrast file of its own:
 *
 *  - `-slip-ink` / `-slip-label` / `-card-alarm` straight on the sheet, i.e. on
 *    `--faction-coven-ward-card` under the two blooms at
 *    `--faction-coven-ward-haze` (and under the cat in the bottom-right corner)
 *    — `characterPaths/__tests__/covenCreateCharacterContrast.test.ts`, which is
 *    measured on exactly this ground because the wash here is byte-identical.
 *  - `-slip-ink` / `-slip-label` on `--faction-coven-ward-page`, the stock every
 *    field box, picker row, level node and preview panel is drawn on. That token
 *    is an OPAQUE hex in both cascades, so the blooms behind it never reach the
 *    type — `utils/__tests__/factionContrast.test.ts` carries the ward-page rows.
 *  - `-slip-cta-ink` on the CTA band, which is the create slip's cast.
 *
 * Nothing on this page lands a Coven ink on a ground the kit has not already
 * priced, and nothing lands an APP ink on a Coven ground — see the section
 * above. `--color-danger` is not drawn either: the error banner, the counters at
 * their cap and the over-length messages all take `--faction-coven-card-alarm`,
 * per #1302 / #1449 and the create slip's own ink list.
 *
 * `--color-success` IS dropped, and that is the one visible loss against the na
 * kit. It inks a single string there — the preview strip's `+N bonus pts` — and
 * it is an app functional hue with no reading on ward paper. The bonus line
 * takes `INK` instead, which is what `covenSlip`'s header prescribes when a mark
 * that carries words wants a colour it may not have: "when a mark wants a pink
 * that carries words, it wants `INK`."
 *
 * ## Copy, motion, theme
 *
 * Every string is an existing `forms:proposeTask.*` key, in the na kit's order
 * and unchanged. Light and dark flip entirely through the `[data-theme="dark"]`
 * cascade; there is no `dark ? a : b` anywhere. Motion is reached by CLASS only
 * (`.cvn-wheel`, inside `CovenCat`), so it stays behind the shared
 * `prefers-reduced-motion` guard.
 *
 * ## Presentation only
 *
 * `useProposeTask` stays the single source of state for every archetype. Nothing
 * here touches the submit path, the payload, or the metatask/standard branch —
 * `planProposalSubmission` reads the same fields it always did, and
 * `proposalNotes.test.tsx` still owns that seam.
 */
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import Breadcrumb from '../../../components/nav/Breadcrumb'
import FactionSigil from '../../../components/sigil/FactionSigil'
import { CovenSigil } from '../../../components/sigil/CovenSigil'
import { useGameConfig } from '../../../hooks/useGameConfig'
import {
  factionCssVar,
  factionName,
  getAllFactions,
  isKnownFaction,
  sortFactionsByRainbowOrder,
} from '../../../utils/factions'
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
import {
  UNAFFILIATED_FACTION_SLUG,
  type ProposeTaskState,
} from '../useProposeTask'

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

/* ── The form's caps, the na kit's exactly. `schemas.task` stays the authority
     and still rejects an over-long body; these are the numbers the counters
     print, and they are stated here for the same reason `DefaultProposeTask`
     states them: the hook does not export them.

     ponytail: three copies once the fan-out lands, plus the na kit's. The
     ceiling is that a cap change is eight edits; the upgrade path is to export
     them from `useProposeTask` in one pass over the whole registry, not to mint
     a private module here. ── */
const TITLE_MAX = 200
const DESCRIPTION_MAX = 5000
const NOTES_MAX = 2000

/** The level rungs the na kit offers, unchanged. */
const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8]

/* ── Ornament geometry (WORLD_ZERO_STYLE §4a: not layout spacing) ── */
/** The masthead's faction mark — the composer's 30. */
const BADGE = 30
/** The sparks flanking the wordmark. */
const MAST_SPARK = 11
/** The spark leading the cast. */
const CAST_SPARK = 12
/** The mark each faction wears in the picker — the size every chooser draws (#2223). */
const PICKER_SIGIL = 18
/** The level rung's disc, and the metatask tick — the na kit's two hit boxes. */
const LEVEL_NODE = 40
const META_BOX = 18
/** The points box: a numeral field, not a prose one, so it takes its own width
    rather than the field row's full measure. */
const POINTS_FIELD = 96
/** The watermark, sized to the column it turns in — the create slip's two. */
const CAT = { desktop: 320, mobile: 240 }
/** Its inset, and its strength — the two figures every page mount already runs. */
const CAT_INSET = 16
const CAT_OPACITY = 0.09

export default function CovenProposeTask({ state }: { state: ProposeTaskState }) {
  const { t } = useTranslation('forms')
  const sizes = useComposerSizes()
  const factor = sizes.isMobile ? 'mobile' : 'desktop'
  const {
    canProposeMetatask,
    success,
    factions,
    title,
    setTitle,
    description,
    setDescription,
    pointValue,
    setPointValue,
    levelRequired,
    setLevelRequired,
    factionSlug,
    setFactionSlug,
    notes,
    setNotes,
    isMetatask,
    setIsMetatask,
    metaBonusValue,
    setMetaBonusValue,
    submitting,
    error,
    handleSubmit,
    handleCancel,
  } = state

  // The #1695 admin-review window, in the era's own hours — never a typed-out
  // 48. `null` until `/game-config` lands, and unknown means UNDRAWN rather than
  // assumed, which is the doctrine the na kit sets for this same promise.
  const adminReviewHours =
    useGameConfig()?.pending_task_admin_review_hours ?? null

  /** Quicksand, the slip's chrome voice, over the layout's own tracking. */
  const sectionLabel: CSSProperties = { fontFamily: CHROME, color: LABEL }
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
  const counter = (used: number, max: number) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: CHROME, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: used >= max ? ALARM : LABEL }}>
        {used}/{max}
      </span>
    </div>
  )

  /** The over-length message. Only ever drawn AT the cap, so it is danger and
      not an approach — #1609's split, in this faction's alarm. */
  const tooLong = (message: string) => (
    <span style={{ fontFamily: CHROME, fontSize: 'var(--text-content)', color: ALARM }}>
      {message}
    </span>
  )

  const sheetStyle = {
    background: CARD,
    border: `1.5px solid ${GOLD}`,
    borderRadius: RADIUS,
    boxShadow: SHADOW,
  }

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
            star under the lettering as the viewport narrows.

            NO WORDMARK, AND IT IS THE ONE PLACE THIS SLIP DEPARTS FROM THE
            CREATE SLIP'S MASTHEAD. There the wordmark names the page's subject:
            you are joining a calling, and the calling's name is the headline.
            Here the subject is the TASK, and the faction is one of its FIELDS —
            drawn as a live radiogroup a few rows down, in which the picked row
            already prints "Cozy Coven" in this kit's own cast band. Setting the
            name in the masthead too would put a decorative copy of a word
            directly above the control that owns it, which is #1828's argument
            about the status pentacle ("a second one under the sigil in the
            masthead directly above") reaching the lettering instead of the mark.
            The hat, the two sparks and the braid still carry the identity, and
            they are the half a reader cannot re-read as a control. */}
        <Spark size={MAST_SPARK} color={GOLD} />
        <CovenSigil size={BADGE} color={DEEP} />
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

  /* ── The success screen. The na kit draws it as a `.sidebar-card` on the app
       page; here it is the same slip with the same masthead and the same wash,
       because a proposer who has just filed for the coven should not be handed
       back to site chrome to be told so. ── */
  if (success) {
    return (
      <ComposerPage sizes={sizes} style={{ fontFamily: CHROME, color: INK }}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} ground={ground}>
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
            {isMetatask
              ? t('proposeTask.successMeta.heading')
              : t('proposeTask.successTask.heading')}
          </h1>
          {adminReviewHours !== null && (
            <p style={{ fontFamily: CHROME, fontSize: 'var(--text-content)', color: LABEL, margin: 0, lineHeight: 1.6 }}>
              {isMetatask
                ? t('proposeTask.successMeta.body', {
                    faction: factionName(factionSlug),
                    hours: adminReviewHours,
                  })
                : t('proposeTask.successTask.body', { hours: adminReviewHours })}
            </p>
          )}
          <Braid />
        </ComposerSheet>
      </ComposerPage>
    )
  }

  /* Unaffiliated leads the picker: it is the default, and it is a state rather
     than a faction, so it is an extra option here rather than a registry entry
     (ADR-0039). Everything after it comes from the API, falling back to the
     static registry before the fetch lands, in the site's one rainbow order
     (#352). Copied in shape from the na kit deliberately — the ORDER of the
     options is the page's, not the dress's. */
  const factionOptions: string[] = [
    UNAFFILIATED_FACTION_SLUG,
    ...sortFactionsByRainbowOrder(
      (factions.length > 0 ? factions : getAllFactions()).map((f) => ({
        slug: f.slug,
      })),
    ).map((f) => f.slug),
  ]

  return (
    <ComposerPage
      sizes={sizes}
      style={{ fontFamily: CHROME, color: INK }}
      /* THE CRUMB LEFT THE SHEET (#2973). It rode inside, in the slip's own
         label ink, on the argument that the slot above sits on the app's
         `--color-bg-page` and no Coven ink is measured there. That is true of
         Coven ink and beside the point: a breadcrumb is not Coven's, it is
         neutral site chrome measured on exactly that ground, and #2102 rule 2
         says so in terms. The trail a player follows between a Coven task and a
         Singularity one may not move house on the way. */
      breadcrumb={<Breadcrumb current={t('proposeTask.pageTitle')} />}
    >
      {/* A REAL `<form>`, not a bare button with an onClick: it is what makes
          Enter commit from a text field, and what gives the browser's own
          required-field behaviour something to attach to. `handleSubmit` calls
          `preventDefault()` itself. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} ground={ground}>
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
            {t('proposeTask.pageTitle')}
          </h1>

          {/* Who the task is for — and the control this whole page is dispatched
              by, so the row wearing the cast band is the reason this file is on
              screen at all. */}
          <ComposerSection
            rule={false}
            label={t('proposeTask.factionLabel')}
            labelStyle={sectionLabel}
          >
            <div
              role="radiogroup"
              aria-label={t('proposeTask.factionLabel')}
              style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}
            >
              {factionOptions.map((slug) => {
                const selected = factionSlug === slug
                return (
                  <button
                    key={slug}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setFactionSlug(slug)}
                    /* NOT `composerLabelStyle` — it forces `uppercase` and its
                       own tracking, and both would be inherited by the name.
                       A faction wears its OWN card face at its own case, which
                       is what every other chooser draws. */
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderRadius: FIELD_RADIUS,
                      padding: 'var(--space-sm) var(--space-md)',
                      background: selected ? CTA_BAND : PAGE,
                      border: selected ? `1.5px solid ${CTA_TO}` : RULE,
                      // The faction's own hue as a RING, never as ink (§3).
                      // `na` has no hue — see the header on why it takes none
                      // rather than `factionCssVar`'s neutral grey.
                      boxShadow:
                        selected && isKnownFaction(slug)
                          ? `0 0 0 2px ${factionCssVar(slug)}`
                          : 'none',
                    }}
                  >
                    {/* The faction's own mark, from the dispatcher every other
                        chooser draws (#2223). Selected, the ground becomes this
                        kit's fill, so the mark moves to this kit's `onFill` ink
                        the same way the label beside it does (#2852). */}
                    <FactionSigil slug={slug} size={PICKER_SIGIL} color={selected ? CTA_INK : undefined} />
                    <span
                      style={{
                        fontFamily: factionCssVar(slug, 'card-font'),
                        fontSize: 'var(--text-content)',
                        color: selected ? CTA_INK : INK,
                      }}
                    >
                      {factionName(slug)}
                    </span>
                  </button>
                )
              })}
            </div>
          </ComposerSection>

          {/* The task's name. Placeholder-only, like every field on the create
              slip: the box carries its own words and `aria-label` repeats them,
              because here the visible label IS the accessible name. */}
          <ComposerSection rule={false}>
            <input
              type="text"
              required
              maxLength={TITLE_MAX}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              aria-label={t('proposeTask.fields.name.label')}
              placeholder={t('proposeTask.fields.name.label')}
              style={{ ...fieldBox, fontFamily: DISPLAY, fontSize: 'var(--text-title)' }}
            />
            {counter(title.length, TITLE_MAX)}
            {title.length >= TITLE_MAX && tooLong(t('proposeTask.fields.name.tooLong'))}
          </ComposerSection>

          <ComposerSection rule={false}>
            <textarea
              rows={6}
              maxLength={DESCRIPTION_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              aria-label={t('proposeTask.fields.description.label')}
              placeholder={t('proposeTask.fields.description.placeholder')}
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.7 }}
            />
            {counter(description.length, DESCRIPTION_MAX)}
            {description.length >= DESCRIPTION_MAX &&
              tooLong(t('proposeTask.fields.description.tooLong'))}
          </ComposerSection>

          {/* What it is worth and who may take it. One region rather than two
              sections so the pair reads as one line of the slip. */}
          <ComposerSection rule={false}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--space-xl)',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <span style={composerLabelStyle(sectionLabel)}>
                  {isMetatask
                    ? t('proposeTask.fields.bonusPoints.label')
                    : t('proposeTask.fields.basePoints.label')}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={isMetatask ? metaBonusValue : pointValue}
                  onChange={(e) =>
                    (isMetatask ? setMetaBonusValue : setPointValue)(
                      e.target.value.replace(/[^0-9]/g, ''),
                    )
                  }
                  disabled={submitting}
                  aria-label={
                    isMetatask
                      ? t('proposeTask.fields.bonusPoints.label')
                      : t('proposeTask.fields.basePoints.label')
                  }
                  placeholder={
                    isMetatask
                      ? t('proposeTask.fields.bonusPoints.placeholder')
                      : t('proposeTask.fields.basePoints.placeholder')
                  }
                  style={{
                    ...fieldBox,
                    width: POINTS_FIELD,
                    fontFamily: DISPLAY,
                    fontSize: 'var(--text-title)',
                    textAlign: 'center',
                  }}
                />
                {isMetatask && (
                  <span style={{ fontFamily: CHROME, fontSize: 'var(--text-lg)', color: LABEL }}>
                    {t('proposeTask.fields.bonusPoints.hint')}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <span style={composerLabelStyle(sectionLabel)}>
                  {t('proposeTask.fields.minimumLevel.label')}
                </span>
                {/* The na kit's `FilterLevelNodes` in the slip's furniture — see
                    the header on why it is re-drawn rather than mounted. Same
                    hit box, same "level ≥ N" semantics, same toggle-off. */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                  {LEVEL_OPTIONS.map((level) => {
                    const active = levelRequired === level
                    return (
                      <button
                        key={level}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setLevelRequired(active ? '' : level)}
                        disabled={submitting}
                        style={{
                          width: LEVEL_NODE,
                          height: LEVEL_NODE,
                          borderRadius: '50%',
                          boxSizing: 'border-box',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          cursor: 'pointer',
                          fontFamily: CHROME,
                          fontSize: 'var(--text-md)',
                          fontWeight: active ? 700 : 400,
                          background: active ? CTA_BAND : PAGE,
                          border: active ? `1.5px solid ${CTA_TO}` : RULE,
                          color: active ? CTA_INK : INK,
                        }}
                      >
                        {level}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </ComposerSection>

          {canProposeMetatask && (
            <ComposerSection rule={false}>
              {/* A `role="checkbox"` button, not an `<input>`: a native box is
                  tinted with `accent-color`, which takes ONE colour, and this
                  page's picker offers a slug whose identity is seven of them
                  (ADR-0039). Kept from the na kit because it is the page's
                  semantics; only the box is re-drawn. */}
              <button
                type="button"
                role="checkbox"
                aria-checked={isMetatask}
                onClick={() => setIsMetatask(!isMetatask)}
                disabled={submitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  margin: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: META_BOX,
                    height: META_BOX,
                    flex: 'none',
                    boxSizing: 'border-box',
                    borderRadius: 4,
                    border: isMetatask ? `1.5px solid ${CTA_TO}` : RULE,
                    background: isMetatask ? CTA_BAND : PAGE,
                  }}
                />
                <span style={composerLabelStyle(sectionLabel)}>
                  {t('proposeTask.metaToggle.label')}
                </span>
              </button>
            </ComposerSection>
          )}

          {/* Notes to the reviewing admin — hidden for metatasks, because the
              planner does not carry them on that branch (#1823). */}
          {!isMetatask && (
            <ComposerSection rule={false}>
              <textarea
                rows={3}
                maxLength={NOTES_MAX}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                aria-label={t('proposeTask.fields.notes.label')}
                placeholder={t('proposeTask.fields.notes.label')}
                style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.7 }}
              />
            </ComposerSection>
          )}

          {/* The task being written, live — this page's answer to the create
              slip's credential card. Ward paper inside the slip's own rule, so
              it reads as a chit laid on the sheet rather than a second card. */}
          {title && (
            <div
              style={{
                background: PAGE,
                border: RULE,
                borderRadius: FIELD_RADIUS,
                padding: 'var(--space-md) var(--space-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-xs)',
              }}
            >
              {/* Caption, not a heading: the faction name is interpolated in, so
                  a long slug turns it into a run of prose (#1307). */}
              <span style={composerLabelStyle(sectionLabel)}>
                {isMetatask
                  ? t('proposeTask.preview.metaHeading', { faction: factionName(factionSlug) })
                  : t('proposeTask.preview.taskHeading', { faction: factionName(factionSlug) })}
              </span>
              <p style={{ fontFamily: DISPLAY, fontSize: 'var(--text-title)', color: INK, margin: 0, lineHeight: 1.2 }}>
                {title}
              </p>
              {description && (
                <p
                  style={{
                    fontFamily: CHROME,
                    fontSize: 'var(--text-content)',
                    color: LABEL,
                    margin: 0,
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {description}
                </p>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', fontFamily: CHROME, fontSize: 'var(--text-lg)' }}>
                {/* `--color-success` is dropped here — see the header. The worth
                    of the thing is the loudest fact on the chit either way, so
                    it takes INK and the two qualifiers stay quiet. */}
                <span style={{ color: INK }}>
                  {isMetatask
                    ? t('proposeTask.preview.bonusPoints', { points: metaBonusValue || '?' })
                    : t('proposeTask.preview.points', {
                        points: pointValue || '?',
                        // `pointValue` is the raw input string. An empty or
                        // unparseable one draws "?" and takes the PLURAL —
                        // "? points" reads, "? point" does not (#2598).
                        count: Number(pointValue) || 0,
                      })}
                </span>
                <span style={{ color: LABEL }}>
                  {t('proposeTask.preview.level', {
                    level: levelRequired === '' ? 0 : levelRequired,
                  })}
                </span>
                {!isMetatask && (
                  <span style={{ color: LABEL }}>{t('proposeTask.preview.pending')}</span>
                )}
              </div>
            </div>
          )}

          <ErrorBanner message={error ?? ''} style={{ color: ALARM }} />

          {/* THE ONE BRAID (#1707) — the sheet's rule, called exactly once,
              immediately above the footer. */}
          <Braid />

          {/* [Cancel] … [Submit] — the global order from #646, stacked because
              Coven's cast is a full-bleed band rather than an inline button. */}
          <ComposerFooter
            band
            start={
              <>
                <button
                  type="button"
                  onClick={handleCancel}
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
                  {t('proposeTask.submit.cancel')}
                </button>
                {adminReviewHours !== null && (
                  <span style={{ fontFamily: CHROME, fontSize: 'var(--text-lg)', color: LABEL }}>
                    {t('proposeTask.submit.note', { hours: adminReviewHours })}
                  </span>
                )}
              </>
            }
            end={
              <button
                type="submit"
                disabled={submitting}
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
                  cursor: submitting ? 'wait' : 'pointer',
                  // `.control-off` rather than `opacity: 0.5` (#2486): CTA_BAND
                  // is a gradient, so opacity folded the two-stop fill and the
                  // label together and there was never one colour to fade.
                }}
              >
                <Spark size={CAST_SPARK} color={CTA_INK} />
                {submitting
                  ? t('proposeTask.submit.busy')
                  : isMetatask
                    ? t('proposeTask.submit.meta')
                    : t('proposeTask.submit.task')}
              </button>
            }
          />
        </ComposerSheet>
      </form>
    </ComposerPage>
  )
}

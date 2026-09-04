/**
 * The Singularity propose-task archetype — A TASK, COMPILED (#2538).
 *
 * DERIVED, NOT DESIGNED. The owner ruling of 2026-08-24 dresses this page and
 * says where the dress comes from: *each archetype is derived from that
 * faction's `createCharacter` page — same register, same geometry, same field
 * furniture*. So this file is `characterPaths/archetypes/SingularityCreateCharacter`
 * over this page's fields. Not one new token, not one new stylesheet rule, not
 * one new SVG, and not one new copy key: every string below is an existing
 * `forms:proposeTask.*` key the na kit already renders, in the na kit's order.
 *
 * THE SLUG IS THE PICK IN PROGRESS. `ProposeTask.tsx` resolves on
 * `state.factionSlug` — the faction the task is being proposed FOR, the live
 * chip choice — so this terminal is on screen exactly while Singularity is
 * selected and the page returns to the na kit the moment the pick changes. That
 * is `createCharacter`'s seam deliberately: same reasoning, same behaviour, and
 * the chip row below therefore STAYS DRAWN in this skin for the same reason the
 * calling picker does on the create page. Reskinning must not be a one-way door.
 *
 * THE TWO GATES ARE NOT HERE. `state.isLoggedIn` and `state.canProposeTask` are
 * answered in the dispatcher above this file, so this archetype only ever draws
 * the happy-path form or its success screen.
 *
 * ## The chassis is the composer's, not a second one
 *
 * `ComposerPage` / `ComposerSheet` / `ComposerSection` / `ComposerRule` /
 * `ComposerFooter` are geometry with no praxis in them, so this page mounts the
 * same blocks the create plate does rather than restating a sheet, a window bar
 * and a footer row. `useComposerSizes()` reads `useFormFactor()`: one tree at
 * two widths, no mobile twin. Every fixed number here is ornament geometry,
 * never a layout grid (SPEC-faction-ui-profile §1a).
 *
 * ## Two shared controls are DRAWN rather than mounted, and it is measured
 *
 * The na kit reaches `ui/ChipRow`'s `Chip sigilText` for the faction row and
 * `ui/FilterLevelNodes` for the minimum-level row. Both hard-code
 * `--color-bg-surface` as the ground of every key in every state, and that
 * token is `rgba(255,255,255,0.72)` in the light cascade. Seventeen near-white
 * pills on a chassis that is `#07130c` in BOTH cascades is the exact failure
 * the create plate names for `.btn-outline` — *"browser chrome dropped on a
 * black chassis"* — and neither control takes a style prop to move it. So the
 * keys are drawn here in the create plate's own calling-key furniture (panel,
 * 1px frame, radius 2, the lit key for the picked one), which is furniture this
 * kit already ships rather than an invention. Their BEHAVIOUR is copied
 * unchanged, including the level key's toggle-to-clear.
 *
 * `FactionSigil` is mounted, not drawn: the mark dispatches its own faction and
 * is what every chooser in the app draws (#2223).
 *
 * ## Colour — the create plate's rule, unchanged and unrestated
 *
 * Every value is a `--faction-singularity-term-*` token, never a ternary and
 * never a `dark ?` branch. `-term-dim` IS A PANEL INK HERE AND NEVER A CHASSIS
 * ONE: `ComposerSheet` paints the ground at `zIndex 0` and the content column at
 * `zIndex 1`, so type drawn straight on the chassis has the standing raster AND
 * the travelling band between it and the paint, and on that composite `-term-dim`
 * falls under AA. `characterPaths/__tests__/singularityCreateCharacterGround.test.ts`
 * holds that as measurements over the token graph — chassis inks, panel inks,
 * the alarm under the neutral danger veil, the cast key, the process name — and
 * this file introduces NO pairing outside that set, which is why it ships no
 * contrast test of its own rather than restating one.
 *
 * The one place the na kit has a tier this family does not is the character
 * counter, which turns amber at 180/4500 and danger at the cap. The terminal has
 * no amber; it has a phosphor, so the three tiers land as
 * dim → bright → alarm, all three of them panel inks in the readout's own foot.
 * `--color-success` on the metatask preview's bonus goes the same way: green IS
 * this kit's affirmative register, so the bonus reads `-term-bright`.
 *
 * ## Motion — one class, no inline `animation:`
 *
 * `.sg-scan` on the travelling band, the faction's own and the same one the task
 * card and the create plate run. It lives in `motion.ornament.css` behind the
 * shared `prefers-reduced-motion` guard; an inline `animation:` would bypass it
 * (#1003). This file touches no stylesheet. The block cursor after the cast word
 * is `.sg-cursor`, likewise.
 *
 * ## What is deliberately NOT the create plate's
 *
 * - **The breadcrumb stays.** The na kit draws a `Tasks › Propose a Task` trail
 *   and the create page has none, so the derivation would delete a navigation
 *   affordance. It keeps the site's neutral ink because it is site chrome
 *   standing on the site's own ground OUTSIDE the sheet (#2102), which is also
 *   the only ground it has ever been measured on — and since #2973 it is that
 *   shared component rather than this file's restatement of it.
 * - **No `PageTitle`.** Its per-letter spectrum bars are the na kit's identity
 *   (ADR-0066); the heading here is the terminal's prompt line, as on the create
 *   plate.
 * - **No process light.** `SingularityProcessLight` says a session is UP. There
 *   is no session here and no task yet, so the bar wears lamps and a name.
 *
 * ## Presentation only
 *
 * `useProposeTask` stays the single source of state for every archetype. Nothing
 * here touches the submit path, the payload or the endpoint choice, and the
 * archetype stays a pure function of `ProposeTaskState` so
 * `__tests__/metataskProposal.test.tsx` and `__tests__/unaffiliatedOption.test.tsx`
 * keep sweeping it with the rest of the roster.
 */
import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import Breadcrumb from '../../../components/nav/Breadcrumb'
import FactionSigil from '../../../components/sigil/FactionSigil'
import SingularityLamps from '../../../components/factionMarks/SingularityLamps'
import { useGameConfig } from '../../../hooks/useGameConfig'
import {
  factionName,
  getAllFactions,
  sortFactionsByRainbowOrder,
} from '../../../utils/factions'
import { factionRoleVar, factionRoleVars } from '../../../utils/factionRoles'
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
import {
  UNAFFILIATED_FACTION_SLUG,
  type ProposeTaskState,
} from '../useProposeTask'

const SLUG = 'singularity'

/* The terminal's two-theme contract (#1023/#1034), named for the ROLE each plays
   rather than for its colour. Both halves are near-black and the cascade flips
   the phosphor — see the header. */
const CHASSIS = 'var(--faction-singularity-term-bg)'
const CHROME = 'var(--faction-singularity-term-chrome)'
/** The raised box: every field, every key, the preview readout. */
const PANEL = 'var(--faction-singularity-term-panel)'
const INK = 'var(--faction-singularity-term-ink)'
/** Titles, a lit key's edge, and the counter's middle tier. */
const BRIGHT = 'var(--faction-singularity-term-bright)'
/** The caption tier — PANEL ONLY on this surface. See the header. */
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

/* Share Tech Mono, for the title, the body AND the label — the whole surface is
   one face. Reached through the faction's own role map rather than through
   --font-faction-terminal directly, which is what §4 asks for when the face IS
   the faction's. No `var(--x, fallback)` arm anywhere below: the map answers for
   all nine slugs, so a fallback there is unreachable code (ADR-0089, #2690). */
const FACE = 'var(--sg-propose-face)'

/** The design's geometry: radius 2, borderW 1. A terminal has square corners. */
const RADIUS = 2
/** The travelling band's depth, and the sweep's overhang. Ornament (§4a). */
const SWEEP_HEIGHT = 38
/** The mark each faction key wears — the size every chooser draws (#2223). */
const PICKER_SIGIL = 18
/** The metatask tick box, at the na kit's own 18px. */
const TICK = 18
/** The points readout — a three-digit well, the na kit's own 80px. */
const POINTS_WIDTH = 80

/* The na kit's own caps, restated for the same reason it states them: the
   backend schema stays the authority and still rejects an over-long body. */
const TITLE_MAX = 200
const DESCRIPTION_MAX = 5000
const NOTES_MAX = 2000
/* Where the counter leaves its quiet tier — the na kit's thresholds exactly. */
const TITLE_WARN = 180
const DESCRIPTION_WARN = 4500

const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8]

/* Ornament, not copy — glyph marks in the same class as the three lamps beside
   them (WORLD_ZERO_STYLE §4). Module constants so they reach JSX as identifier
   expressions rather than literal text, the shape `praxis.proc` and `[ok]`
   already use on this kit's composer; both sit in aria-hidden chrome or beside
   a real heading, so neither is announced as content. */
const PROC_NAME = 'task.propose'
const PROMPT = '>'
const OK_MARK = '[ok]'

/** The composer's label tier in the terminal's face, on the chassis's own ink. */
function chassisLabel(overrides: CSSProperties = {}): CSSProperties {
  return composerLabelStyle({ fontFamily: FACE, color: INK, ...overrides })
}

/** The readout box: a lit panel inside a hard 1px frame. */
const boxStyle: CSSProperties = {
  background: PANEL,
  border: `1px solid ${BORDER}`,
  borderRadius: RADIUS,
  // So the foot strip's own edge cannot poke past the frame's corners.
  overflow: 'hidden',
}

/* The field itself is borderless INSIDE that box — the frame belongs to the
   readout, not to the control. No `outline: none`: the browser's focus ring is
   the only focus indicator a keyboard reaches these controls with, and the frame
   is on the box, so the ring has room to draw inside it. */
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

/** A key: the create plate's calling row, which every chooser here wears. */
function keyStyle(selected: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    cursor: 'pointer',
    textAlign: 'left',
    borderRadius: RADIUS,
    padding: 'var(--space-sm) var(--space-md)',
    background: selected ? CTA_BG : PANEL,
    border: `1px solid ${selected ? CTA_BG : BORDER}`,
    boxShadow: selected ? CTA_GLOW : undefined,
    color: selected ? CTA_INK : INK,
    fontFamily: FACE,
    fontSize: 'var(--text-content)',
  }
}

export default function SingularityProposeTask({ state }: { state: ProposeTaskState }) {
  const { t } = useTranslation(['forms', 'common'])
  const sizes = useComposerSizes()
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
  // number, and UNDRAWN rather than assumed while `/game-config` is in flight.
  const adminReviewHours = useGameConfig()?.pending_task_admin_review_hours ?? null

  // Unaffiliated leads the picker: it is the default, and it is a state rather
  // than a faction (ADR-0039). Everything after it comes from the API, falling
  // back to the static registry before the fetch lands, in the site's one
  // rainbow order (#352). Lifted from the na kit unchanged — the ORDER is the
  // page's, not the dress's.
  const factionOptions: string[] = [
    UNAFFILIATED_FACTION_SLUG,
    ...sortFactionsByRainbowOrder(
      (factions.length > 0 ? factions : getAllFactions()).map((f) => ({ slug: f.slug })),
    ).map((f) => f.slug),
  ]

  /**
   * The readout's foot: the quiet line, INSIDE the panel.
   *
   * This is where `-term-dim` lives on this surface and the only place it may.
   * The strip declares the panel as its own background, which is both the ground
   * the ink was measured on and what makes the rule checkable.
   *
   * Three tiers, the na kit's thresholds in the terminal's own inks: dim while
   * there is room, bright past the warn mark, alarm at the cap.
   */
  const foot = (used: number, max: number, warn: number) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        background: PANEL,
        color: used >= max ? ALARM : used >= warn ? BRIGHT : DIM,
        borderTop: `1px dashed ${HAIR}`,
        padding: 'var(--space-xs) var(--space-md)',
        fontFamily: FACE,
        fontSize: 'var(--text-lg)',
      }}
    >
      <span>
        {used}/{max}
      </span>
    </div>
  )

  /** The at-the-limit line, on the chassis under the readout it refuses. */
  const tooLong = (message: string): ReactNode => (
    <p
      style={{
        fontFamily: FACE,
        fontSize: 'var(--text-content)',
        color: ALARM,
        margin: 0,
        marginTop: 'var(--space-sm)',
      }}
    >
      {message}
    </p>
  )

  const masthead = (
    /* The window bar. `ComposerMasthead` is a 3px band by default; the skin
       gives it its own height and padding through `style`, which is spread
       last. Its whole content is aria-hidden chrome. */
    <ComposerMasthead
      background={CHROME}
      style={{
        height: 'auto',
        padding: 'var(--space-sm) var(--space-lg)',
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <div aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        {/* The lamp cluster — the kit's since #1979, drawn once for all of this
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
    /* The standing raster, at inset 0 — a fixed scrim, so unlike a drifting wash
       it neither travels nor overhangs. The band rides inside it and overhangs
       horizontally instead, so its soft ends never show against the sheet's
       edges. */
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

  const pageStyle: CSSProperties = {
    // The prefix is this SURFACE's, never shared with another (#2659): the
    // create plate holds `sg-path` and the edit plate `sg-edit-path`, and one
    // page wrapper declaring another's namespace is how a card belonging to a
    // different faction gets silently repainted.
    ...factionRoleVars(SLUG, 'sg-propose'),
    fontFamily: FACE,
    color: INK,
  }

  const heading = (text: string) => (
    /* `minHeight` is the chassis' heading floor (#2995) — the second term in
       the offset the chip row sits at, and the same number on all nine kits.
       The prompt and the title keep their shared baseline; the floor only says
       how far the block reaches before the next region starts. */
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 'var(--space-md)',
        minHeight: sizes.headingHeight,
      }}
    >
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
        {text}
      </h1>
    </div>
  )

  if (success) {
    return (
      <ComposerPage sizes={sizes} style={pageStyle}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} ground={ground}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-md)' }}>
            <span
              aria-hidden
              style={{ fontFamily: FACE, fontSize: sizes.titleSize, color: BRIGHT, lineHeight: 1 }}
            >
              {OK_MARK}
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
              {isMetatask
                ? t('proposeTask.successMeta.heading')
                : t('proposeTask.successTask.heading')}
            </h1>
          </div>
          {adminReviewHours !== null && (
            <p
              style={{
                fontFamily: FACE,
                fontSize: 'var(--text-content)',
                color: INK,
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {isMetatask
                ? t('proposeTask.successMeta.body', {
                    faction: factionName(factionSlug),
                    hours: adminReviewHours,
                  })
                : t('proposeTask.successTask.body', { hours: adminReviewHours })}
            </p>
          )}
        </ComposerSheet>
      </ComposerPage>
    )
  }

  return (
    <ComposerPage
      sizes={sizes}
      style={pageStyle}
      /* Site chrome, above the sheet and on the site's own ground — NEUTRAL by
         rule (#2102), which is why it does not take the terminal's ink: a
         phosphor cut for a near-black chassis has nothing to do with the app's
         own page.

         IT IS NOW THE COMPONENT AND NOT A COPY OF IT (#2973). The shape here was
         already `components/nav/Breadcrumb`'s, restated because that component
         built its trail from a `taskId` / `taskTitle` and no task exists yet on
         this page; it takes a `current` label now, so the copy has nothing left
         to justify it. The one visible change is the ink: the component paints
         `--color-text-tertiary` outright rather than reading `--label-ink`,
         which on this ground is unset to exactly that value. */
      breadcrumb={<Breadcrumb current={t('proposeTask.pageTitle')} />}
    >
      {/* A REAL `<form>`, not a bare button with an onClick: it is what makes
          Enter commit from a text field, and `handleSubmit` calls
          `preventDefault()` itself. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        {/* `reserveHead` (#2995). The window bar is 31px; the tallest head on
            this page is 96, so this sheet pads out to it and the key row stops
            moving when the pick changes. The bar keeps its own height — the
            reserved box says where the column STARTS, never how tall a kit's
            chrome is. */}
        <ComposerSheet
          sizes={sizes}
          style={sheetStyle}
          masthead={masthead}
          reserveHead
          ground={ground}
        >
          {heading(t('proposeTask.pageTitle'))}

          {/* The target faction — the value this whole page reskins on, so it
              stays drawn and reachable in this skin. One wrapping radiogroup of
              keys; the na kit's chip row in the terminal's own key furniture. */}
          <ComposerSection rule={false}>
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
                    style={keyStyle(selected)}
                  >
                    {/* Selected, the ground becomes CTA_BG — this kit's own
                        fill, not the offered slug's — so the mark moves to this
                        kit's onFill ink the way the name beside it does (#2852). */}
                    <FactionSigil
                      slug={slug}
                      size={PICKER_SIGIL}
                      color={selected ? CTA_INK : undefined}
                    />
                    <span
                      style={{
                        // The OFFERED faction's own face, by role (#2675). A
                        // dynamic slug, so this is the map's other half: the
                        // prefix on the page root is Singularity's ground and
                        // this asks a different faction for one value of its own.
                        fontFamily: factionRoleVar(slug, 'face'),
                      }}
                    >
                      {factionName(slug)}
                    </span>
                  </button>
                )
              })}
            </div>
          </ComposerSection>

          {/* Task name. The field carries its own words: the label key is both
              the placeholder a sighted reader sees and the name a screen reader
              announces, which is the pairing #2793 settled on the sibling
              surface. */}
          <ComposerSection rule={false}>
            <div style={boxStyle}>
              <input
                type="text"
                required
                maxLength={TITLE_MAX}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={submitting}
                aria-label={t('proposeTask.fields.name.label')}
                placeholder={t('proposeTask.fields.name.label')}
                style={inputStyle}
              />
              {foot(title.length, TITLE_MAX, TITLE_WARN)}
            </div>
            {title.length >= TITLE_MAX && tooLong(t('proposeTask.fields.name.tooLong'))}
          </ComposerSection>

          {/* Description. Its placeholder and its accessible name differ in the
              na kit — "Task Description" in the box, "Description" announced —
              and that pairing is the page's, not the dress's, so it stands. */}
          <ComposerSection rule={false}>
            <div style={boxStyle}>
              <textarea
                rows={6}
                maxLength={DESCRIPTION_MAX}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
                aria-label={t('proposeTask.fields.description.label')}
                placeholder={t('proposeTask.fields.description.placeholder')}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }}
              />
              {foot(description.length, DESCRIPTION_MAX, DESCRIPTION_WARN)}
            </div>
            {description.length >= DESCRIPTION_MAX &&
              tooLong(t('proposeTask.fields.description.tooLong'))}
          </ComposerSection>

          {/* Difficulty: the points field the branch calls for, and the minimum
              level beside it. */}
          <ComposerSection rule={false}>
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-xl)',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <span style={chassisLabel({ display: 'block', marginBottom: 'var(--space-sm)' })}>
                  {isMetatask
                    ? t('proposeTask.fields.bonusPoints.label')
                    : t('proposeTask.fields.basePoints.label')}
                </span>
                <div style={{ ...boxStyle, width: POINTS_WIDTH }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={isMetatask ? metaBonusValue : pointValue}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^0-9]/g, '')
                      if (isMetatask) setMetaBonusValue(digits)
                      else setPointValue(digits)
                    }}
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
                    style={{ ...inputStyle, textAlign: 'center' }}
                  />
                </div>
                {isMetatask && (
                  <span
                    style={{
                      display: 'block',
                      marginTop: 'var(--space-xs)',
                      fontFamily: FACE,
                      fontSize: 'var(--text-lg)',
                      color: INK,
                    }}
                  >
                    {t('proposeTask.fields.bonusPoints.hint')}
                  </span>
                )}
              </div>

              <div>
                <span style={chassisLabel({ display: 'block', marginBottom: 'var(--space-sm)' })}>
                  {t('proposeTask.fields.minimumLevel.label')}
                </span>
                {/* `FilterLevelNodes`' behaviour, in this kit's keys — pressing
                    the lit one clears the floor, exactly as the na row does. */}
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
                        style={{ ...keyStyle(active), justifyContent: 'center' }}
                      >
                        {t('common:filters.levelAtLeast', { level })}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </ComposerSection>

          {/* The metatask branch, gated on the capability seam. A
              `role="checkbox"` button and not an `<input>`: the na kit's control
              exists because `accent-color` takes one colour and unaffiliated's
              identity is seven of them (ADR-0039), and an archetype does not
              fork a control's semantics to redress it. */}
          {canProposeMetatask && (
            <ComposerSection rule={<ComposerRule style={{ height: 0, background: 'none', borderTop: `1px dashed ${HAIR}` }} />}>
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
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: TICK,
                    height: TICK,
                    flex: 'none',
                    boxSizing: 'border-box',
                    borderRadius: RADIUS,
                    background: isMetatask ? CTA_BG : PANEL,
                    border: `1px solid ${isMetatask ? CTA_BG : BORDER}`,
                    boxShadow: isMetatask ? CTA_GLOW : undefined,
                  }}
                />
                <span style={chassisLabel()}>{t('proposeTask.metaToggle.label')}</span>
              </button>
            </ComposerSection>
          )}

          {/* Notes to admin — the standard branch only, because that is the only
              branch whose payload carries them (#1823). */}
          {!isMetatask && (
            <ComposerSection rule={false}>
              <div style={boxStyle}>
                <textarea
                  rows={3}
                  maxLength={NOTES_MAX}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={submitting}
                  aria-label={t('proposeTask.fields.notes.label')}
                  placeholder={t('proposeTask.fields.notes.label')}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }}
                />
              </div>
            </ComposerSection>
          )}

          {/* The preview, as a readout rather than a tinted strip: this is the
              panel, so the caption may take the quiet tier. */}
          {title && (
            <ComposerSection rule={false}>
              <div style={{ ...boxStyle, padding: 'var(--space-md)' }}>
                <span
                  style={composerLabelStyle({
                    display: 'block',
                    fontFamily: FACE,
                    background: PANEL,
                    color: DIM,
                    letterSpacing: '0.1em',
                    marginBottom: 'var(--space-xs)',
                  })}
                >
                  {isMetatask
                    ? t('proposeTask.preview.metaHeading', { faction: factionName(factionSlug) })
                    : t('proposeTask.preview.taskHeading', { faction: factionName(factionSlug) })}
                </span>
                <p
                  style={{
                    fontFamily: FACE,
                    fontSize: 'var(--text-content)',
                    color: BRIGHT,
                    margin: 0,
                    marginBottom: 'var(--space-xs)',
                  }}
                >
                  {title}
                </p>
                {description && (
                  <p
                    style={{
                      fontFamily: FACE,
                      fontSize: 'var(--text-content)',
                      color: INK,
                      lineHeight: 1.4,
                      margin: 0,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {description}
                  </p>
                )}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--space-sm)',
                    marginTop: 'var(--space-sm)',
                    fontFamily: FACE,
                    fontSize: 'var(--text-lg)',
                    background: PANEL,
                    color: DIM,
                  }}
                >
                  {isMetatask ? (
                    // Green IS this kit's affirmative register, so the bonus
                    // reads as phosphor rather than the neutral success ink.
                    <span style={{ color: BRIGHT }}>
                      {t('proposeTask.preview.bonusPoints', { points: metaBonusValue || '?' })}
                    </span>
                  ) : (
                    <span>
                      {t('proposeTask.preview.points', {
                        points: pointValue || '?',
                        // The raw input string: an empty or unparseable one
                        // draws "?" and takes the PLURAL (#2598).
                        count: Number(pointValue) || 0,
                      })}
                    </span>
                  )}
                  <span>
                    {t('proposeTask.preview.level', {
                      level: levelRequired === '' ? 0 : levelRequired,
                    })}
                  </span>
                  {!isMetatask && <span>{t('proposeTask.preview.pending')}</span>}
                </div>
              </div>
            </ComposerSection>
          )}

          <ErrorBanner message={error ?? ''} style={{ color: ALARM }} />

          {/* The footer's own divider — a dashed hair, drawn ONCE above the
              footer (#1707); the sheet's gap parts the regions. */}
          <ComposerRule style={{ height: 0, background: 'none', borderTop: `1px dashed ${HAIR}` }} />

          {/* [Cancel] … [Submit] — the global order from #646, with the cast as a
              full-bleed band flush to the chassis's bottom edge (#1828). */}
          <ComposerFooter
            band
            start={
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={chassisLabel({
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  })}
                >
                  {t('proposeTask.submit.cancel')}
                </button>
                {adminReviewHours !== null && (
                  <span
                    style={{ fontFamily: FACE, fontSize: 'var(--text-content)', color: INK }}
                  >
                    {t('proposeTask.submit.note', { hours: adminReviewHours })}
                  </span>
                )}
              </>
            }
            end={
              <button
                type="submit"
                disabled={submitting}
                /* The second class is the ONE disabled override in the app
                   (#2486). This chassis does not flip, so the house neutral
                   would lay a pale slab on a black terminal;
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
                    // The terminal's own CTA halo — `none` in light, real in
                    // dark, straight off the token.
                    boxShadow: CTA_GLOW,
                  }),
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {submitting
                  ? t('proposeTask.submit.busy')
                  : isMetatask
                    ? t('proposeTask.submit.meta')
                    : t('proposeTask.submit.task')}
                {/* The prompt's block cursor, trailing the word. `.sg-cursor`
                    carries the reduced-motion-guarded blink; stilled it stays
                    drawn, because it is punctuation on the prompt and not an
                    indicator. */}
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
    </ComposerPage>
  )
}

/**
 * The Everymen propose-task archetype — A WORK ORDER FILED WITH THE UNION
 * (#2538, the seven-faction fan-out).
 *
 * DERIVED, and derived from two files rather than invented from prose. The
 * owner ruling (2026-08-24) is that this page wears the faction the task is
 * being proposed FOR, and that each archetype is that faction's
 * `createCharacter` page's dress — no sheet was commissioned and none is drawn
 * here. So:
 *
 *   THE FORM is `archetypes/DefaultProposeTask`'s, field for field and in its
 *   order: the faction chips, the name, the description, the points/bonus and
 *   minimum-level row, the metatask tick, the notes to admin, the live preview,
 *   the submit row and the success screen. Nothing is added and nothing is
 *   dropped.
 *
 *   THE DRESS is `characterPaths/archetypes/EverymenCreateCharacter`'s, token
 *   for token: the same masthead, the same `.em-burst`, the same panel plates
 *   inside the same printed rule, the same dashed perforation above the same
 *   full-bleed report bar. Every colour constant below is copied from that file
 *   verbatim, including WHICH reds may be ink and on what.
 *
 * The union files a work order to start a job; the enlistment paper starts a
 * life. Proposing a task is the request for the work order — the same sheet,
 * one rung earlier, filled in by whoever is asking.
 *
 * ## The chips are ABOVE the sheet, and that is the na kit's structure
 *
 * `DefaultProposeTask` puts the faction chips OUTSIDE the framed card, before
 * the `<form>`: the pick is what the card then wears, so it cannot live inside
 * the thing it dresses. That structure is kept exactly. What changes is the
 * chips' treatment, which is the create plate's calling picker — a plate in
 * panel stock inside the printed frame, and a picked one taking this kit's own
 * CTA fill with the faction's hue struck behind it as a 3px offset shadow. A
 * hue is a FILL here and never an ink (#649): the row's type stays on this
 * kit's own measured pair.
 *
 * `na`'s chip takes the same printed shadow rather than the spectrum frame the
 * na kit gives it. The spectrum is another kit's ornament and this sheet does
 * not fly it; `factionCssVar('na')` is deliberately neutral (ADR-0039 §2), and
 * neutral is the honest answer for "no single hue" in an idiom whose selection
 * mark is a struck shadow rather than a colour ring.
 *
 * ## The masthead names the union, and it can only do that below the chips
 *
 * The nameplate is the create plate's, unchanged — cog · the paper's name ·
 * cog, on the union's red bar under a 3px double rule. Because the chip row
 * sits above the sheet, the first "Everymen" a reader (and
 * `__tests__/unaffiliatedOption.test.tsx`, which pins the chip order by markup
 * index) meets is the chip, not the masthead. Any archetype in this fan-out
 * that puts its own faction's NAME above the chip row will fail that ordering
 * assertion; flagged for the other six lanes rather than worked around here.
 *
 * ## Colour — nothing new, and nothing new measured
 *
 * Every ink lands where the create plate already lands it, so the measurements
 * in `characterPaths/__tests__/everymenCreateCharacterContrast.test.ts` cover
 * this page whole and there is no second contrast file:
 *
 *   • on the WASHED PAPER (`--everymen-paper` under `.em-burst`) — `INK` for
 *     the heading and every label, `QUIET` for counters, hints and the exits,
 *     `ALARM` for an error and a counter at its cap. Those are that file's
 *     three rows.
 *   • on a PLATE (`--faction-everymen-sheet-panel`, opaque, above the burst) —
 *     `INK` only. `factionContrast.test.ts` owns that pair.
 *   • on the two FILLS — `MAST_INK` on the masthead, `BAR_INK` on the report
 *     bar and on a picked chip. Both are gated pairs already.
 *
 * TWO na-KIT INKS ARE DELIBERATELY NOT CARRIED ACROSS. `--color-danger` becomes
 * `ALARM`, #1449's rung measured on this paper, exactly as the create plate
 * does. `--color-success` on the preview's bonus cell becomes `QUIET` like its
 * neighbours: the global success green is measured on the app's near-white
 * surface and on the FLAT paper, never on the washed one, and the cell's own
 * copy ("+N bonus pts") already says what the colour was saying.
 *
 * THE QUIET RUNG IS `--everymen-quiet`, NOT `--everymen-muted`, for the reason
 * the create plate records and that file measures: the burst washes the paper
 * before a word is drawn and the muted brown misses AA on it in light.
 *
 * Light/dark flips through the `[data-theme="dark"]` cascade. There is no
 * `dark ?` branch in this file, and no `var(--x, fallback)` — this surface
 * declares a role map, where a fallback arm is unreachable code (ADR-0089).
 *
 * ## Motion, chassis, responsiveness — inherited whole
 *
 * The masthead's two cogs counter-turn and the stage cog turns forward, all
 * three as CLASSES behind the shared `prefers-reduced-motion` guard; an inline
 * `animation:` would bypass it (#1003). The sheet, masthead, sections, rule and
 * footer are the composer's shared blocks, so no second chassis is written.
 * `useComposerSizes()` reads `useFormFactor()`: one tree at two widths, no
 * mobile twin. Every fixed number below is ornament geometry, never a layout
 * grid (SPEC-faction-ui-profile §1a).
 *
 * ## Copy — none of its own
 *
 * Every string is an existing `forms:proposeTask.*` / `common:filters.*` key,
 * unchanged. The masthead's one word is the faction's NAME out of
 * `factions.json`, which is what every other Everymen surface puts there under
 * ADR-0057.
 *
 * ONE na-KIT ELEMENT IS NOT DRAWN: its hand-rolled `Tasks › Propose a Task`
 * breadcrumb. #2102 collapsed eighteen hand-rolled crumbs onto ONE shared
 * component precisely so a faction surface would stop drawing its own, and the
 * shared `components/nav/Breadcrumb` cannot express this trail — it takes a
 * `taskId` and a `taskTitle` and builds `Tasks › <task>` from them, and no task
 * exists yet. A nineteenth copy inside a faction archetype is the thing that
 * issue deleted, and it would have to be inked either in the site's neutral
 * tiers (which `local/no-global-ink-on-faction-surface` forbids here, correctly)
 * or in this kit's paper inks on the app's own ground, which nothing measures.
 * So the way back is the footer's Cancel, which is `navigate(-1)`. Both
 * character plates this dress derives from draw no crumb either. Flagged on the
 * PR: giving this page a task-less trail is a change to the SHARED component,
 * not something an archetype may decide on its own.
 *
 * ## Presentation only
 *
 * `useProposeTask` stays the single source of state. Nothing here touches the
 * submit path or the payload, and the two gates — `state.isLoggedIn` and
 * `state.canProposeTask` — are answered in the dispatcher, above this file.
 */
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import FactionSigil from '../../../components/sigil/FactionSigil'
import { useGameConfig } from '../../../hooks/useGameConfig'
import {
  factionCssVar,
  factionName,
  getAllFactions,
  sortFactionsByRainbowOrder,
} from '../../../utils/factions'
import { factionRoleVars } from '../../../utils/factionRoles'
import { EverymenCog } from '../../../components/factionMarks/everymenCogs'
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
import {
  UNAFFILIATED_FACTION_SLUG,
  type ProposeTaskState,
} from '../useProposeTask'

const SLUG = 'everymen'

/** The na kit's own level ladder, restated because nothing exports it. */
const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8]
/** The na kit's caps, and the counters that turn alarm on them. */
const TITLE_MAX = 200
const DESCRIPTION_MAX = 5000
/** Mirrors `schemas.task.MAX_TASK_NOTES`, which stays the authority. */
const NOTES_MAX = 2000

/* ── The sheet's palette, named for the ROLE each colour plays. The same names
 *    and the same tokens as `EverymenCreateCharacter`, so the two surfaces
 *    cannot drift; see the header for which reds may be ink and on what. ── */
/** The newsprint the paper is printed on — the faction's own card ground. */
const PAPER = 'var(--everymen-paper)'
/** The pasted-on plate: every field, every chip, every level node. */
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
/** The masthead bar, theme-INVARIANT: a job filed at night is the same job. */
const MAST = 'var(--faction-everymen-bill-mast)'
const MAST_INK = 'var(--faction-everymen-bill-mast-ink)'
/** The full-width bar at the foot of the sheet, and a picked chip's fill. */
const BAR = 'var(--faction-everymen-bill-cta-bg)'
const BAR_INK = 'var(--faction-everymen-bill-cta-ink)'
const PAPER_DEEP = 'var(--everymen-paper-deep)'
const SHADOW = 'var(--faction-everymen-bill-shadow)'
/** #1449's alarm rung, measured on this paper. Not the neutral `--color-danger`. */
const ALARM = 'var(--faction-everymen-card-alarm)'

/**
 * Bebas Neue, through this surface's OWN role-map namespace.
 *
 * `ev-order` and not the create plate's `ev-path` or the amendment's
 * `ev-amend`: a prefix may not be shared (#2659, pinned by
 * `utils/__tests__/factionRoleFallbacks.test.ts`). The MAP behind all three is
 * identical — same faction, same nine roles — so nothing about the paint
 * differs; only the name it is emitted under.
 */
const BEBAS = 'var(--ev-order-face)' /* Bebas Neue */
const COURIER = 'var(--font-body)' /* Courier Prime */

/** The cogs' period, the work order's own 22s. Ornament timing. */
const COG_PERIOD = '22s'

/* ── Ornament geometry (WORLD_ZERO_STYLE §4a: not layout spacing) ── */
/** The masthead pair, at the size every Everymen nameplate turns them. */
const MAST_COG = 16
/** The stage cog beside the page's heading. */
const STAGE_COG = { desktop: 40, mobile: 32 }
/** The mark each faction wears in the picker — the size every chooser draws (#2223). */
const CHIP_SIGIL = 18
/** The metatask tick box, at the na kit's own 18px. */
const TICK = 18
/** A level node: the na kit's 40px circle, struck square for this kit's radius 0. */
const NODE = 40
/** The base/bonus points plate. Wide enough for four figures in Courier. */
const POINTS_PLATE = 96

export default function EverymenProposeTask({ state }: { state: ProposeTaskState }) {
  const { t } = useTranslation(['forms', 'common'])
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

  /**
   * The #1695 admin-review window, in the era's own hours — never a typed-out
   * number. `null` until `/game-config` lands, and unknown means UNDRAWN rather
   * than assumed, which is the na kit's own doctrine on this string.
   */
  const adminReviewHours = useGameConfig()?.pending_task_admin_review_hours ?? null

  /**
   * Bebas, struck in tracked caps — every label and headline on the paper.
   * The create plate's own metrics (#1828/#1830): this kit draws its label a
   * size larger than the other seven.
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
  const counter = (used: number, max: number) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        fontFamily: COURIER,
        fontSize: 'var(--text-lg)',
      }}
    >
      <span style={{ color: used >= max ? ALARM : QUIET }}>
        {used}/{max}
      </span>
    </div>
  )

  /** The at-the-limit line. Genuinely danger, so it takes the alarm rung. */
  const tooLong = (message: string) => (
    <p
      style={{
        fontFamily: COURIER,
        fontSize: 'var(--text-content)',
        color: ALARM,
        margin: 0,
      }}
    >
      {message}
    </p>
  )

  const sheetStyle = {
    background: PAPER,
    border: `2px solid ${SHEET_FRAME}`,
    borderRadius: 0,
    boxShadow: SHADOW,
  }

  /* The nameplate — the identical element the enlistment paper and the work
     order mount: cog · the paper's name · cog, on the union's red bar, under a
     3px double rule and the printed-in shadow of its own ink. */
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

  /* THE FACTION'S ONE ORNAMENT (#2195). Not a `ComposerGround`: `.em-burst`
     already carries an anchored inset-0 layer with `pointer-events: none`, and
     this page never stands on a faction backdrop, so it wears the ornament
     always and takes no alternation branch. */
  const ground = <div aria-hidden className="em-burst" />

  /** The page's own heading, beside the union's turning cog. */
  const stage = (
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
        {t('proposeTask.pageTitle')}
      </h1>
    </div>
  )

  const rootStyle = {
    ...factionRoleVars(SLUG, 'ev-order'),
    fontFamily: COURIER,
    color: INK,
  }

  /* The filed receipt. The same sheet, so a proposal does not change paper the
     moment it is accepted — only what the paper says. */
  if (success) {
    return (
      <ComposerPage sizes={sizes} style={rootStyle}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} ground={ground}>
          {stage}
          <p
            style={{
              fontFamily: BEBAS,
              fontSize: 'var(--text-content)',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: INK,
              margin: 0,
            }}
          >
            {isMetatask
              ? t('proposeTask.successMeta.heading')
              : t('proposeTask.successTask.heading')}
          </p>
          {adminReviewHours !== null && (
            <p
              style={{
                fontFamily: COURIER,
                fontSize: 'var(--text-content)',
                color: QUIET,
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

  /* Unaffiliated leads the picker: it is the default, and a STATE rather than a
     faction, so it is an extra option here rather than a registry entry
     (ADR-0039). Everything after it comes from the API, falling back to the
     static registry before the fetch lands, in the site's one rainbow order. */
  const factionOptions: string[] = [
    UNAFFILIATED_FACTION_SLUG,
    ...sortFactionsByRainbowOrder(
      (factions.length > 0 ? factions : getAllFactions()).map((f) => ({ slug: f.slug })),
    ).map((f) => f.slug),
  ]

  return (
    <ComposerPage sizes={sizes} style={rootStyle}>
      {/* The docket, above the sheet: the pick the sheet below is dressed by.
          That placement is the na kit's own — the chips live outside its framed
          card, because the pick is what the card wears and cannot live inside
          the thing it dresses. The column is `ComposerPage`'s own, so the row
          lines up with the sheet's edge at both widths. */}
      <div
        style={{
          maxWidth: sizes.maxWidth,
          margin: '0 auto',
          padding: 'var(--space-lg) var(--space-lg) 0',
        }}
      >
        {/* One wrapping radiogroup, not `ChipRow`: its shell scrolls sideways
            and prints a visible inline label, which would bury three of the
            eight options. The chips are plates in this kit's stock — the create
            plate's calling picker, laid out in the na kit's wrapping row. */}
        <div
          role="radiogroup"
          aria-label={t('proposeTask.factionLabel')}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}
        >
          {factionOptions.map((slug) => {
            const picked = factionSlug === slug
            return (
              <button
                key={slug}
                type="button"
                role="radio"
                aria-checked={picked}
                onClick={() => setFactionSlug(slug)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderRadius: 0,
                  padding: 'var(--space-sm) var(--space-md)',
                  background: picked ? BAR : PANEL,
                  border: `2px solid ${picked ? BAR : FRAME}`,
                  /* The faction's own hue as a struck OFFSET SHADOW — the
                     union's printed-in idiom — rather than the ring another kit
                     would draw. A hue is a FILL here and never an ink. */
                  boxShadow: picked ? `3px 3px 0 ${factionCssVar(slug)}` : 'none',
                }}
              >
                {/* Picked, the ground becomes BAR — this kit's own fill, not the
                    offered slug's — so the mark moves to this kit's `onFill` ink
                    the way the label beside it does (#2852). */}
                <FactionSigil slug={slug} size={CHIP_SIGIL} color={picked ? BAR_INK : undefined} />
                <span
                  style={{
                    fontFamily: factionCssVar(slug, 'card-font'),
                    fontSize: 'var(--text-content)',
                    color: picked ? BAR_INK : INK,
                  }}
                >
                  {factionName(slug)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* A REAL `<form>`, not a bare button with an onClick: it is what makes
          Enter commit from a text field. `handleSubmit` calls `preventDefault`. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} ground={ground}>
          {stage}

          {/* Task name. Placeholder-only, like every field on this sheet, and
              `aria-label` carries the same one string so the accessible name is
              not lost with the visible one. */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              required
              maxLength={TITLE_MAX}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              aria-label={t('proposeTask.fields.name.label')}
              placeholder={t('proposeTask.fields.name.label')}
              style={{ ...fieldBox, fontFamily: BEBAS, letterSpacing: '0.02em' }}
            />
            {counter(title.length, TITLE_MAX)}
            {title.length >= TITLE_MAX && tooLong(t('proposeTask.fields.name.tooLong'))}
          </ComposerSection>

          {/* Description */}
          <ComposerSection rule={false}>
            <textarea
              data-composer-field
              rows={6}
              maxLength={DESCRIPTION_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              aria-label={t('proposeTask.fields.description.label')}
              placeholder={t('proposeTask.fields.description.placeholder')}
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.6 }}
            />
            {counter(description.length, DESCRIPTION_MAX)}
            {description.length >= DESCRIPTION_MAX &&
              tooLong(t('proposeTask.fields.description.tooLong'))}
          </ComposerSection>

          {/* The rate for the job, and who may take it. */}
          <ComposerSection rule={false}>
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-xl)',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <span style={sectionLabel}>
                  {isMetatask
                    ? t('proposeTask.fields.bonusPoints.label')
                    : t('proposeTask.fields.basePoints.label')}
                </span>
                <input
                  data-composer-field
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
                  style={{
                    ...fieldBox,
                    width: POINTS_PLATE,
                    fontWeight: 700,
                    textAlign: 'center',
                  }}
                />
                {isMetatask && (
                  <span style={{ fontFamily: COURIER, fontSize: 'var(--text-lg)', color: QUIET }}>
                    {t('proposeTask.fields.bonusPoints.hint')}
                  </span>
                )}
              </div>

              {/* The level ladder. `FilterLevelNodes` is not mounted: it brings
                  the site's own `--color-bg-surface` ground, a neutral border
                  and a 50% radius, which is a browser control dropped on the
                  bill — the same refusal the create plate makes of
                  `.btn-outline`. These are this kit's plates at that row's own
                  geometry, and they announce identically (`aria-pressed`, the
                  shared `common:filters.levelAtLeast` word). */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <span style={sectionLabel}>{t('proposeTask.fields.minimumLevel.label')}</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                  {LEVEL_OPTIONS.map((level) => {
                    const on = levelRequired === level
                    return (
                      <button
                        key={level}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setLevelRequired(on ? '' : level)}
                        disabled={submitting}
                        style={{
                          width: NODE,
                          height: NODE,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box',
                          borderRadius: 0,
                          cursor: 'pointer',
                          fontFamily: BEBAS,
                          fontSize: 'var(--text-content)',
                          letterSpacing: '0.04em',
                          background: on ? BAR : PANEL,
                          color: on ? BAR_INK : INK,
                          border: `2px solid ${on ? BAR : FRAME}`,
                        }}
                      >
                        {t('common:filters.levelAtLeast', { level })}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </ComposerSection>

          {/* The metatask tick, gated on the capability seam. A
              `role="checkbox"` button and not an `<input>`: a native box is
              tinted with `accent-color`, which takes ONE colour (ADR-0039). */}
          {canProposeMetatask && (
            <ComposerSection rule={false}>
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
                  margin: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: TICK,
                    height: TICK,
                    flex: 'none',
                    boxSizing: 'border-box',
                    borderRadius: 0,
                    background: isMetatask ? BAR : PANEL,
                    border: `2px solid ${isMetatask ? BAR : FRAME}`,
                  }}
                />
                <span style={sectionLabel}>{t('proposeTask.metaToggle.label')}</span>
              </button>
            </ComposerSection>
          )}

          {/* Notes to admin — hidden for metatasks, as in the na kit (#1823). */}
          {!isMetatask && (
            <ComposerSection rule={false}>
              <textarea
                data-composer-field
                rows={3}
                maxLength={NOTES_MAX}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                aria-label={t('proposeTask.fields.notes.label')}
                placeholder={t('proposeTask.fields.notes.label')}
                style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.6 }}
              />
            </ComposerSection>
          )}

          {/* The proof, pulled while the copy is still being set: the union's
              dashed red on the paper itself rather than a second plate, so the
              strip reads as a printed proof and its type keeps the three inks
              the create plate already measures on this ground. */}
          {title && (
            <div
              style={{
                border: `2px dashed ${RED}`,
                borderRadius: 0,
                padding: 'var(--space-md) var(--space-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-xs)',
              }}
            >
              {/* Caption, not a heading: the faction name is interpolated in,
                  so a long slug makes it a run of prose (#1307). */}
              <span style={sectionLabel}>
                {isMetatask
                  ? t('proposeTask.preview.metaHeading', { faction: factionName(factionSlug) })
                  : t('proposeTask.preview.taskHeading', { faction: factionName(factionSlug) })}
              </span>
              <p
                style={{
                  fontFamily: BEBAS,
                  fontSize: 'var(--text-content)',
                  letterSpacing: '0.02em',
                  color: INK,
                  margin: 0,
                }}
              >
                {title}
              </p>
              {description && (
                <p
                  style={{
                    fontFamily: COURIER,
                    fontSize: 'var(--text-content)',
                    color: QUIET,
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
                  gap: 'var(--space-md)',
                  fontFamily: COURIER,
                  fontSize: 'var(--text-lg)',
                  color: QUIET,
                }}
              >
                {isMetatask ? (
                  <span>
                    {t('proposeTask.preview.bonusPoints', { points: metaBonusValue || '?' })}
                  </span>
                ) : (
                  <span>
                    {t('proposeTask.preview.points', {
                      points: pointValue || '?',
                      // The raw input string. An empty or unparseable one draws
                      // "?" and takes the PLURAL — "? points" reads, "? point"
                      // does not (#2598).
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
          )}

          <ErrorBanner message={error ?? ''} style={{ color: ALARM }} />

          {/* The bill's rule, drawn ONCE above the footer (#1707). Seven dashed
              reds read as a form to be filled in, not as a work order. */}
          <ComposerRule
            style={{ height: 0, background: 'transparent', borderTop: `2px dashed ${RED}` }}
          />

          {/* [Cancel] … [Submit] — the global order from #646, with the filing
              stacked as a full-bleed BAR rather than an inline button. */}
          <ComposerFooter
            band
            start={
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={stencil({
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: QUIET,
                    textDecoration: 'underline',
                  })}
                >
                  {t('proposeTask.submit.cancel')}
                </button>
                {adminReviewHours !== null && (
                  <span
                    style={{
                      fontFamily: COURIER,
                      fontSize: 'var(--text-content)',
                      color: QUIET,
                      lineHeight: 1.55,
                    }}
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
                className="control-off"
                style={{
                  ...composerBandStyle(sizes, {
                    /* Design band: 15 / 400 / 0.22em in the label face, which
                       for the Everymen IS Bebas. */
                    fontFamily: BEBAS,
                    fontSize: 'var(--text-content)',
                    letterSpacing: '0.22em',
                    /* The SHEET's frame — gold by day, deep red by night — and
                       NOT `--everymen-frame`, which is the ink the plates are
                       ruled in. */
                    frame: SHEET_FRAME,
                    color: BAR_INK,
                    background: BAR,
                  }),
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
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

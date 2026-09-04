/**
 * The Ephemerists propose-a-task archetype — THE VALLEY PLATE, ruled for a task
 * that does not exist yet (#2538, the seven-faction fan-out).
 *
 * DERIVED, not designed (owner ruling 2026-08-24). No sheet was drawn and none
 * was commissioned: this is `EphemeristsCreateCharacter`'s dress — the same
 * chassis, the same ground, the same ornament, the same field furniture —
 * applied to the fields the proposal form actually has. Every value below
 * already ships on that page or on `EphemeristsEditPraxis`; nothing here mints a
 * token, a keyframe, an SVG, a keyframe name or a string.
 *
 * ## The slug this wears is the TARGET, not the viewer
 *
 * Owner ruling 2026-08-24: *"propose a task should have the faction of the task
 * being proposed"*. The dispatcher resolves on `state.factionSlug` — the live
 * chip pick — so this plate appears the moment Ephemerists is chosen as the
 * task's faction and the page returns to the na kit when the pick is cleared or
 * "unaffiliated" is picked. That is `createCharacter`'s seam exactly, which is
 * also why the chip row below is drawn as the create page's OWN calling picker
 * rather than as the site's `Chip`: it is the same control answering the same
 * question, and this surface must not put site chrome on the plate.
 *
 * ## Derived means CREATE'S FURNITURE OVER PROPOSE'S FIELDS
 *
 * | this page's field   | the create plate's furniture it wears                |
 * |---------------------|------------------------------------------------------|
 * | faction chips       | the "answer a calling" row — sigil, name, plate ground |
 * | task name           | `fieldBox` in the engraved face, with its counter      |
 * | description / notes | `fieldBox`, Spectral reading face, with its counter    |
 * | base / bonus points | `fieldBox` narrowed to a numeral                       |
 * | minimum level       | the stage cartouche at node size — `Octagon`, shared    |
 * | metatask toggle     | the picker row's selected/unselected pair, at box size  |
 * | preview strip       | an inset `INNER` panel, the fields' own ground          |
 * | submit / cancel     | the create plate's footer band and its quiet exit       |
 *
 * The one control the na kit mounts that this plate does not is
 * `FilterLevelNodes`: it brings `--color-bg-surface` and `--color-border-strong`
 * with it, which is the "browser control dropped on the plate" the create twin's
 * `PortraitPicker` note already argues against. The level row here is the SHARED
 * `Octagon` at node size, so it is the plate's geometry and not a second one.
 *
 * ## What is NOT here
 *
 * `state.isLoggedIn` and `state.canProposeTask` are answered in the DISPATCHER,
 * above this file (`pages/ProposeTask.tsx`). Seven archetypes each carrying a
 * copy of that gate is the thing the chassis exists not to do. The metatask path
 * and the unaffiliated option DO survive here, and `metataskProposal.test.tsx` /
 * `unaffiliatedOption.test.tsx` assert both against this file the moment it
 * registers — they derive their roster from `surfaceMap('proposeTask')`, so this
 * PR appends to no test registry.
 *
 * ## Colour
 *
 * Plate tokens only, through `components/factionMarks/ephemeristsPlate` — never a
 * ternary and never a `dark ?` branch; the register flips in the cascade (#2141).
 * `-brass` is a RULE colour and never an ink; quiet type takes `-quiet`. This is
 * the plate, never the illuminated codex (`--eph-*`) — the two grounds must not
 * be mixed on one surface (ADR-0055). The over-length messages take
 * `--faction-ephemerists-card-alarm` for the measured reason both character
 * plates give: the neutral danger ink misses AA on this stock.
 *
 * NO NEW INK/GROUND PAIR IS INTRODUCED. Every pair drawn here — INK and QUIET
 * and CAPTION on PLATE, INK on INNER, CTA_INK on CTA, BAND_INK on the band,
 * ALARM on PLATE — is a pair the create and edit plates already draw and
 * `characterPaths/__tests__/createCharacterContrast.test.ts` /
 * `utils/__tests__/factionContrast.test.ts` already resolve. So this PR adds no
 * contrast rows: there is nothing new to measure, which is what "derived" buys.
 *
 * NO GLOBAL `--color-text-*` INK IS WRITTEN HERE. `local/no-global-ink-on-faction-surface`
 * is on for this file from birth and stays on — 2.01:1 on this plate in light.
 * `--label-ink` is repointed to `QUIET` on the page root, as both twins do.
 *
 * ## The faction hue is a FILL here, exactly once
 *
 * A chip's own colour is a 3px vertical RULE at the row's start, through
 * `factionFill(slug, 'rule')` — which is also how `na` keeps its spectrum on a
 * surface that has no single hue for it (ADR-0039, #794). It is never ink: the
 * row's type stays on the plate's measured pair (WORLD_ZERO_STYLE §3).
 *
 * ## Copy — none of its own
 *
 * Every string is an existing `forms:proposeTask.*` key, unchanged. The three
 * placeholder-only fields name themselves with `aria-label` from the same
 * string, so a sighted reader and a screen reader hear one vocabulary.
 *
 * ## One responsive component, no mobile twin
 *
 * `useComposerSizes()` reads `useFormFactor()` and picks the size set; one tree
 * at two widths. Every fixed number here is ornament geometry, never a layout
 * grid (SPEC-faction-ui-profile §1a).
 */
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import Breadcrumb from '../../../components/nav/Breadcrumb'
import FactionSigil from '../../../components/sigil/FactionSigil'
import { useGameConfig } from '../../../hooks/useGameConfig'
import {
  factionCssVar,
  factionFill,
  factionName,
  getAllFactions,
  sortFactionsByRainbowOrder,
} from '../../../utils/factions'
import { UNAFFILIATED_FACTION_SLUG, type ProposeTaskState } from '../useProposeTask'
import {
  ComposerFooter,
  ComposerGround,
  ComposerHeading,
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
  BAND_INK,
  BRASS,
  BRASS_LIGHT,
  CAPS,
  CAPTION,
  Cornice,
  DECO,
  DISC,
  GravityField,
  INK,
  INNER,
  LINE,
  OCHRE,
  Octagon,
  PLATE,
  QUIET,
  READING,
  SHADOW,
  Sign,
} from '../../../components/factionMarks/ephemeristsPlate'
import { EphemeristsMasthead } from '../../../components/factionMarks/EphemeristsMasthead'

const SLUG = 'ephemerists'

/* The cast's own pair, and the alarm — the three the plate module does not
   export because no other surface has a primary button. Same three constants,
   same tokens, as both character plates name. */
const CTA = 'var(--faction-ephemerists-plate-cta-bg)'
const CTA_INK = 'var(--faction-ephemerists-plate-cta-ink)'
const ALARM = 'var(--faction-ephemerists-card-alarm)'

/**
 * The masthead's seed, which it feeds to the notation band in its header.
 *
 * REQUIRED, and stable per SURFACE so that two Ephemerists pages do not draw one
 * row of marks. This page has no record to name — the task does not exist yet,
 * which is the whole point of it — so the surface is the only stable thing there
 * is, exactly as `createCharacter` reasons on its own plate. A seed taken off
 * the typed title would redraw the band on every keystroke.
 */
const SEED = 'proposeTask'

/** The site's own level ladder, as the na kit lists it. */
const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8]

/** Both length caps are the na kit's literals, for the reason it states. */
const TITLE_MAX = 200
const DESCRIPTION_MAX = 5000
/** Mirrors `schemas.task.MAX_TASK_NOTES`, which stays the authority. */
const NOTES_MAX = 2000
/** The counter turns gold on the approach and alarm at the cap (#1609). */
const TITLE_WARN = 180
const DESCRIPTION_WARN = 4500

/* ── Ornament geometry (WORLD_ZERO_STYLE §4a: not layout spacing) ──
   The band, the field's nominal width and the margin rule are the plate's own
   pairs, carried at the same two sizes the create plate uses. */
const EPH_BAND = { desktop: 84, mobile: 68 }
const GRAVITY_WIDTH = { desktop: 720, mobile: 360 }
const GRAVITY_HEIGHT = 2400
const MARGIN_RULE = { desktop: 22, mobile: 13 }
/** The stage mark: a stepped octagon, drawn on a 100-unit viewBox. */
const STATUS_MARK = 44
/** The feather of Ma'at inside it — the proposal goes to be weighed. */
const STATUS_SIGN = 24
/** The sign following the cast: the scribe's reed. */
const SUBMIT_SIGN = 17
/** The mark each faction wears in the picker — the size every chooser draws (#2223). */
const PICKER_SIGIL = 18
/** The faction's own hue, as a rule down the chip's leading edge. */
const CHIP_RULE = 3
/** A level node: the cartouche at the na kit's own 40px node size. */
const LEVEL_NODE = 40
/** The metatask box — the picker row's pair, shrunk to a control. */
const META_BOX = 18
/** The points field is a numeral, not a sentence. */
const POINTS_FIELD = 96

/**
 * The stage mark: the feather, cut into a stepped octagon with a brass border.
 *
 * The create twin's mark with its sign changed. The shared `Octagon` path draws
 * the clip and the border at once — a `clipPath` has no stroke, and an inset
 * shadow would follow the element's RECTANGLE and leave the four diagonals
 * unbordered.
 */
function StatusMark() {
  return (
    <span style={{ position: 'relative', display: 'block', width: STATUS_MARK, height: STATUS_MARK, flexShrink: 0 }}>
      <svg
        width={STATUS_MARK}
        height={STATUS_MARK}
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0 }}
      >
        <Octagon inset={0} stroke={BRASS} width={3.4} fill={DISC} />
      </svg>
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Sign name="feather" size={STATUS_SIGN} color={BRASS} weight={1.6} />
      </span>
    </span>
  )
}

export default function EphemeristsProposeTask({ state }: { state: ProposeTaskState }) {
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

  // The #1695 admin-review window, in the era's own hours — interpolated,
  // never typed out, and UNDRAWN rather than assumed while `/game-config` is in
  // flight. The na kit's doctrine, kept.
  const adminReviewHours = useGameConfig()?.pending_task_admin_review_hours ?? null

  // Unaffiliated leads the picker: it is the default, and it is a state rather
  // than a faction (ADR-0039). Everything after it comes from the API, falling
  // back to the static registry before the fetch lands, in the site's one
  // rainbow order (#352). Same list, same order, as the na kit's chips.
  const factionOptions: string[] = [
    UNAFFILIATED_FACTION_SLUG,
    ...sortFactionsByRainbowOrder(
      (factions.length > 0 ? factions : getAllFactions()).map((f) => ({ slug: f.slug })),
    ).map((f) => f.slug),
  ]

  /** Cinzel small caps, the plate's label voice, over the layout's tracking. */
  const label = { fontFamily: CAPS, fontWeight: 500, letterSpacing: '0.24em' }
  /** Section heads sit on the plate, where the caption gold is measured. */
  const sectionLabel = { ...label, color: CAPTION }
  /** Radius 0, borderW 1.5 — the create plate's whole geometry row. */
  const fieldBox = {
    width: '100%',
    background: INNER,
    color: INK,
    border: `1.5px solid ${LINE}`,
    borderRadius: 0,
    padding: 'var(--space-md)',
    boxSizing: 'border-box',
    fontFamily: READING,
    fontSize: 'var(--text-content)',
  } as const

  /** The counter row under a field: quiet, gold on the approach, alarmed at the cap. */
  const counter = (used: number, max: number, warn: number) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: READING, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: used >= max ? ALARM : used >= warn ? CAPTION : QUIET }}>
        {used}/{max}
      </span>
    </div>
  )

  /** The AT-the-limit line, not the approach — the counter above already warns. */
  const tooLong = (message: string) => (
    <p style={{ fontFamily: READING, fontSize: 'var(--text-content)', color: ALARM, margin: 0 }}>{message}</p>
  )

  const sheetStyle = {
    background: PLATE,
    border: `1.5px solid ${LINE}`,
    borderRadius: 0,
    boxShadow: SHADOW,
  }

  const masthead = (
    <>
      {/* The sky band, as the create plate rules it: a wash whose stops are both
          plate tokens, so the sky moves with the cascade (#2141). */}
      <ComposerMasthead
        height={EPH_BAND[factor]}
        background={`linear-gradient(180deg, color-mix(in srgb, var(--faction-ephemerists-plate-band) 82%, ${BRASS_LIGHT}) 0%, var(--faction-ephemerists-plate-band) 100%)`}
        style={{
          height: 'auto',
          minHeight: EPH_BAND[factor],
          overflow: 'hidden',
          color: BAND_INK,
        }}
      >
        <EphemeristsMasthead slug={SLUG} scale={sizes.isMobile ? 'card' : 'page'} seed={SEED} />
      </ComposerMasthead>
      {/* The cavetto cornice, carrying the one motion — `.eph-cornice-glow`,
          whose pigment, cycle and reduced-motion gate live in `index.css`.
          Nothing here writes an inline `animation:`. */}
      <Cornice glow />
    </>
  )

  const ground = (
    <ComposerGround inset={0} style={{ overflow: 'hidden' }}>
      <GravityField width={GRAVITY_WIDTH[factor]} height={GRAVITY_HEIGHT} />
      {/* The margin rule, struck in ochre down the gutter — outside the content
          column's inset, so no line of type ever runs into it. */}
      <span
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: MARGIN_RULE[factor],
          width: 1,
          background: OCHRE,
          opacity: 0.5,
        }}
      />
    </ComposerGround>
  )

  const pageStyle = {
    fontFamily: DECO,
    color: INK,
    ['--label-ink' as string]: QUIET,
  } as CSSProperties

  // The trail, in the SITE's voice rather than the plate's (#2973). It was
  // redrawn here because the shared component was keyed to a task id and this
  // page has no task; it now takes a `current` label, so the reason is gone and
  // the copy goes with it.
  const breadcrumb = <Breadcrumb current={t('proposeTask.pageTitle')} />

  if (success) {
    return (
      <ComposerPage sizes={sizes} style={pageStyle}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} reserveHead ground={ground}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
            <StatusMark />
            <h1 style={{ fontFamily: CAPS, fontSize: sizes.titleSize, color: INK, lineHeight: 1.2, margin: 0 }}>
              {isMetatask
                ? t('proposeTask.successMeta.heading')
                : t('proposeTask.successTask.heading')}
            </h1>
          </div>
          {adminReviewHours !== null && (
            <p style={{ fontFamily: READING, fontSize: 'var(--text-content)', color: QUIET, margin: 0, lineHeight: 1.7 }}>
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
    <ComposerPage sizes={sizes} style={pageStyle} breadcrumb={breadcrumb}>
      {/* A REAL `<form>`, not a bare button with an onClick — it is what makes
          Enter commit from a text field. `handleSubmit` calls `preventDefault()`
          itself. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        {/* THIS KIT IS THE CEILING FOR THE RESERVED HEAD (#2995) — see the
            table in `useComposerSizes`. Nothing here is shortened to reach it. */}
        <ComposerSheet
          sizes={sizes}
          style={sheetStyle}
          masthead={masthead}
          reserveHead
          ground={ground}
        >
          <ComposerHeading sizes={sizes}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
              <StatusMark />
              <h1
                style={{
                  fontFamily: CAPS,
                  fontSize: sizes.titleSize,
                  color: INK,
                  lineHeight: 1.2,
                  margin: 0,
                }}
              >
                {t('proposeTask.pageTitle')}
              </h1>
            </div>
          </ComposerHeading>

          {/* Who the task is FOR — and the control this whole page reskins on.
              The create plate's calling picker, wrapped as one radiogroup so the
              eight options are a single stop rather than eight (#1824). */}
          <ComposerSection rule={false} label={t('proposeTask.factionLabel')} labelStyle={sectionLabel}>
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
                    disabled={submitting}
                    style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      gap: 'var(--space-md)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderRadius: 0,
                      padding: 'var(--space-sm) var(--space-md)',
                      background: selected ? CTA : INNER,
                      border: `1.5px solid ${selected ? BRASS : LINE}`,
                    }}
                  >
                    {/* The faction's own colour, as a FILL and never an ink —
                        and the one shape that also answers for `na`, whose
                        identity is seven hues rather than one (ADR-0039). */}
                    <span
                      aria-hidden="true"
                      style={{ width: CHIP_RULE, flex: '0 0 auto', ...factionFill(slug, 'rule') }}
                    />
                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      {/* Selected, the ground becomes CTA — this kit's own fill,
                          not the offered slug's — so the mark moves to this
                          kit's `onFill` ink the way the label does (#2852). */}
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
                    </span>
                  </button>
                )
              })}
            </div>
          </ComposerSection>

          {/* Task name — placeholder-only, and the placeholder IS the accessible
              name, so `aria-label` carries the same string (#2598). */}
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
              style={{ ...fieldBox, fontFamily: CAPS }}
            />
            {counter(title.length, TITLE_MAX, TITLE_WARN)}
            {title.length >= TITLE_MAX && tooLong(t('proposeTask.fields.name.tooLong'))}
          </ComposerSection>

          {/* Description */}
          <ComposerSection rule={false}>
            <textarea
              rows={6}
              maxLength={DESCRIPTION_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              aria-label={t('proposeTask.fields.description.label')}
              placeholder={t('proposeTask.fields.description.placeholder')}
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.85 }}
            />
            {counter(description.length, DESCRIPTION_MAX, DESCRIPTION_WARN)}
            {description.length >= DESCRIPTION_MAX
              && tooLong(t('proposeTask.fields.description.tooLong'))}
          </ComposerSection>

          {/* Worth, and who may take it on. */}
          <ComposerSection rule={false}>
            <div style={{ display: 'flex', gap: 'var(--space-xl)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
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
                  style={{ ...fieldBox, width: POINTS_FIELD, fontFamily: CAPS, textAlign: 'center' }}
                />
                {isMetatask && (
                  <span style={{ fontFamily: READING, fontSize: 'var(--text-lg)', color: QUIET }}>
                    {t('proposeTask.fields.bonusPoints.hint')}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <span style={composerLabelStyle(sectionLabel)}>
                  {t('proposeTask.fields.minimumLevel.label')}
                </span>
                {/* The level ladder in the plate's own geometry — the stage
                    cartouche at node size. NOT `FilterLevelNodes`: it carries
                    `--color-bg-surface` and `--color-border-strong` onto a
                    faction sheet, which is the one thing this register does not
                    do. Tapping the active node clears it, as that control does. */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                  {LEVEL_OPTIONS.map((level) => {
                    const active = levelRequired === level
                    return (
                      <button
                        key={level}
                        type="button"
                        aria-pressed={active}
                        aria-label={t('proposeTask.preview.level', { level })}
                        onClick={() => setLevelRequired(active ? '' : level)}
                        disabled={submitting}
                        style={{
                          position: 'relative',
                          width: LEVEL_NODE,
                          height: LEVEL_NODE,
                          padding: 0,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <svg
                          width={LEVEL_NODE}
                          height={LEVEL_NODE}
                          viewBox="0 0 100 100"
                          aria-hidden="true"
                          style={{ position: 'absolute', inset: 0 }}
                        >
                          <Octagon
                            inset={0}
                            stroke={active ? BRASS : LINE}
                            width={3.4}
                            fill={active ? CTA : INNER}
                          />
                        </svg>
                        <span
                          aria-hidden="true"
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: CAPS,
                            fontSize: 'var(--text-content)',
                            color: active ? CTA_INK : INK,
                          }}
                        >
                          {level}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </ComposerSection>

          {canProposeMetatask && (
            <ComposerSection rule={<ComposerRule style={{ background: BRASS, opacity: 0.5 }} />}>
              {/* A `role="checkbox"` button, not an `<input>`: a native box is
                  tinted with `accent-color`, which takes ONE colour, and the
                  chips above it are eight (ADR-0039). */}
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
                    borderRadius: 0,
                    background: isMetatask ? CTA : INNER,
                    border: `1.5px solid ${isMetatask ? BRASS : LINE}`,
                  }}
                />
                <span style={composerLabelStyle({ ...label, color: INK })}>
                  {t('proposeTask.metaToggle.label')}
                </span>
              </button>
            </ComposerSection>
          )}

          {/* Notes to admin — hidden for metatasks, which is the na kit's rule
              and a wire fact too: the planner only reads `notes` on the standard
              branch (#1823). */}
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
                style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.85 }}
              />
            </ComposerSection>
          )}

          {/* What is about to be filed, as it will read. An inset panel on the
              fields' own ground — the plate has no second stock to offer. */}
          {title && (
            <ComposerSection rule={false}>
              <div
                style={{
                  background: INNER,
                  border: `1.5px solid ${LINE}`,
                  borderRadius: 0,
                  padding: 'var(--space-md) var(--space-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-sm)',
                }}
              >
                <span style={composerLabelStyle({ ...label, color: CAPTION })}>
                  {isMetatask
                    ? t('proposeTask.preview.metaHeading', { faction: factionName(factionSlug) })
                    : t('proposeTask.preview.taskHeading', { faction: factionName(factionSlug) })}
                </span>
                <p style={{ fontFamily: CAPS, fontSize: 'var(--text-content)', color: INK, margin: 0 }}>
                  {title}
                </p>
                {description && (
                  <p
                    style={{
                      fontFamily: READING,
                      fontSize: 'var(--text-content)',
                      color: QUIET,
                      margin: 0,
                      lineHeight: 1.55,
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
                    fontFamily: READING,
                    fontSize: 'var(--text-lg)',
                    color: QUIET,
                  }}
                >
                  <span>
                    {isMetatask
                      ? t('proposeTask.preview.bonusPoints', { points: metaBonusValue || '?' })
                      : t('proposeTask.preview.points', {
                          points: pointValue || '?',
                          // The raw input string: an empty or unparseable one
                          // draws "?" and takes the PLURAL (#2598).
                          count: Number(pointValue) || 0,
                        })}
                  </span>
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

          {/* The footer's own divider — the plate's brass, at the shared rule's
              1px, drawn ONCE above the footer (#1707). */}
          <ComposerRule style={{ background: BRASS, opacity: 0.5 }} />

          {/* [Cancel] … [Submit] — the global order from #646. */}
          <ComposerFooter
            band
            start={
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={submitting}
                  style={composerLabelStyle({
                    ...label,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: QUIET,
                  })}
                >
                  {t('proposeTask.submit.cancel')}
                </button>
                {adminReviewHours !== null && (
                  <span style={{ fontFamily: READING, fontSize: 'var(--text-lg)', color: QUIET }}>
                    {t('proposeTask.submit.note', { hours: adminReviewHours })}
                  </span>
                )}
              </>
            }
            end={
              <>
                {/* NO NOTATION BAND BRACKETING THIS BUTTON, and that is the law
                    rather than an omission (#2367): a PAGE wears the band in its
                    HEADER and a CARD wears it at the call to action.
                    `EphemeristsMasthead` above is already carrying it. */}
                <button
                  type="submit"
                  disabled={submitting}
                  /* `.eph-cta` supplies the ground and the ink (#2146), which is
                     why neither is named below. `.control-off` is declared after
                     it in `index.css` and carries `!important`, so the disabled
                     half beats the plate's paint. */
                  className="eph-cta control-off"
                  style={{
                    ...composerBandStyle(sizes, {
                      // Design band: 12 / 500 / 0.24em — the engraved label
                      // metrics exactly; 12 is the --text-lg rung.
                      fontFamily: CAPS,
                      fontWeight: 500,
                      letterSpacing: '0.24em',
                      frame: LINE,
                    }),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--space-sm)',
                    cursor: submitting ? 'wait' : 'pointer',
                  }}
                >
                  {submitting
                    ? t('proposeTask.submit.busy')
                    : isMetatask
                      ? t('proposeTask.submit.meta')
                      : t('proposeTask.submit.task')}
                  {/* The scribe's reed following the cast. */}
                  <Sign name="reed" size={SUBMIT_SIGN} color={CTA_INK} weight={1.4} />
                </button>
              </>
            }
          />
        </ComposerSheet>
      </form>
    </ComposerPage>
  )
}

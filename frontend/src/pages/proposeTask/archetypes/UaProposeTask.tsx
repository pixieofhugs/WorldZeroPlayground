/**
 * UA proposing a task — THE VELLUM LEAF, RULED FOR A TASK THAT DOES NOT EXIST
 * YET (#2538).
 *
 * DERIVED, NOT DESIGNED (owner ruling 2026-08-24). No sheet was drawn for this
 * page and none was needed: the ruling is that each archetype is that faction's
 * `createCharacter` page applied to this page's fields — same register, same
 * geometry, same field furniture, same ground, same ornament, same type. So this
 * is `UaCreateCharacter`'s leaf, element for element: the sun-bleached sheet,
 * the lotus-and-ensō ground, `fieldBox`, the counter row, the cast band closing
 * the sheet. Nothing new is drawn, no colour is minted, no key is minted, and
 * nothing was added to the stylesheet.
 *
 * THE SLUG IS THE TARGET FACTION. This archetype renders only when the chips
 * have `ua` picked — the faction the task is being proposed FOR — and the page
 * returns to the na kit the moment the pick changes. That seam is
 * `pages/ProposeTask.tsx`'s and it is `createCharacter`'s exactly; nothing here
 * re-decides it, and the two gates (`isLoggedIn`, `canProposeTask`) stay above
 * this file rather than being copied into it.
 *
 * ## What the create leaf could not supply
 *
 * Create asks for six fields and a calling; this page asks for a name, a
 * description, a difficulty, a minimum level, an optional metatask flag, notes
 * to an admin and a target faction — and then shows the proposal back. Each is
 * extended from a treatment the leaf already has:
 *
 *  - THE FACTION CHIPS ARE THE CALLING PICKER. Same button: `fieldBox` stock,
 *    radius 7, the faction's own mark at the chooser's 18px, its own card face
 *    for its name, and selection as this kit's FILL under `on-fill` ink with the
 *    offered faction's hue as a RING rather than as an ink (§3). The one change
 *    is the axis: eight options wrap as a row here where one or two invitations
 *    stacked as a column, which is the na page's own chip geometry (#1824) in
 *    this kit's paint. `na` keeps the leaf's text face rather than its
 *    `card-font`, the same deviation the na kit records (it was
 *    `proposeTask/factionSurfaces.ts`'s until #2993 deleted that module; the
 *    call is now `DefaultProposeTask`'s own name field) —
 *    `factionCssVar('na', 'card-font')` is Bebas Neue, a display cut this form's
 *    opening state never asked for.
 *
 *  - THE LEVEL ROW IS DRAWN HERE, AND THAT IS MEASURED RATHER THAN PREFERRED.
 *    `FilterLevelNodes` is site chrome: its nodes stand on `--color-bg-surface`,
 *    which is TRANSLUCENT in both cascades, so on this leaf it takes the warm
 *    stock underneath and its own `--color-text-secondary` lands at 4.41:1 in
 *    dark — under AA, on the control that says who the task is for. That is the
 *    same defect class `UaEditCharacter` moved `FactionRow` off the sheet for.
 *    There is nowhere to move a field the form asks for, and the shared
 *    component takes no paint props this PR may add, so the row is redrawn: the
 *    same 40px circle, the same 2px border, the same `aria-pressed` toggle and
 *    the same `common:filters.levelAtLeast` copy, in the kit's own inks.
 *    `__tests__/uaProposeTaskContrast.test.ts` holds both numbers.
 *
 *  - THE PREVIEW STRIP is the `fieldBox` panel with the leaf's own hairline —
 *    a well, which is what `--faction-ua-panel` is named for.
 *
 *  - THE SUCCESS SCREEN is the same sheet with the same ground, carrying the
 *    heading in the display cut and the body in the quiet tier.
 *
 * ## Colour, and the quiet tier
 *
 * Every value is a `--faction-ua-*` token or one of the nine roles under this
 * surface's own `factionRoleVars` prefix, so both themes arrive through the
 * `[data-theme="dark"]` cascade and no ternary stands in for it (#851). No
 * `var(--x, fallback)` arm anywhere: the resolver answers for all nine slugs
 * since #2690, so a fallback here is unreachable code (ADR-0089).
 *
 * The quiet tier is `-card-body` and NOT `-card-muted`, for the measured reason
 * `uaCreateCharacterContrast.test.ts` records: under the lotus wash muted reads
 * 4.38 / 3.79 and body reads 5.74 / 6.78. Same sheet, same wash, same answer.
 * The error banner and a counter at its cap take `-card-alarm` rather than the
 * neutral `--color-danger`, which is 3.71:1 on this sheet in light (#1231).
 *
 * ## One responsive component, no mobile twin
 *
 * `useComposerSizes()` reads `useFormFactor()` and picks the size set; one tree
 * at two widths. Every fixed number here is ornament geometry, never a layout
 * grid (SPEC-faction-ui-profile §1a). The ensō turns on `.ep-spin` through the
 * shared `--ep-spin-dur` hook rather than a second keyframe or an inline
 * `animation:` (#1003).
 *
 * ## Presentation only
 *
 * `useProposeTask` stays the single source of state: nothing here touches the
 * submit path, the planner or the payload. The metatask path and the
 * unaffiliated option survive because this is the same pure function of
 * `ProposeTaskState` the na kit is — `metataskProposal.test.tsx` and
 * `unaffiliatedOption.test.tsx` walk every registered archetype and this one
 * inherits them.
 *
 * Every field is placeholder-only, and every one names itself: `aria-label` and
 * `placeholder` read the same catalogue keys the na kit reads, so the two
 * surfaces cannot drift apart in what a screen reader hears. Every field carries
 * `data-composer-field` and nothing suppresses an outline, so focus takes the
 * shared ring (#2266).
 */
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import Breadcrumb from '../../../components/nav/Breadcrumb'
import FactionSigil from '../../../components/sigil/FactionSigil'
import { useGameConfig } from '../../../hooks/useGameConfig'
import {
  factionCssVar,
  factionName,
  getAllFactions,
  isKnownFaction,
  sortFactionsByRainbowOrder,
} from '../../../utils/factions'
import { factionRoleVars } from '../../../utils/factionRoles'
import {
  ComposerFooter,
  ComposerGround,
  ComposerPage,
  ComposerRule,
  ComposerSection,
  ComposerSheet,
  ErrorBanner,
  composerBandStyle,
  composerLabelStyle,
  useComposerSizes,
} from '../../editPraxis/archetypes/shared'
import { UaBand } from '../../../components/cardMasthead/factionBands'
import { Lotus } from '../../../components/factionMarks'
import { UaSigil } from '../../../components/sigil/UaSigil'
import { UA_DISPLAY, UA_TEXT } from '../../../components/factionMarks/uaAtoms'
import {
  UNAFFILIATED_FACTION_SLUG,
  type ProposeTaskState,
} from '../useProposeTask'

const SLUG = 'ua'

/* The practice's inks, named for the ROLE each plays — the same constants and
 * the same tokens `UaCreateCharacter` names, because this is that dress. */
const SHEET = 'var(--leaf-propose-task-paper)' /* the sun-bleached sheet */
const FIELD = 'var(--faction-ua-panel)' /* inset panel — fields, wells */
const INK = 'var(--leaf-propose-task-ink)'
/* `-card-body`, not `-card-muted`: the quiet tier on the WASHED sheet is one
 * rung up (4.38 / 3.79 vs 5.74 / 6.78 — `uaCreateCharacterContrast.test.ts`). */
const BODY = 'var(--faction-ua-card-body)'
const ACCENT = 'var(--leaf-propose-task-accent)'
const RULE = 'var(--faction-ua-rule)' /* the neutral hairline */
const HAIR = 'var(--faction-ua-hair)' /* the faintest divider, below -rule */
const FILL = 'var(--leaf-propose-task-fill)'
const ON_FILL = 'var(--leaf-propose-task-on-fill)'
const ALARM = 'var(--faction-ua-card-alarm)'
/* The one ink that is neither type tier nor alarm: a bonus is a credit, and the
 * leaf already has a name for that rung. It stands in for the na kit's
 * `--color-success`, which is a global the tier arm rightly keeps off a sheet. */
const CREDIT = 'var(--faction-ua-card-credit)'

/** Geometry the kit pins: radius 7, a 2px border. Ornament, not spacing. */
const RADIUS = 7
const BORDER_WIDTH = 2

/** The ensō's turn, re-timed off the shared `--ep-spin-dur` hook. */
const GROUND_SPIN = '200s'

/** The mark each faction wears in a chooser — the size every other one draws (#2223). */
const PICKER_SIGIL = 18

/** The level row's node: the shared control's circle, in this kit's paint. */
const NODE_SIZE = 40

/** The metatask tick box, at the size the na kit's box already is. */
const TICK_SIZE = 18

/** The na kit's own caps and rungs, restated because they are this FORM's. */
const TITLE_MAX = 200
const DESCRIPTION_MAX = 5000
const NOTES_MAX = 2000
const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8]

export default function UaProposeTask({ state }: { state: ProposeTaskState }) {
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

  /* The #1695 admin-review window in the era's own hours, `null` until
     `/game-config` lands — unknown means UNDRAWN rather than assumed, which is
     the doctrine the na kit sets and every promise below interpolates. */
  const adminReviewHours = useGameConfig()?.pending_task_admin_review_hours ?? null

  /* Unaffiliated leads, then the API's factions in the site's one rainbow order
     (#352), falling back to the static registry before the fetch lands — the na
     kit's own list, unchanged, because the OPTIONS are not a dress decision. */
  const factionOptions: string[] = [
    UNAFFILIATED_FACTION_SLUG,
    ...sortFactionsByRainbowOrder(
      (factions.length > 0 ? factions : getAllFactions()).map((f) => ({ slug: f.slug })),
    ).map((f) => f.slug),
  ]

  /* Ornament geometry, in raw px because a drawn figure is neither type nor
     spacing (WORLD_ZERO_STYLE §4a). The composer's own pair, unchanged. */
  const groundGeometry = sizes.isMobile
    ? { lotus: 300, lotusLeft: -122, lotusTop: -94, enso: 208, ensoRight: -66, ensoBottom: -58 }
    : { lotus: 420, lotusLeft: -170, lotusTop: -130, enso: 300, ensoRight: -96, ensoBottom: -84 }

  const labelStyle = { fontFamily: UA_TEXT, color: BODY }

  const fieldBox = {
    width: '100%',
    background: FIELD,
    color: INK,
    border: `1px solid ${RULE}`,
    borderRadius: RADIUS,
    padding: 'var(--space-md)',
    boxSizing: 'border-box',
    fontFamily: UA_TEXT,
    fontSize: 'var(--text-content)',
  } as const

  const sheetStyle = {
    background: SHEET,
    border: `${BORDER_WIDTH}px solid ${ACCENT}`,
    borderRadius: RADIUS,
  }

  const quietLine = {
    fontFamily: UA_TEXT,
    fontSize: 'var(--text-content)',
    color: BODY,
    lineHeight: 1.55,
    margin: 0,
  }

  /** The counter under a field: quiet, and alarmed at the cap. */
  const counter = (used: number, max: number) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        fontFamily: UA_TEXT,
        fontSize: 'var(--text-lg)',
        color: used >= max ? ALARM : BODY,
      }}
    >
      <span>
        {used}/{max}
      </span>
    </div>
  )

  /* THE BAND IS THE SHIPPED ONE (#2995, owner ruling 2026-09-01: "feel free to
     use the task card header for UA the same way that singularity does").
     `UaBand` out of `components/cardMasthead/factionBands` — the same band
     `UaTaskCard`, `UaPraxisCard` and `UaSeal` already mount, no props, no copy.
     Singularity's masthead on this page is that move one kit over: its window
     bar is `SingularityLamps`, its card's own vocabulary rather than a private
     redraw.

     THIS REVERSES THE COMMENT THAT STOOD HERE, which said UA "is the one
     faction that draws no top band". That was never true of the faction — the
     band is exported beside the other six and mounted on three surfaces — only
     of UA's four COMPOSER surfaces, and only while nothing reserved a head for
     it. #2995 reserves one on this page, so a bandless sheet would open with
     96px of empty ground where every other kit has its chrome. The other three
     composer surfaces reserve nothing, get no band, and their comments stand.

     THE GROUND IS STILL THE IDENTITY. The lotus and the turning ensō below are
     untouched; the band names the leaf at the top of it, where the reserved
     head is. */
  const masthead = <UaBand />
  const ground = (
    <ComposerGround inset={0} opacity="var(--faction-ua-card-lotus-opacity)">
      <Lotus
        size={groundGeometry.lotus}
        color="var(--faction-ua-card-lotus)"
        style={{
          position: 'absolute',
          left: groundGeometry.lotusLeft,
          top: groundGeometry.lotusTop,
        }}
      />
      <span
        className="ep-spin"
        style={
          {
            position: 'absolute',
            right: groundGeometry.ensoRight,
            bottom: groundGeometry.ensoBottom,
            '--ep-spin-dur': GROUND_SPIN,
          } as CSSProperties
        }
      >
        <UaSigil width={groundGeometry.enso} height={groundGeometry.enso} />
      </span>
    </ComposerGround>
  )

  const pageStyle = {
    ...factionRoleVars(SLUG, 'leaf-propose-task'),
    fontFamily: UA_TEXT,
    color: INK,
  }

  const heading = (text: string) => (
    <h1
      style={{
        fontFamily: UA_DISPLAY,
        fontWeight: 600,
        fontSize: sizes.titleSize,
        color: INK,
        lineHeight: 1.1,
        margin: 0,
        // The chassis' heading floor (#2995) — the second term in the offset
        // the chip row lands at, and the same number on all nine kits.
        minHeight: sizes.headingHeight,
      }}
    >
      {text}
    </h1>
  )

  if (success) {
    return (
      <ComposerPage sizes={sizes} style={pageStyle}>
        <ComposerSheet sizes={sizes} style={sheetStyle} ground={ground}>
          {heading(
            isMetatask
              ? t('proposeTask.successMeta.heading')
              : t('proposeTask.successTask.heading'),
          )}
          {adminReviewHours !== null && (
            <p style={quietLine}>
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
      /* The trail the na kit draws, kept rather than dropped — a reskin may not
         cost a page its way back — but NOT in the leaf's quiet ink any more
         (#2973). That was a `--faction-*` token on a control #2102 rule 1 holds
         to the site's own tertiary, and the ground it stands on is the app's
         page rather than this skin's, so the leaf ink was never measured where
         the crumb is read. */
      breadcrumb={<Breadcrumb current={t('proposeTask.pageTitle')} />}
    >
      {/* A REAL `<form>`: it is what makes Enter commit from a text field, and
          `handleSubmit` calls `preventDefault()` itself. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        {/* THE BAND AND THE SLOT ARRIVE TOGETHER (#2995), and only here. This
            is the kit the owner named as good — its chips were the highest of
            the nine because nothing at all stood above them — so a reserved head
            it did not fill would read as the regression. The success sheet below
            reserves no head and mounts no band: the band is what fills the slot,
            so where there is no slot there is nothing to fill. */}
        <ComposerSheet
          sizes={sizes}
          style={sheetStyle}
          masthead={masthead}
          reserveHead
          ground={ground}
        >
          {heading(t('proposeTask.pageTitle'))}

          {/* Who the task is for — the pick this whole page reskins on. */}
          <ComposerSection
            rule={false}
            label={t('proposeTask.factionLabel')}
            labelStyle={labelStyle}
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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderRadius: RADIUS,
                      padding: 'var(--space-sm) var(--space-md)',
                      background: selected ? FILL : FIELD,
                      border: `1px solid ${selected ? FILL : RULE}`,
                      // The offered faction's own hue as a RING, never as ink
                      // (§3) — the chip's type stays on the leaf's measured pair.
                      boxShadow: selected ? `0 0 0 2px ${factionCssVar(slug)}` : 'none',
                    }}
                  >
                    <FactionSigil
                      slug={slug}
                      size={PICKER_SIGIL}
                      color={selected ? ON_FILL : undefined}
                    />
                    <span
                      style={{
                        // Each calling in its own card face, as the create leaf's
                        // picker sets it. `na` keeps the leaf's text face: its
                        // `card-font` is the neutral display cut this form's
                        // opening state never asked for (the na kit's own call,
                        // in `DefaultProposeTask` since #2993).
                        fontFamily: isKnownFaction(slug)
                          ? factionCssVar(slug, 'card-font')
                          : UA_TEXT,
                        fontSize: 'var(--text-content)',
                        color: selected ? ON_FILL : INK,
                      }}
                    >
                      {factionName(slug)}
                    </span>
                  </button>
                )
              })}
            </div>
          </ComposerSection>

          {/* Task name — the page's one field in the display cut, as the create
              leaf sets the chosen name. */}
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
              style={{ ...fieldBox, fontFamily: UA_DISPLAY, fontWeight: 600 }}
            />
            {counter(title.length, TITLE_MAX)}
            {title.length >= TITLE_MAX && (
              <p style={{ ...quietLine, color: ALARM }}>
                {t('proposeTask.fields.name.tooLong')}
              </p>
            )}
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
              style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.7 }}
            />
            {counter(description.length, DESCRIPTION_MAX)}
            {description.length >= DESCRIPTION_MAX && (
              <p style={{ ...quietLine, color: ALARM }}>
                {t('proposeTask.fields.description.tooLong')}
              </p>
            )}
          </ComposerSection>

          {/* What it is worth, and who may take it. */}
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
                <span style={composerLabelStyle(labelStyle)}>
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
                    width: 96,
                    fontFamily: UA_DISPLAY,
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                />
                {isMetatask && (
                  <span style={{ ...quietLine, fontSize: 'var(--text-lg)' }}>
                    {t('proposeTask.fields.bonusPoints.hint')}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <span style={composerLabelStyle(labelStyle)}>
                  {t('proposeTask.fields.minimumLevel.label')}
                </span>
                {/* The shared `FilterLevelNodes` stands on `--color-bg-surface`,
                    which is translucent and takes this leaf's warm stock: its own
                    ink reads 4.41:1 in dark there. Same circle, same toggle, same
                    copy, this kit's inks — see the file header and the contrast
                    test beside it. */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                  {LEVEL_OPTIONS.map((level) => {
                    const active = levelRequired === level
                    return (
                      <button
                        key={level}
                        type="button"
                        aria-pressed={active}
                        disabled={submitting}
                        onClick={() => setLevelRequired(active ? '' : level)}
                        style={{
                          width: NODE_SIZE,
                          height: NODE_SIZE,
                          borderRadius: '50%',
                          boxSizing: 'border-box',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          padding: 0,
                          fontFamily: UA_TEXT,
                          fontSize: 'var(--text-content)',
                          fontWeight: active ? 600 : 400,
                          background: active ? FILL : FIELD,
                          color: active ? ON_FILL : INK,
                          border: `${BORDER_WIDTH}px solid ${active ? FILL : RULE}`,
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

          {canProposeMetatask && (
            <ComposerSection rule={<ComposerRule style={{ background: HAIR }} />}>
              {/* A `role="checkbox"` button, not an `<input>`: a native box is
                  tinted with `accent-color`, which takes ONE colour (#1824). */}
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
                    width: TICK_SIZE,
                    height: TICK_SIZE,
                    flex: 'none',
                    borderRadius: 4,
                    boxSizing: 'border-box',
                    background: isMetatask ? FILL : FIELD,
                    border: `${BORDER_WIDTH}px solid ${isMetatask ? FILL : RULE}`,
                  }}
                />
                <span style={composerLabelStyle({ fontFamily: UA_TEXT, color: INK })}>
                  {t('proposeTask.metaToggle.label')}
                </span>
              </button>
            </ComposerSection>
          )}

          {/* Notes to admin — hidden for metatasks, as the na kit hides it
              (#1823): only the standard branch's planner reads the field. */}
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
                style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.7 }}
              />
            </ComposerSection>
          )}

          {/* The proposal read back, in the leaf's own well. */}
          {title && (
            <ComposerSection rule={false}>
              <div
                style={{
                  background: FIELD,
                  border: `1px solid ${RULE}`,
                  borderRadius: RADIUS,
                  padding: 'var(--space-md) var(--space-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-xs)',
                }}
              >
                <span style={composerLabelStyle(labelStyle)}>
                  {isMetatask
                    ? t('proposeTask.preview.metaHeading', { faction: factionName(factionSlug) })
                    : t('proposeTask.preview.taskHeading', { faction: factionName(factionSlug) })}
                </span>
                <p
                  style={{
                    fontFamily: UA_DISPLAY,
                    fontWeight: 600,
                    fontSize: 'var(--text-content)',
                    color: INK,
                    margin: 0,
                  }}
                >
                  {title}
                </p>
                {description && (
                  <p
                    style={{
                      ...quietLine,
                      lineHeight: 1.4,
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
                    fontFamily: UA_TEXT,
                    fontSize: 'var(--text-lg)',
                    color: BODY,
                  }}
                >
                  {isMetatask ? (
                    <span style={{ color: CREDIT }}>
                      {t('proposeTask.preview.bonusPoints', { points: metaBonusValue || '?' })}
                    </span>
                  ) : (
                    <span>
                      {t('proposeTask.preview.points', {
                        points: pointValue || '?',
                        // An empty or unparseable input draws "?" and takes the
                        // PLURAL — "? points" reads, "? point" does not (#2598).
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

          {/* The leaf's faintest rule, drawn ONCE above the footer (#1707). */}
          <ComposerRule style={{ background: HAIR }} />

          {/* [Cancel] … [Submit] — the global order from #646, with the cast as a
              full-bleed band (#1828), which is what UA's composer casts through. */}
          <ComposerFooter
            band
            start={
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={composerLabelStyle({
                    fontFamily: UA_TEXT,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: BODY,
                  })}
                >
                  {t('proposeTask.submit.cancel')}
                </button>
                {adminReviewHours !== null && (
                  <span style={quietLine}>
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
                    fontFamily: UA_TEXT,
                    /* The composer's band: the rung ABOVE the label it has to
                       outrank (§4a), at 600 because `index.html` loads EB
                       Garamond at 400 and 600 only (#1294). */
                    fontSize: 'var(--text-xl)',
                    fontWeight: 600,
                    frame: ACCENT,
                    color: ON_FILL,
                    background: FILL,
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

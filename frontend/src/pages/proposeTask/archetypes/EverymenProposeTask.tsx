/**
 * Everymen proposing a task (#2538): a work order filed with the union. The FORM
 * is `DefaultProposeTask`'s, field for field; the DRESS is
 * `EverymenCreateCharacter`'s, token for token (owner ruling 2026-08-24).
 *
 * Chips are the sheet's first section at the reserved offset (#2995), so the row
 * does not move under the pointer as each click reskins the page. A picked chip
 * takes BAR with the faction hue as a 3px struck shadow: a fill, never ink (#649).
 * `na` gets the same neutral shadow, not another kit's spectrum (ADR-0039 §2).
 *
 * Inks match the create plate, so `everymenCreateCharacterContrast.test.ts`
 * covers this page: INK/QUIET/ALARM on the washed paper, INK on plates, MAST_INK
 * and BAR_INK on the fills. `--color-danger` → ALARM (#1449); `--color-success`
 * → QUIET (never measured on the washed paper). QUIET is `--everymen-quiet`, not
 * `-muted`, which misses AA on the burst in light. No `var(--x, fallback)`: this
 * surface declares a role map (ADR-0089).
 *
 * Cogs turn by class behind the reduced-motion guard (#1003). One tree (§1a).
 * The trail is the shared `Breadcrumb` (#2973). Gates live in the dispatcher.
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
  sortFactionsByRainbowOrder,
} from '../../../utils/factions'
import { factionRoleVars } from '../../../utils/factionRoles'
import { factionBodyVars } from '../../../utils/factionBodyFace'
import { EverymenCog } from '../../../components/factionMarks/everymenCogs'
import {
  ComposerFooter,
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

/* Palette by role; same names and tokens as `EverymenCreateCharacter`. */
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

/** Bebas Neue via this surface's own role-map prefix; prefixes may not be
 *  shared (#2659, `factionRoleFallbacks.test.ts`). */
const BEBAS = 'var(--ev-order-face)' /* Bebas Neue */
const COURIER = 'var(--faction-everymen-body-font)' /* Courier Prime */

/** The cogs' period, the work order's own 22s. Ornament timing. */
const COG_PERIOD = '22s'

/* Ornament geometry (WORLD_ZERO_STYLE §4a). */
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

  /** The #1695 review window from the era; `null` = undrawn. */
  const adminReviewHours = useGameConfig()?.pending_task_admin_review_hours ?? null

  /** Bebas in tracked caps; the create plate's metrics (#1828/#1830). */
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

  /* The nameplate, identical to the enlistment paper's. */
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

  /* The faction's one ornament (#2195). Not a `ComposerGround`: `.em-burst` is
     already an inert inset layer, and this page never stands on a backdrop. */
  const ground = <div aria-hidden className="em-burst" />

  /** The page's own heading, beside the union's turning cog. */
  const stage = (
    <ComposerHeading sizes={sizes}>
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
    </ComposerHeading>
  )

  const rootStyle = {
    ...factionBodyVars("everymen"), ...factionRoleVars(SLUG, 'ev-order'),
    fontFamily: COURIER,
    color: INK,
  }

  /* The filed receipt, on the same sheet. */
  if (success) {
    return (
      <ComposerPage sizes={sizes} style={rootStyle}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} reserveHead ground={ground}>
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

  /* Unaffiliated leads (ADR-0039), then rainbow order (#352). */
  const factionOptions: string[] = [
    UNAFFILIATED_FACTION_SLUG,
    ...sortFactionsByRainbowOrder(
      (factions.length > 0 ? factions : getAllFactions()).map((f) => ({ slug: f.slug })),
    ).map((f) => f.slug),
  ]

  return (
    <ComposerPage
      sizes={sizes}
      style={rootStyle}
      /* The shared trail (#2973). */
      breadcrumb={<Breadcrumb current={t('proposeTask.pageTitle')} />}
    >
      {/* A real `<form>` so Enter commits from a text field. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        {/* `reserveHead` (#2995): pads the 45/37px nameplate to the shared offset. */}
        <ComposerSheet
          sizes={sizes}
          style={sheetStyle}
          masthead={masthead}
          reserveHead
          ground={ground}
        >
          {stage}

          {/* One wrapping radiogroup, never `ChipRow` (it would bury three
              of eight behind a hidden scrollbar). */}
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
                      /* The hue as a struck offset shadow: a fill, never ink. */
                      boxShadow: picked ? `3px 3px 0 ${factionCssVar(slug)}` : 'none',
                    }}
                  >
                    {/* Picked ground is BAR, so the mark takes `onFill` ink (#2852). */}
                    <FactionSigil
                      slug={slug}
                      size={CHIP_SIGIL}
                      color={picked ? BAR_INK : undefined}
                    />
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
          </ComposerSection>

          {/* Placeholder-only; `aria-label` repeats it. */}
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

              {/* Not `FilterLevelNodes`: its neutral ground and radius are a
                  browser control on the bill. Same `aria-pressed` semantics. */}
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

              {/* Not a native checkbox: `accent-color` takes one colour (ADR-0039). */}
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

          {/* Hidden for metatasks (#1823). */}
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

          {/* The proof: dashed red on the paper, in the create plate's inks. */}
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
              {/* Caption, not a heading: the faction name makes it prose (#1307). */}
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
                      // Empty/unparseable draws "?" with the plural (#2598).
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

          {/* The one rule, above the footer (#1707). */}
          <ComposerRule
            style={{ height: 0, background: 'transparent', borderTop: `2px dashed ${RED}` }}
          />

          {/* [Cancel] … [Submit] (#646), filing as a full-bleed bar. */}
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
                    /* Design band: 15 / 400 / 0.22em. */
                    fontFamily: BEBAS,
                    fontSize: 'var(--text-content)',
                    letterSpacing: '0.22em',
                    /* Not `--everymen-frame`, the plates' rule ink. */
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

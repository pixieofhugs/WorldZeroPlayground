/**
 * UA proposing a task (#2538). Derived from `UaCreateCharacter`'s leaf (owner
 * ruling 2026-08-24): same sheet, ground, `fieldBox`, counters and cast band.
 * Renders only when `ua` is the picked TARGET faction; the seam and gates live in
 * `pages/ProposeTask.tsx`.
 *
 * - Faction chips are the calling picker, wrapped as a row. `na` keeps the text
 *   face: its `card-font` is Bebas Neue (see `DefaultProposeTask`).
 * - The level row is redrawn: `FilterLevelNodes` stands on translucent
 *   `--color-bg-surface` and its ink lands at 4.41:1 in dark on this leaf.
 *   `__tests__/uaProposeTaskContrast.test.ts` holds the numbers.
 * - Quiet tier is `-card-body`, not `-card-muted` (muted 4.38/3.79 under the
 *   lotus wash; see `uaCreateCharacterContrast.test.ts`). Alarm is `-card-alarm`,
 *   not `--color-danger` (3.71:1 in light, #1231). No `var()` fallbacks (ADR-0089).
 * - Presentation only: `useProposeTask` owns state; `metataskProposal.test.tsx`
 *   and `unaffiliatedOption.test.tsx` walk every archetype. Fields use the na
 *   kit's catalogue keys for `aria-label`/`placeholder` and keep the focus ring.
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
import { factionBodyVars } from '../../../utils/factionBodyFace'
import {
  ComposerFooter,
  ComposerGround,
  ComposerHeading,
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

/* Same role inks as `UaCreateCharacter`. */
const SHEET = 'var(--leaf-propose-task-paper)'
const FIELD = 'var(--faction-ua-panel)'
const INK = 'var(--leaf-propose-task-ink)'
/* `-card-body`, not `-card-muted`: see header. */
const BODY = 'var(--faction-ua-card-body)'
const ACCENT = 'var(--leaf-propose-task-accent)'
const RULE = 'var(--faction-ua-rule)'
const HAIR = 'var(--faction-ua-hair)'
const FILL = 'var(--leaf-propose-task-fill)'
const ON_FILL = 'var(--leaf-propose-task-on-fill)'
const ALARM = 'var(--faction-ua-card-alarm)'
/* Bonus ink; stands in for the na kit's global `--color-success`. */
const CREDIT = 'var(--faction-ua-card-credit)'

const RADIUS = 7
const BORDER_WIDTH = 2

/** Via the shared `--ep-spin-dur` hook (#1003). */
const GROUND_SPIN = '200s'

/** Chooser sigil size (#2223). */
const PICKER_SIGIL = 18

const NODE_SIZE = 40

const TICK_SIZE = 18

/** The na kit's caps and rungs. */
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

  /* #1695 review window; `null` until `/game-config` lands, and then UNDRAWN. */
  const adminReviewHours = useGameConfig()?.pending_task_admin_review_hours ?? null

  /* Same option list as the na kit: unaffiliated, then rainbow order (#352). */
  const factionOptions: string[] = [
    UNAFFILIATED_FACTION_SLUG,
    ...sortFactionsByRainbowOrder(
      (factions.length > 0 ? factions : getAllFactions()).map((f) => ({ slug: f.slug })),
    ).map((f) => f.slug),
  ]

  /* Ornament geometry in raw px (WORLD_ZERO_STYLE §4a). */
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

  /* The card's shipped band (#2995, owner ruling 2026-09-01) fills the reserved
     head. MOUNTED `inert`: on a card it is a link (#2167); here a click would
     leave the form and discard the draft. */
  const masthead = <UaBand inert />
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
    ...factionBodyVars("ua"), ...factionRoleVars(SLUG, 'leaf-propose-task'),
    fontFamily: UA_TEXT,
    color: INK,
  }

  const heading = (text: string) => (
    <ComposerHeading sizes={sizes}>
      <h1
        style={{
          fontFamily: UA_DISPLAY,
          fontWeight: 600,
          fontSize: sizes.titleSize,
          color: INK,
          lineHeight: 1.1,
          margin: 0,
        }}
      >
        {text}
      </h1>
    </ComposerHeading>
  )

  if (success) {
    return (
      <ComposerPage sizes={sizes} style={pageStyle}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} reserveHead ground={ground}>
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
      /* Site ink, not leaf ink: the crumb sits on the app page (#2973). */
      breadcrumb={<Breadcrumb current={t('proposeTask.pageTitle')} />}
    >
      {/* Real `<form>` so Enter submits; `handleSubmit` calls `preventDefault()`. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        {/* Band and reserved head arrive together, here and on success (#2995). */}
        <ComposerSheet
          sizes={sizes}
          style={sheetStyle}
          masthead={masthead}
          reserveHead
          ground={ground}
        >
          {heading(t('proposeTask.pageTitle'))}

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
                      // Faction hue as a RING, never as ink (§3).
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
                        // Own card face; `na` keeps the text face (see header).
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
                {/* Redrawn `FilterLevelNodes` in kit inks; see header. */}
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
              {/* Not a native box: `accent-color` takes ONE colour (#1824). */}
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

          {/* Hidden for metatasks: only the standard planner reads it (#1823). */}
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
                        // "?" takes the plural (#2598).
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

          {/* Drawn ONCE above the footer (#1707). */}
          <ComposerRule style={{ background: HAIR }} />

          {/* [Cancel] … [Submit] (#646); cast as a full-bleed band (#1828). */}
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
                    /* 600: EB Garamond loads at 400/600 only (#1294). */
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

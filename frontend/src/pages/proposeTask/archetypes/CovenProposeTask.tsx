/**
 * Cozy Coven proposing a task (#2538): `CovenCreateCharacter`'s dress over this
 * page's fields (owner ruling 2026-08-23). Same chassis, masthead, blooms, cat,
 * `fieldBox` and marks from `factionMarks/covenSlip`; nothing new is drawn.
 *
 * The slug is the TASK's: the dispatcher picks this file while the Coven chip is
 * picked, so it draws the chips it is selected by. Login/eligibility gates live
 * in the dispatcher; `canProposeMetatask` is a field and is honoured here.
 *
 * `Chip`, `FilterLevelNodes` and the na kit's surfaces are re-drawn in slip
 * furniture rather than mounted: app neutrals were never measured on this washed
 * sheet and a shared control may not be repainted. `FactionSigil` is mounted
 * (#2223) and takes `CTA_INK` on a picked row (#2852).
 *
 * Chips wrap (eight options). `na` takes no ring: its `factionCssVar` is neutral
 * grey (ADR-0039), and a grey ring is the #983 failure; its sigil carries it.
 *
 * Every ink pairing is already measured (`covenCreateCharacterContrast.test.ts`
 * for the sheet, `factionContrast.test.ts` for the opaque ward page). No app ink
 * lands on a Coven ground: alarms are `--faction-coven-card-alarm` (#1302), and
 * `--color-success` is replaced by `INK` per `covenSlip`.
 *
 * Motion is by class only (`.cvn-wheel`), behind the reduced-motion guard.
 * Presentation only: state is `useProposeTask`.
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
  ComposerHeading,
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
import { factionBodyVars } from '../../../utils/factionBodyFace'

const SLUG = 'coven'

/* Tokens `covenSlip` does not export, as on the create slip. */
const LAV = 'var(--faction-coven-slip-lav)'
const ALARM = 'var(--faction-coven-card-alarm)'
const HAZE = 'var(--faction-coven-ward-haze)'
const CTA_BAND = `linear-gradient(180deg, ${CTA_FROM}, ${CTA_TO})`

/** The skin's geometry: radius 14, borders 1.5, and the sheet's edge is gold. */
const RADIUS = 14
const FIELD_RADIUS = 10
const RULE = `1.5px solid ${BORDER}`

/* `schemas.task` stays the authority; the hook does not export these.
     ponytail: copied per kit, so a cap change is eight edits; upgrade path is
     exporting them from `useProposeTask` in one pass. */
const TITLE_MAX = 200
const DESCRIPTION_MAX = 5000
const NOTES_MAX = 2000

/** The level rungs the na kit offers, unchanged. */
const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8]

/* Ornament geometry (WORLD_ZERO_STYLE §4a). */
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
/** The points box: a numeral field, so its own width. */
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

  // The #1695 review window from the era, never a typed 48; `null` = undrawn.
  const adminReviewHours =
    useGameConfig()?.pending_task_admin_review_hours ?? null

  /** Caveat, the slip's chrome voice, over the layout's own tracking. */
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

  /** Only drawn at the cap, so it is the alarm (#1609). */
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
    /* No `background`: the haze shows through, so the band reads as one sheet. */
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
        {/* Twinkles IN the row (#1983: a positioned field walks under the
            lettering). No wordmark: the faction is a field here and the picked
            chip already names it (#1828). */}
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

  /* Success stays on the slip rather than site chrome. */
  if (success) {
    return (
      <ComposerPage sizes={sizes} style={{ ...factionBodyVars("coven"), fontFamily: CHROME, color: INK }}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} reserveHead ground={ground}>
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

  /* Unaffiliated leads (ADR-0039), then rainbow order (#352). The order is
     the page's, not the dress's. */
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
      /* The crumb is neutral site chrome, off the sheet (#2973, #2102 rule 2). */
      breadcrumb={<Breadcrumb current={t('proposeTask.pageTitle')} />}
    >
      {/* A real `<form>` so Enter commits from a text field. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        <ComposerSheet
          sizes={sizes}
          style={sheetStyle}
          masthead={masthead}
          reserveHead
          ground={ground}
        >
          <ComposerHeading sizes={sizes}>
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
          </ComposerHeading>

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
                    /* Not `composerLabelStyle`: its uppercase/tracking would
                       reach the faction's own card face. */
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
                      // `na` has no hue, so no ring (see header).
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

          {/* Placeholder-only: the visible label IS the accessible name. */}
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
              {/* Not a native checkbox: `accent-color` takes one colour and
                  na's identity is seven (ADR-0039). */}
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

          {/* Hidden for metatasks: the planner drops notes there (#1823). */}
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

          {/* Live preview: ward paper inside the slip's rule. */}
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
              {/* Caption, not a heading: the faction name makes it prose (#1307). */}
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
                {/* No `--color-success` (see header): worth takes INK. */}
                <span style={{ color: INK }}>
                  {isMetatask
                    ? t('proposeTask.preview.bonusPoints', { points: metaBonusValue || '?' })
                    : t('proposeTask.preview.points', {
                        points: pointValue || '?',
                        // Empty/unparseable draws "?" with the plural (#2598).
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

          {/* The one braid (#1707), above the footer. */}
          <Braid />

          {/* [Cancel] … [Submit] (#646), stacked for the full-bleed cast. */}
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
                  // `.control-off`, not opacity (#2486): CTA_BAND is a gradient.
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

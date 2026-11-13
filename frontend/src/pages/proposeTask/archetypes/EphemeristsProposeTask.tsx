/**
 * Ephemerists proposing a task (#2538): `EphemeristsCreateCharacter`'s dress over
 * this page's fields (owner ruling 2026-08-24). Nothing here mints a token,
 * keyframe, SVG or string.
 *
 * The slug is the TASK's: the dispatcher picks this file while the chip is
 * picked. The chips are the create page's calling picker, not the site `Chip`.
 * Not `FilterLevelNodes` either: it brings `--color-bg-surface` onto the plate;
 * the level row is the shared `Octagon` at node size. Gates live in the dispatcher.
 *
 * Plate tokens only, via `factionMarks/ephemeristsPlate` (#2141); `-brass` is a
 * rule colour, never ink; never the codex `--eph-*` ground (ADR-0055). Alarm is
 * `card-alarm` (danger misses AA). Every ink/ground pair is already measured in
 * `createCharacterContrast.test.ts` / `factionContrast.test.ts`. No global
 * `--color-text-*` (2.01:1 here); `--label-ink` is repointed to `QUIET`.
 *
 * The faction hue is a 3px rule via `factionFill(slug, 'rule')`, never ink, which
 * also keeps `na`'s spectrum (ADR-0039). One responsive tree (§1a).
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
import { factionBodyVars } from '../../../utils/factionBodyFace'

const SLUG = 'ephemerists'

/* The cast's pair and the alarm, as both character plates name them. */
const CTA = 'var(--faction-ephemerists-plate-cta-bg)'
const CTA_INK = 'var(--faction-ephemerists-plate-cta-ink)'
const ALARM = 'var(--faction-ephemerists-card-alarm)'

/** Notation band seed: stable per surface (no record exists yet); a seed off
 *  the typed title would redraw the band on every keystroke. */
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

/* Ornament geometry (WORLD_ZERO_STYLE §4a), the create plate's sizes. */
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
 * The stage mark: the feather in a stepped octagon. The shared `Octagon` path
 * draws clip and border at once; `clipPath` has no stroke.
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

  // The #1695 review window from the era; undrawn while `/game-config` loads.
  const adminReviewHours = useGameConfig()?.pending_task_admin_review_hours ?? null

  // Unaffiliated leads (ADR-0039), then rainbow order (#352).
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
      {/* The sky band: plate-token stops, so it moves with the cascade (#2141). */}
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
      {/* The one motion, `.eph-cornice-glow` (gated in `index.css`). */}
      <Cornice glow />
    </>
  )

  const ground = (
    <ComposerGround inset={0} style={{ overflow: 'hidden' }}>
      <GravityField width={GRAVITY_WIDTH[factor]} height={GRAVITY_HEIGHT} />
      {/* The margin rule, outside the content inset. */}
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

  const pageStyle = { ...factionBodyVars("ephemerists"),
    fontFamily: DECO,
    color: INK,
    ['--label-ink' as string]: QUIET,
  } as CSSProperties

  // The trail, in the site's voice (#2973).
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
      {/* A real `<form>` so Enter commits from a text field. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        {/* This kit is the ceiling for the reserved head (#2995). */}
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

          {/* The target faction: one radiogroup, one tab stop (#1824). */}
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
                    {/* A fill, never ink; also answers for `na` (ADR-0039). */}
                    <span
                      aria-hidden="true"
                      style={{ width: CHIP_RULE, flex: '0 0 auto', ...factionFill(slug, 'rule') }}
                    />
                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      {/* Selected ground is CTA, so the mark takes `onFill` ink (#2852). */}
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

          {/* Placeholder-only; `aria-label` repeats it (#2598). */}
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
                {/* Not `FilterLevelNodes` (see header). Tapping the active
                    node clears it, as that control does. */}
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
              {/* Not a native checkbox: `accent-color` takes one colour (ADR-0039). */}
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
                style={{ ...fieldBox, resize: 'vertical', lineHeight: 1.85 }}
              />
            </ComposerSection>
          )}

          {/* Live preview, an inset panel on the fields' ground. */}
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
                          // Empty/unparseable draws "?" with the plural (#2598).
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

          {/* The one divider, above the footer (#1707). */}
          <ComposerRule style={{ background: BRASS, opacity: 0.5 }} />

          {/* [Cancel] … [Submit] (#646). */}
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
                {/* No notation band here (#2367): a page wears it in its
                    header, which `EphemeristsMasthead` already does. */}
                <button
                  type="submit"
                  disabled={submitting}
                  /* `.eph-cta` supplies ground and ink (#2146); `.control-off`
                     follows it in `index.css` with `!important`. */
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

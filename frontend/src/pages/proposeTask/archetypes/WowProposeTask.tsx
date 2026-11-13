/**
 * WOW's propose-task archetype, "the petition" (#2538). Derived from
 * `WowCreateCharacter` (owner ruling 2026-08-24): same chassis, head (ribbon,
 * bunting, ✦, wavy rule, balloons), gilt-framed parchment fields and gold cast band.
 *
 * The slug is the TARGET faction (`state.factionSlug`), so the chips mount and
 * unmount this file and must stay fully drawn.
 *
 * `FilterLevelNodes` is not mounted: it takes no style prop and would drop site
 * chrome on parchment. The row is redrawn with identical behaviour.
 *
 * Breadcrumb: the site component, mounted on both stages (`ponytail:` path, #2973).
 *
 * Copy: only existing `forms:proposeTask.*` / `common:*` keys; no knightly
 * vocabulary (ADR-0065 §3). Fields are placeholder-only with a matching `aria-label`.
 *
 * Load-bearing colour rules (§3):
 * - {@link GOLD} is 2.24:1 on the cream: it frames, never sets type; type on gold
 *   takes {@link ON_GOLD}. Dark comes from the cascade, no ternaries.
 * - {@link MUTED} passes on the cream (4.76) but not the plate (4.24), so every
 *   string on a plate, preview included, takes {@link INK}.
 * - A faction hue is only ever the chip RING; chip type stays {@link ON_PLUM}.
 *
 * Every pairing is already a row in `utils/__tests__/factionContrast.test.ts`, so
 * no contrast test of its own. State and gates live in `useProposeTask` /
 * `ProposeTask.tsx`.
 */
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import Breadcrumb from '../../../components/nav/Breadcrumb'
import FactionSigil from '../../../components/sigil/FactionSigil'
import { BalloonBunch, Bunting, Zig } from '../../../components/factionMarks/wowOrnament'
import { WowSpark } from '../../../components/factionMarks/wowMobile'
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
import { UNAFFILIATED_FACTION_SLUG, type ProposeTaskState } from '../useProposeTask'
import {
  ComposerFooter,
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

const SLUG = 'wow'

/** The na kit's caps (#1609). */
const TITLE_MAX = 200
const DESCRIPTION_MAX = 5000
/** Mirrors `schemas.task.MAX_TASK_NOTES`, which stays the authority. */
const NOTES_MAX = 2000
/** Counters warn where the na kit's do. */
const TITLE_WARN = 180
const DESCRIPTION_WARN = 4500

const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8]

/** MedievalSharp display face; roles via `factionRoleVars` on the page (#2674). */
const MED = 'var(--wow-propose-face)'
const LORA = 'var(--faction-wow-body-font)'

const SHEET = 'var(--wow-propose-paper)'
/** Parchment plate under fields and preview. */
const FIELD = 'var(--faction-wow-chronicle-panel)'
const INK = 'var(--wow-propose-ink)'
/** CREAM ONLY (4.76:1 there, 4.24:1 on the plate). */
const MUTED = 'var(--wow-propose-quiet)'
/** The one label ink measured on both grounds. */
const LABEL = 'var(--faction-wow-accent-deep)'
const PLUM_FILL = 'var(--faction-wow-plum-surface)'
const ON_PLUM = 'var(--faction-wow-on-plum)'
/** Theme-invariant; never an ink. */
const GOLD = 'var(--faction-wow-chronicle-gold)'
const RULE = 'var(--faction-wow-rule)'
const ON_GOLD = 'var(--faction-wow-on-gold)'
const RIBBON = 'var(--faction-wow-quest-ribbon)'
const SHEET_SHADOW = 'var(--faction-wow-detail-shadow)'
/** `--color-danger` is 4.08:1 on this cream in light (#1449). */
const ALARM = 'var(--faction-wow-card-alarm)'

/* Ornament geometry (WORLD_ZERO_STYLE §4a). */
const BUNCH = { desktop: 38, mobile: 30 }
/** Chooser sigil size (#2223). */
const PICKER_SIGIL = 18
const RADIUS = 6
const TICK = 18
const NODE = 40
const POINTS_WIDTH = 96

const fieldBox = {
  width: '100%',
  background: FIELD,
  color: INK,
  border: `1.5px solid ${GOLD}`,
  borderRadius: RADIUS,
  padding: 'var(--space-md)',
  boxSizing: 'border-box',
  fontFamily: LORA,
  fontSize: 'var(--text-content)',
} as const

const sectionLabel: CSSProperties = { fontFamily: LORA, color: LABEL }

const hintStyle: CSSProperties = {
  fontFamily: LORA,
  fontStyle: 'italic',
  fontSize: 'var(--text-content)',
  color: MUTED,
  margin: 0,
  lineHeight: 1.55,
}

/** Shared by faction chips and level nodes, as on the na page (#1830). */
function chipStyle(selected: boolean, ring?: string): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-sm)',
    cursor: 'pointer',
    borderRadius: RADIUS,
    padding: 'var(--space-sm) var(--space-md)',
    background: selected ? PLUM_FILL : FIELD,
    border: `1.5px solid ${selected ? GOLD : RULE}`,
    // Hue as a RING, never ink (§3). `na`/Albescent have no single hue: no ring.
    boxShadow: selected && ring ? `0 0 0 2px ${ring}` : 'none',
  }
}

export default function WowProposeTask({ state }: { state: ProposeTaskState }) {
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

  // #1695 review window; `null` until `/game-config` lands, and then UNDRAWN.
  const adminReviewHours = useGameConfig()?.pending_task_admin_review_hours ?? null

  // Unaffiliated first (ADR-0039), then rainbow order.
  const factionOptions: string[] = [
    UNAFFILIATED_FACTION_SLUG,
    ...sortFactionsByRainbowOrder(
      (factions.length > 0 ? factions : getAllFactions()).map((f) => ({ slug: f.slug })),
    ).map((f) => f.slug),
  ]

  /* Task card's head order: ribbon, then bunting (#2032). */
  const masthead = (
    <>
      <ComposerMasthead background={RIBBON} height={7} />
      <Bunting />
    </>
  )

  const sheetStyle = {
    background: SHEET,
    border: `1.5px solid ${GOLD}`,
    borderRadius: RADIUS,
    boxShadow: SHEET_SHADOW,
  }

  const pageStyle = {
    ...factionBodyVars("wow"), ...factionRoleVars(SLUG, 'wow-propose'),
    fontFamily: LORA,
    color: INK,
  }

  /* Neutral site chrome (#2973, the old `ponytail:` upgrade); success needs it too. */
  const breadcrumb = <Breadcrumb current={t('proposeTask.pageTitle')} />

  const head = (heading: string) => (
    /* The heading floor sits on the box AROUND this row: the row wraps on a phone,
       and `min-height` on a multi-line flex row spreads its lines instead. */
    <ComposerHeading sizes={sizes}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontFamily: MED, fontSize: 'var(--text-heading)', lineHeight: 1 }}>
          <WowSpark />
        </span>
        <h1
          style={{
            fontFamily: MED,
            fontSize: sizes.titleSize,
            lineHeight: 1.1,
            color: INK,
            margin: 0,
          }}
        >
          {heading}
        </h1>
        <Zig id="petition" style={{ flex: 1, minWidth: 0 }} />
        <BalloonBunch size={BUNCH[factor]} />
      </div>
    </ComposerHeading>
  )

  const counter = (used: number, warn: number, max: number) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: LORA, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: used >= warn ? ALARM : MUTED }}>
        {used}/{max}
      </span>
    </div>
  )

  const overLimit = (message: string) => (
    <p style={{ fontFamily: LORA, fontSize: 'var(--text-content)', color: ALARM, margin: 0 }}>
      {message}
    </p>
  )

  if (success) {
    return (
      <ComposerPage sizes={sizes} style={pageStyle} breadcrumb={breadcrumb}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} reserveHead>
          {head(
            isMetatask
              ? t('proposeTask.successMeta.heading')
              : t('proposeTask.successTask.heading'),
          )}
          {adminReviewHours !== null && (
            <p style={{ fontFamily: LORA, fontSize: 'var(--text-content)', color: MUTED, margin: 0, lineHeight: 1.7 }}>
              {isMetatask
                ? t('proposeTask.successMeta.body', {
                    faction: factionName(factionSlug),
                    hours: adminReviewHours,
                  })
                : t('proposeTask.successTask.body', { hours: adminReviewHours })}
            </p>
          )}
          <Zig id="petition-sealed" />
        </ComposerSheet>
      </ComposerPage>
    )
  }

  return (
    <ComposerPage sizes={sizes} style={pageStyle} breadcrumb={breadcrumb}>
      {/* Real `<form>` for Enter and `required`; `handleSubmit` prevents default. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        {/* `reserveHead` (#2995); table in `useComposerSizes`. */}
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} reserveHead>
          {head(t('proposeTask.pageTitle'))}

          {/* Wrapping, never `ChipRow`: its hidden-scrollbar scroll buries options. */}
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
                    style={chipStyle(selected, isKnownFaction(slug) ? factionCssVar(slug) : undefined)}
                  >
                    {/* Pass the slug, never null, so Albescent keeps its mark (#2852). */}
                    <FactionSigil slug={slug} size={PICKER_SIGIL} color={selected ? ON_PLUM : undefined} />
                    <span
                      style={{
                        fontFamily: factionCssVar(slug, 'card-font'),
                        fontSize: 'var(--text-content)',
                        color: selected ? ON_PLUM : INK,
                      }}
                    >
                      {factionName(slug)}
                    </span>
                  </button>
                )
              })}
            </div>
          </ComposerSection>

          {/* `aria-label` repeats the placeholder, which vanishes on typing (§7). */}
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
              style={{ ...fieldBox, fontFamily: MED }}
            />
            {counter(title.length, TITLE_WARN, TITLE_MAX)}
            {title.length >= TITLE_MAX && overLimit(t('proposeTask.fields.name.tooLong'))}
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
            {counter(description.length, DESCRIPTION_WARN, DESCRIPTION_MAX)}
            {description.length >= DESCRIPTION_MAX &&
              overLimit(t('proposeTask.fields.description.tooLong'))}
          </ComposerSection>

          {isMetatask ? (
            <ComposerSection
              rule={false}
              label={t('proposeTask.fields.bonusPoints.label')}
              labelStyle={sectionLabel}
            >
              <input
                type="text"
                inputMode="numeric"
                value={metaBonusValue}
                onChange={(e) => setMetaBonusValue(e.target.value.replace(/[^0-9]/g, ''))}
                disabled={submitting}
                aria-label={t('proposeTask.fields.bonusPoints.label')}
                placeholder={t('proposeTask.fields.bonusPoints.placeholder')}
                style={{ ...fieldBox, width: POINTS_WIDTH, fontFamily: MED, textAlign: 'center' }}
              />
              <p style={hintStyle}>{t('proposeTask.fields.bonusPoints.hint')}</p>
            </ComposerSection>
          ) : (
            <ComposerSection
              rule={false}
              label={t('proposeTask.fields.basePoints.label')}
              labelStyle={sectionLabel}
            >
              <input
                type="text"
                inputMode="numeric"
                value={pointValue}
                onChange={(e) => setPointValue(e.target.value.replace(/[^0-9]/g, ''))}
                disabled={submitting}
                aria-label={t('proposeTask.fields.basePoints.label')}
                placeholder={t('proposeTask.fields.basePoints.placeholder')}
                style={{ ...fieldBox, width: POINTS_WIDTH, fontFamily: MED, textAlign: 'center' }}
              />
            </ComposerSection>
          )}

          {/* Redrawn level row; see header. */}
          <ComposerSection
            rule={false}
            label={t('proposeTask.fields.minimumLevel.label')}
            labelStyle={sectionLabel}
          >
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
                      ...chipStyle(active),
                      width: NODE,
                      height: NODE,
                      borderRadius: '50%',
                      boxSizing: 'border-box',
                      padding: 0,
                      fontFamily: MED,
                      fontSize: 'var(--text-content)',
                      color: active ? ON_PLUM : INK,
                    }}
                  >
                    {t('common:filters.levelAtLeast', { level })}
                  </button>
                )
              })}
            </div>
          </ComposerSection>

          {canProposeMetatask && (
            <ComposerSection rule={<div aria-hidden style={{ height: 1, background: RULE }} />}>
              {/* Not a native box: `accent-color` takes ONE colour (ADR-0039). */}
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: TICK,
                    height: TICK,
                    flex: 'none',
                    boxSizing: 'border-box',
                    borderRadius: 4,
                    background: isMetatask ? PLUM_FILL : FIELD,
                    border: `1.5px solid ${isMetatask ? GOLD : RULE}`,
                    fontSize: 'var(--text-lg)',
                    lineHeight: 1,
                  }}
                >
                  {isMetatask && <WowSpark color={ON_PLUM} />}
                </span>
                <span style={composerLabelStyle({ fontFamily: LORA, color: LABEL })}>
                  {t('proposeTask.metaToggle.label')}
                </span>
              </button>
            </ComposerSection>
          )}

          {/* Standard branch only (#1823). */}
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

          {/* On a plate: INK, not MUTED. */}
          {title && (
            <ComposerSection rule={false}>
              <div
                style={{
                  background: FIELD,
                  border: `1.5px solid ${GOLD}`,
                  borderRadius: RADIUS,
                  padding: 'var(--space-md) var(--space-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-xs)',
                }}
              >
                {/* A caption, not a heading (#1307). */}
                <span style={composerLabelStyle({ fontFamily: LORA, color: LABEL })}>
                  {isMetatask
                    ? t('proposeTask.preview.metaHeading', { faction: factionName(factionSlug) })
                    : t('proposeTask.preview.taskHeading', { faction: factionName(factionSlug) })}
                </span>
                <p style={{ fontFamily: MED, fontSize: 'var(--text-content)', color: INK, margin: 0 }}>
                  {title}
                </p>
                {description && (
                  <p
                    style={{
                      fontFamily: LORA,
                      fontSize: 'var(--text-content)',
                      color: INK,
                      margin: 0,
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
                    gap: 'var(--space-md)',
                    fontFamily: LORA,
                    fontSize: 'var(--text-lg)',
                    color: INK,
                  }}
                >
                  <span>
                    {isMetatask
                      ? t('proposeTask.preview.bonusPoints', { points: metaBonusValue || '?' })
                      : t('proposeTask.preview.points', {
                          points: pointValue || '?',
                          // "?" takes the plural (#2598).
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

          {/* Drawn ONCE above the footer (#1707). */}
          <Zig id="petition-footer" />

          {/* [Cancel] … [Submit] (#646); full-bleed cast band (#1828). */}
          <ComposerFooter
            band
            start={
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={composerLabelStyle({
                    fontFamily: LORA,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: LABEL,
                    textDecoration: 'underline',
                  })}
                >
                  {t('proposeTask.submit.cancel')}
                </button>
                {adminReviewHours !== null && (
                  <span style={hintStyle}>
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
                    /* The one control in the display face. */
                    fontFamily: MED,
                    fontSize: 'var(--text-content)',
                    letterSpacing: '0.14em',
                    frame: GOLD,
                    color: ON_GOLD,
                    background: GOLD,
                  }),
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
                {submitting
                  ? t('proposeTask.submit.busy')
                  : isMetatask
                    ? t('proposeTask.submit.meta')
                    : t('proposeTask.submit.task')}
                <WowSpark color={ON_GOLD} />
              </button>
            }
          />
        </ComposerSheet>
      </form>
    </ComposerPage>
  )
}

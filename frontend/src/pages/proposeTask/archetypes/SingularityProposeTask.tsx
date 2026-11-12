/**
 * Singularity proposing a task (#2538): `SingularityCreateCharacter`'s dress
 * over this page's fields (owner ruling 2026-08-24); no new token, rule, SVG or
 * copy key. The slug is the TASK's, so the chip row stays drawn in this skin.
 * Gates live in the dispatcher. One tree (§1a).
 *
 * `Chip` and `FilterLevelNodes` are drawn, not mounted: both hard-code
 * `--color-bg-surface` (near-white in light) on a chassis that is `#07130c` in
 * both cascades, and take no style prop. Keys use the create plate's furniture;
 * behaviour is copied, incl. toggle-to-clear. `FactionSigil` is mounted (#2223).
 *
 * `-term-dim` is a PANEL ink only: on the chassis the raster and band sit between
 * it and the paint and it falls under AA. `singularityCreateCharacterGround.test.ts`
 * measures every pairing used here. Counter tiers are dim → bright → alarm; the
 * bonus takes `-term-bright` instead of `--color-success`.
 *
 * Motion is `.sg-scan` / `.sg-cursor`, behind the reduced-motion guard (#1003).
 * Unlike the create plate: the shared breadcrumb stays (#2102), no `PageTitle`
 * (ADR-0066), no process light (no session exists).
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
import { factionBodyVars } from '../../../utils/factionBodyFace'
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
  UNAFFILIATED_FACTION_SLUG,
  type ProposeTaskState,
} from '../useProposeTask'

const SLUG = 'singularity'

/* The terminal's two-theme contract (#1023/#1034), by role. */
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

/* Share Tech Mono for everything, via the role map. No fallback arm (ADR-0089). */
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

/* Ornament glyphs (WORLD_ZERO_STYLE §4) as constants, in aria-hidden chrome. */
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

/* Borderless inside the readout box. No `outline: none`: the browser ring is
   the only focus indicator here. */
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

  // The #1695 review window from the era; undrawn while `/game-config` loads.
  const adminReviewHours = useGameConfig()?.pending_task_admin_review_hours ?? null

  // Unaffiliated leads (ADR-0039), then rainbow order (#352).
  const factionOptions: string[] = [
    UNAFFILIATED_FACTION_SLUG,
    ...sortFactionsByRainbowOrder(
      (factions.length > 0 ? factions : getAllFactions()).map((f) => ({ slug: f.slug })),
    ).map((f) => f.slug),
  ]

  /**
   * The readout's foot, inside the panel: the only place `-term-dim` may be
   * drawn. Tiers: dim, bright past the warn mark, alarm at the cap.
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
    /* The window bar; `style` sets its height. aria-hidden chrome. */
    <ComposerMasthead
      background={CHROME}
      style={{
        height: 'auto',
        padding: 'var(--space-sm) var(--space-lg)',
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <div aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        {/* The lamp cluster (#1979). */}
        <SingularityLamps />
        <span
          style={composerLabelStyle({
            fontFamily: FACE,
            // A no-op ground restatement that makes the dim-ink rule checkable.
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
    /* The standing raster; the band overhangs horizontally inside it. */
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
    // The prefix is this surface's own (#2659).
    ...factionBodyVars("singularity"), ...factionRoleVars(SLUG, 'sg-propose'),
    fontFamily: FACE,
    color: INK,
  }

  const heading = (text: string) => (
    <ComposerHeading sizes={sizes}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-md)' }}>
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
    </ComposerHeading>
  )

  if (success) {
    return (
      <ComposerPage sizes={sizes} style={pageStyle}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} reserveHead ground={ground}>
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
      /* Site chrome on the site's ground: neutral by rule (#2102, #2973). */
      breadcrumb={<Breadcrumb current={t('proposeTask.pageTitle')} />}
    >
      {/* A real `<form>` so Enter commits from a text field. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        {/* `reserveHead` (#2995): where the column starts, not the bar's height. */}
        <ComposerSheet
          sizes={sizes}
          style={sheetStyle}
          masthead={masthead}
          reserveHead
          ground={ground}
        >
          {heading(t('proposeTask.pageTitle'))}

          {/* The target faction, in the terminal's key furniture. */}
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
                    {/* Selected ground is CTA_BG, so the mark takes onFill ink (#2852). */}
                    <FactionSigil
                      slug={slug}
                      size={PICKER_SIGIL}
                      color={selected ? CTA_INK : undefined}
                    />
                    <span
                      style={{
                        // The OFFERED faction's own face, by role (#2675).
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

          {/* The label key is both placeholder and accessible name (#2793). */}
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

          {/* Placeholder and accessible name differ, as in the na kit. */}
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
                {/* Pressing the lit key clears the floor, as the na row does. */}
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

          {/* Not a native checkbox: `accent-color` takes one colour (ADR-0039). */}
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

          {/* Standard branch only (#1823). */}
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

          {/* The preview is a panel, so the caption may take the quiet tier. */}
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
                    // Phosphor, not the neutral success ink (see header).
                    <span style={{ color: BRIGHT }}>
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
            </ComposerSection>
          )}

          <ErrorBanner message={error ?? ''} style={{ color: ALARM }} />

          {/* The one divider, above the footer (#1707). */}
          <ComposerRule style={{ height: 0, background: 'none', borderTop: `1px dashed ${HAIR}` }} />

          {/* [Cancel] … [Submit] (#646), cast as a full-bleed band (#1828). */}
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
                /* `.sg-control-off` (#2486): the house neutral would lay a pale
                   slab on the black terminal, so it re-points to panel + dim ink. */
                className="control-off sg-control-off"
                style={{
                  ...composerBandStyle(sizes, {
                    fontFamily: FACE,
                    fontSize: 'var(--text-xl)',
                    letterSpacing: '0.1em',
                    frame: BORDER,
                    color: CTA_INK,
                    background: CTA_BG,
                    // `none` in light, real in dark, from the token.
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
                {/* `.sg-cursor`: reduced-motion-guarded blink; stays drawn. */}
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

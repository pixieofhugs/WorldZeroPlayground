/**
 * S.N.I.D.E. proposing a task (#2538): `SnideCreateCharacter`'s dress over this
 * page's fields (owner ruling 2026-08-24); no new sheet, mark, token or copy key.
 * The slug is the TASK's, picked live; the viewer's faction is never read. Gates
 * live in the dispatcher; `canProposeMetatask` decides whether the tick exists.
 *
 * New arities of the create page's controls: the chips are its calling picker at
 * eight rows, wrapped, in one radiogroup (hue as a ring, never ink, §3); level
 * nodes are the same chip squared, not `FilterLevelNodes` (neutral chrome on the
 * wall, #1824); the tick is a `role="checkbox"` button; the preview is a clipping
 * on FIELD stock.
 *
 * `-composer-*` inks flip with the wall; `-acid` / `-ink` are the press and do
 * not (paper-white on acid is 1.07:1). No `--color-text-*`. Every pairing is
 * already gated in `factionContrast.test.ts` (wall pairs, the composer field
 * rows, the press pair); the bonus line is `-composer-acid-ink`, the acid rung
 * measured on FIELD. `--faction-snide-acid` never touches paper (#2133).
 */
import { type CSSProperties } from 'react'
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
import {
  UNAFFILIATED_FACTION_SLUG,
  type ProposeTaskState,
} from '../useProposeTask'
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
import { WALL } from '../../../components/factionMarks/snideAtoms'
import { factionBodyVars } from '../../../utils/factionBodyFace'

const SLUG = 'snide'

/* The na kit's caps and rungs; the server stays the authority. */
const TITLE_MAX = 200
const DESCRIPTION_MAX = 5000
const NOTES_MAX = 2000
const TITLE_WARN = 180
const DESCRIPTION_WARN = 4500
const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8]

/* Sheet inks that flip with the wall; same as `SnideCreateCharacter`. */
const INK = 'var(--faction-snide-composer-ink)'
const MUTED = 'var(--faction-snide-composer-muted)'
const FAINT = 'var(--faction-snide-composer-faint)'
const FIELD = 'var(--faction-snide-composer-field)'
const RULE = 'var(--faction-snide-composer-rule)'
const BAR = 'var(--faction-snide-composer-bar)'
/* Not `--faction-snide-card-alarm`: that rung is pinned bright for the
   always-black card and reads 1.56:1 on the light stock. */
const ALARM = 'var(--faction-snide-composer-alarm)'
/* Acid that is TEXT rather than a line — the only acid rung measured on FIELD. */
const ACID_INK = 'var(--faction-snide-composer-acid-ink)'

/* The press, theme-invariant: `PRESS_INK` prints on `ACID` in both cascades. */
const ACID = 'var(--faction-snide-acid)'
const PRESS_INK = 'var(--faction-snide-ink)'

const TITLE_FACE = 'var(--faction-snide-font-black)' /* Archivo Black */
const BODY_FACE = 'var(--faction-snide-font-type)' /* Special Elite */

/* Ornament geometry (WORLD_ZERO_STYLE §4a). */
/** The dashed acid rule in the masthead — the flicker of a tube light. */
const MASTHEAD_RULE_HEIGHT = 6
/** The censor stripe: a redaction bar, not a hairline. */
const CENSOR_HEIGHT = 10
/** The mark each faction wears in the picker — the size every chooser draws (#2223). */
const PICKER_SIGIL = 18
/** The tick box. A drawn square, so it is sized rather than spaced. */
const TICK_BOX = 18
/** A level node: the chip row's height, squared off. */
const NODE = 40
/** The points field — wide enough for four figures, no wider. */
const POINTS_WIDTH = 96

/** The label tier with S.N.I.D.E.'s face on it — geometry shared, face local. */
function punkLabel(overrides: CSSProperties = {}): CSSProperties {
  return composerLabelStyle({ fontFamily: BODY_FACE, ...overrides })
}

export default function SnideProposeTask({ state }: { state: ProposeTaskState }) {
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

  /* The #1695 review window from the era; undrawn until `/game-config` lands. */
  const adminReviewHours = useGameConfig()?.pending_task_admin_review_hours ?? null

  /* Unaffiliated leads (ADR-0039), then rainbow order (#352). */
  const factionOptions: string[] = [
    UNAFFILIATED_FACTION_SLUG,
    ...sortFactionsByRainbowOrder(
      (factions.length > 0 ? factions : getAllFactions()).map((f) => ({ slug: f.slug })),
    ).map((f) => f.slug),
  ]

  /** Section heads sit on the wall, where the prose tier is measured. */
  const sectionLabel = { fontFamily: BODY_FACE, color: MUTED }

  /* Fields: square, hairlined, one shade off the stock so they read inset. */
  const fieldBox = {
    width: '100%',
    background: FIELD,
    color: INK,
    border: `1px solid ${RULE}`,
    borderRadius: 0,
    padding: 'var(--space-md)',
    boxSizing: 'border-box',
    fontFamily: BODY_FACE,
    fontSize: 'var(--text-content)',
  } as const

  /** The counter row under a field: faint, and alarmed on the cap. */
  const counter = (used: number, max: number, warn: number) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        fontFamily: BODY_FACE,
        fontSize: 'var(--text-lg)',
      }}
    >
      <span style={{ color: used >= warn ? ALARM : FAINT }}>
        {used}/{max}
      </span>
    </div>
  )

  /* No edge but the stock, which is the wall (#2177). */
  const sheetStyle = { background: WALL, borderRadius: 0 }

  const masthead = (
    <ComposerMasthead
      background={BAR}
      style={{ height: 'auto', padding: 'var(--space-sm) var(--space-lg)' }}
    >
      {/* Ornament, and hidden as such: the page announces itself with its own
          heading one row down, and the wordmark is a printed thing. */}
      <span aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
        <span
          style={{
            fontFamily: TITLE_FACE,
            // eslint-disable-next-line local/no-raw-style-values -- ornament: the wordmark is a poster face at its drawn optical size, not a tier of the text scale (§4a).
            fontSize: 20,
            lineHeight: 1,
            letterSpacing: '0.06em',
            color: ACID,
            whiteSpace: 'nowrap',
          }}
        >
          {factionName(SLUG)}
        </span>
        {/* The one motion, `ep-pulse`, gated in the stylesheet (#1003). */}
        <span
          className="ep-pulse"
          style={{
            flex: 1,
            height: MASTHEAD_RULE_HEIGHT,
            background: `repeating-linear-gradient(90deg, ${ACID} 0 6px, transparent 6px 10px)`,
            ...({ '--ep-pulse-dur': '3.6s' } as CSSProperties),
          }}
        />
      </span>
    </ComposerMasthead>
  )

  if (success) {
    return (
      <ComposerPage sizes={sizes} style={{ ...factionBodyVars("snide"), fontFamily: BODY_FACE, color: INK }}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} reserveHead>
          <h1
            style={{
              fontFamily: TITLE_FACE,
              fontSize: sizes.titleSize,
              letterSpacing: '0.02em',
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
            <p
              style={{
                fontFamily: BODY_FACE,
                fontSize: 'var(--text-content)',
                lineHeight: 1.6,
                color: MUTED,
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
          <ComposerRule style={{ height: CENSOR_HEIGHT, background: BAR }} />
        </ComposerSheet>
      </ComposerPage>
    )
  }

  return (
    <ComposerPage
      sizes={sizes}
      style={{ fontFamily: BODY_FACE, color: INK }}
      /* The site trail, above the sheet (#2102 rule 2, #2973). */
      breadcrumb={<Breadcrumb current={t('proposeTask.pageTitle')} />}
    >
      {/* A real `<form>` so Enter commits from a text field. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        {/* Reserved heights (#2995); see `useComposerSizes`. */}
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} reserveHead>
          <ComposerHeading sizes={sizes}>
            <h1
              style={{
                fontFamily: TITLE_FACE,
                fontSize: sizes.titleSize,
                letterSpacing: '0.02em',
                lineHeight: 1.1,
                color: INK,
                margin: 0,
              }}
            >
              {t('proposeTask.pageTitle')}
            </h1>
          </ComposerHeading>

          {/* Target faction. Not `ChipRow`: it would bury three of eight
              behind a hidden scrollbar. */}
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
                    /* Not `punkLabel`: its uppercase/tracking would reach the
                       faction's own card face. */
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderRadius: 0,
                      padding: 'var(--space-sm) var(--space-md)',
                      background: selected ? ACID : FIELD,
                      border: `1px solid ${selected ? ACID : RULE}`,
                      // The offered hue as a ring, never ink (§3). `na` has
                      // none; the acid ground alone marks it.
                      boxShadow:
                        selected && isKnownFaction(slug)
                          ? `0 0 0 2px ${factionCssVar(slug)}`
                          : 'none',
                    }}
                  >
                    {/* Selected ground is ACID, so the mark takes `onFill` ink (#2852). */}
                    <FactionSigil
                      slug={slug}
                      size={PICKER_SIGIL}
                      color={selected ? PRESS_INK : undefined}
                    />
                    <span
                      style={{
                        fontFamily: factionCssVar(slug, 'card-font'),
                        fontSize: 'var(--text-content)',
                        color: selected ? PRESS_INK : INK,
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
              data-composer-field
              type="text"
              required
              maxLength={TITLE_MAX}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              aria-label={t('proposeTask.fields.name.label')}
              placeholder={t('proposeTask.fields.name.label')}
              style={{ ...fieldBox, fontFamily: TITLE_FACE, letterSpacing: '0.02em' }}
            />
            {counter(title.length, TITLE_MAX, TITLE_WARN)}
            {title.length >= TITLE_MAX && (
              <span style={{ fontFamily: BODY_FACE, fontSize: 'var(--text-content)', color: ALARM }}>
                {t('proposeTask.fields.name.tooLong')}
              </span>
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
            {counter(description.length, DESCRIPTION_MAX, DESCRIPTION_WARN)}
            {description.length >= DESCRIPTION_MAX && (
              <span style={{ fontFamily: BODY_FACE, fontSize: 'var(--text-content)', color: ALARM }}>
                {t('proposeTask.fields.description.tooLong')}
              </span>
            )}
          </ComposerSection>

          {/* Points and level nodes are one sentence (#1824). */}
          <ComposerSection rule={false}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--space-xl)',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <span style={punkLabel({ color: MUTED, display: 'block', marginBottom: 'var(--space-sm)' })}>
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
                    width: POINTS_WIDTH,
                    fontFamily: TITLE_FACE,
                    textAlign: 'center',
                  }}
                />
                {isMetatask && (
                  <span
                    style={{
                      display: 'block',
                      fontFamily: BODY_FACE,
                      fontSize: 'var(--text-lg)',
                      color: FAINT,
                      marginTop: 'var(--space-xs)',
                    }}
                  >
                    {t('proposeTask.fields.bonusPoints.hint')}
                  </span>
                )}
              </div>

              <div>
                <span style={punkLabel({ color: MUTED, display: 'block', marginBottom: 'var(--space-sm)' })}>
                  {t('proposeTask.fields.minimumLevel.label')}
                </span>
                {/* Tapping the active node clears it (`FilterLevelNodes`' contract). */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                  {LEVEL_OPTIONS.map((level) => {
                    const active = levelRequired === level
                    return (
                      <button
                        key={level}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setLevelRequired(active ? '' : level)}
                        style={{
                          width: NODE,
                          height: NODE,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box',
                          borderRadius: 0,
                          padding: 0,
                          cursor: 'pointer',
                          background: active ? ACID : FIELD,
                          border: `1px solid ${active ? ACID : RULE}`,
                          color: active ? PRESS_INK : INK,
                          fontFamily: TITLE_FACE,
                          fontSize: 'var(--text-content)',
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
            <ComposerSection rule={<ComposerRule style={{ height: 1, background: RULE }} />}>
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
                  aria-hidden
                  style={{
                    width: TICK_BOX,
                    height: TICK_BOX,
                    flex: 'none',
                    boxSizing: 'border-box',
                    borderRadius: 0,
                    background: isMetatask ? ACID : FIELD,
                    border: `1px solid ${isMetatask ? ACID : RULE}`,
                  }}
                />
                <span style={punkLabel({ color: isMetatask ? INK : MUTED })}>
                  {t('proposeTask.metaToggle.label')}
                </span>
              </button>
            </ComposerSection>
          )}

          {/* Hidden for metatasks (#1823). */}
          {!isMetatask && (
            <ComposerSection rule={false}>
              {/* Mirrors schemas.task.MAX_TASK_NOTES (the authority). */}
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

          {/* The clipping. Caption, not heading: the faction name makes it prose (#1307). */}
          {title && (
            <ComposerSection rule={false}>
              <div
                style={{
                  background: FIELD,
                  border: `1px solid ${RULE}`,
                  borderRadius: 0,
                  padding: 'var(--space-md) var(--space-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-xs)',
                }}
              >
                <span style={punkLabel({ color: MUTED })}>
                  {isMetatask
                    ? t('proposeTask.preview.metaHeading', { faction: factionName(factionSlug) })
                    : t('proposeTask.preview.taskHeading', { faction: factionName(factionSlug) })}
                </span>
                <p
                  style={{
                    fontFamily: TITLE_FACE,
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
                      fontFamily: BODY_FACE,
                      fontSize: 'var(--text-content)',
                      lineHeight: 1.5,
                      color: MUTED,
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
                    fontFamily: BODY_FACE,
                    fontSize: 'var(--text-lg)',
                  }}
                >
                  {isMetatask ? (
                    <span style={{ color: ACID_INK }}>
                      {t('proposeTask.preview.bonusPoints', { points: metaBonusValue || '?' })}
                    </span>
                  ) : (
                    <span style={{ color: FAINT }}>
                      {t('proposeTask.preview.points', {
                        points: pointValue || '?',
                        // Empty/unparseable draws "?" with the plural (#2598).
                        count: Number(pointValue) || 0,
                      })}
                    </span>
                  )}
                  <span style={{ color: FAINT }}>
                    {t('proposeTask.preview.level', {
                      level: levelRequired === '' ? 0 : levelRequired,
                    })}
                  </span>
                  {!isMetatask && (
                    <span style={{ color: FAINT }}>{t('proposeTask.preview.pending')}</span>
                  )}
                </div>
              </div>
            </ComposerSection>
          )}

          <ErrorBanner message={error ?? ''} style={{ fontFamily: BODY_FACE, color: ALARM }} />

          {/* The censor stripe: the one rule, above the footer (#1707). */}
          <ComposerRule style={{ height: CENSOR_HEIGHT, background: BAR }} />

          {/* [Cancel] … [Submit] (#646), stacked for the full-bleed bar. */}
          <ComposerFooter
            band
            start={
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={punkLabel({
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: FAINT,
                    textDecoration: 'underline',
                  })}
                >
                  {t('proposeTask.submit.cancel')}
                </button>
                {adminReviewHours !== null && (
                  <span
                    style={{
                      fontFamily: BODY_FACE,
                      fontSize: 'var(--text-content)',
                      color: MUTED,
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
                    fontFamily: TITLE_FACE,
                    fontSize: 'var(--text-content)',
                    letterSpacing: '0.2em',
                    /* The stock has no border, so the band's top rule takes the
                       sheet's rule ink. */
                    frame: RULE,
                    background: ACID,
                    color: PRESS_INK,
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

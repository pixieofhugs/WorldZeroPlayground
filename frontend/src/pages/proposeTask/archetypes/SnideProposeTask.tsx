/**
 * The S.N.I.D.E. propose-task archetype — A DEMAND PASTED UP FOR SOMEONE ELSE
 * TO ANSWER (part of #2538's seven-faction fan-out).
 *
 * THE SLUG IS THE TARGET FACTION, NOT THE VIEWER'S. This page is dispatched on
 * `state.factionSlug` — the faction the task is being proposed FOR — so this
 * dress appears the moment the S.N.I.D.E. chip is picked and vanishes the moment
 * it is not, live, mid-form (owner ruling 2026-08-24). Nothing below reads the
 * viewer's own faction, and there is no cross-faction path here at all.
 *
 * DERIVED, and that word has a ruling behind it: this page is
 * `SnideCreateCharacter`'s dress, not a second design. Same chassis
 * (`ComposerPage` / `ComposerSheet` / `ComposerSection` / `ComposerFooter`), the
 * same masthead, the same `fieldBox`, the same counter row, the same censor
 * stripe, the same acid cast band. No new sheet, no new mark, no new token, no
 * new copy key. Read that file beside this one: every value here already had a
 * reader there, and every string is an existing `forms:proposeTask.*` key in the
 * na kit's own order — faction → name → description → points → level → metatask
 * → notes → preview → submit.
 *
 * ## What the create page has no drawn treatment for, and this one must
 *
 * Four things: the EIGHT-WAY faction pick, the numeric fields, the metatask tick
 * and the live preview. Three of them are the create page's own controls at a
 * different arity, and the fourth is a clipping:
 *
 *  - **The chips are the calling picker.** `SnideCreateCharacter`'s "answer a
 *    calling" list is already a faction chooser in this hand — `FactionSigil`
 *    plus the offered faction's own card face, FIELD ground unselected, ACID
 *    ground with the press's near-black on top when selected, and the offered
 *    faction's hue as a RING and never as an ink (§3). This is that control with
 *    eight rows instead of two, so it WRAPS rather than stacks; a column of
 *    eight full-width rows would push the first field below the fold. It gains
 *    `role="radio"` / `aria-checked` inside one `role="radiogroup"`, which the na
 *    kit's chips already announce and which is what makes eight buttons one
 *    choice rather than eight toggles.
 *  - **The level nodes are the same chip, square.** #1824's whole point is that
 *    the nodes and the chips are one sentence — "matching the faction chips above
 *    them" is that file's own note — so they are drawn here rather than mounting
 *    `FilterLevelNodes`, whose 40px circles carry the site's neutral chrome and
 *    would read as a browser control dropped on the wall. Same semantics exactly:
 *    "level ≥ N", `aria-pressed`, and re-tapping the active node clears it.
 *  - **The tick is a `role="checkbox"` button, not an `<input>`.** That is the na
 *    kit's own reason (`accent-color` takes one colour and na's identity is
 *    seven) and it is kept, because `unaffiliatedOption.test.tsx` asserts it for
 *    every archetype. Checked, it is an acid square with the press's ink on it.
 *  - **The preview is a clipping**, on the composer's FIELD stock rather than on
 *    the wall — it is the one block that has to read as a separate object, and
 *    every ink it prints is already measured on that stock (below).
 *
 * ## The breadcrumb is the site's, and it was hand-drawn only because it had to be
 *
 * `components/nav/Breadcrumb` is the site's one trail (#2102) and it could not
 * serve here: it took a `taskId` and a `taskTitle`, and on this page the task
 * does not exist yet. The na kit hand-rolled the same two crumbs for the same
 * reason — off `forms:breadcrumb.tasks`, a key that existed only to serve those
 * copies and is deleted with them — and so did five more archetypes, which is
 * how #2102's drift restarted on the axes it had just deleted, three inks and
 * two placements in seven files. #2973 gave the component a `current` label
 * and every one of those copies came out, this one included. It is not in this
 * skin's face any more, because a breadcrumb is not the skin's: it is neutral
 * chrome standing above the sheet on the app's own ground.
 *
 * ## Colour, and the two families this faction keeps apart
 *
 * As on the create page: `-composer-*` is the SHEET's ink and FLIPS with the
 * wall; `-acid` / `-ink` are the PRESS and do not. Type printed on acid reads the
 * press's near-black in both themes — paper-white on acid green is 1.07:1. Every
 * value below is a `--faction-snide-*` token, so the whole page turns over in the
 * `[data-theme="dark"]` cascade with no `dark ?` branch anywhere, and this file
 * writes no `--color-text-*` at all (`local/no-global-ink-on-faction-surface`).
 *
 * NO NEW PAIRING IS INTRODUCED, which is why this PR adds no contrast table.
 * Every ink lands on a ground `utils/__tests__/factionContrast.test.ts` already
 * gates:
 *
 *   - on the WALL's four readings (SNIDE_WALL_PAIRS): `-composer-ink` (heading,
 *     crumb), `-composer-muted` (labels, hints, prose), `-composer-faint`
 *     (counters, the cancel link), `-composer-alarm` bare (a counter at its cap)
 *     and under the danger veil (the error banner).
 *   - on `-composer-field` (the four `snide composer field, …` rows): the same
 *     ink / prose / faint trio, plus `-composer-acid-ink` — the acid that is TEXT
 *     — which is what the preview's bonus line is set in. The bonus is a CREDIT
 *     role and the credit family is measured on the wall and on the slab, not on
 *     this stock; acid-as-text is the loud tier that IS measured here, and it is
 *     on-voice for a bonus on a flyposted demand.
 *   - the press pair, `-ink` on `-acid`: the wordmark, the selected chip, the
 *     selected level node, the tick and the cast band, all as the create page
 *     already spends them.
 *
 * `--faction-snide-acid` NEVER TOUCHES PAPER (the #2133 rule): every acid here is
 * a drawn thing — a dashed rule, a fill, a ring — or carries `-ink` on top.
 *
 * ## Presentation only
 *
 * `useProposeTask` stays the single source of state; nothing here touches the
 * submit path or the payload. The two gates — `isLoggedIn` and `canProposeTask`
 * — are answered in `pages/ProposeTask.tsx`, ABOVE this file, and are
 * deliberately not repeated. `canProposeMetatask` is not a gate but a field: it
 * is what decides whether the tick exists at all.
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

const SLUG = 'snide'

/* The na kit's own caps and rungs, restated here for the same reason it states
   them: the server is the authority and these are what the counters print
   against. */
const TITLE_MAX = 200
const DESCRIPTION_MAX = 5000
const NOTES_MAX = 2000
const TITLE_WARN = 180
const DESCRIPTION_WARN = 4500
const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8]

/* The sheet's inks — the family that FLIPS with the wall. Same constants, same
   tokens, as `SnideCreateCharacter` and `SnideEditPraxis` name. */
const INK = 'var(--faction-snide-composer-ink)'
const MUTED = 'var(--faction-snide-composer-muted)'
const FAINT = 'var(--faction-snide-composer-faint)'
const FIELD = 'var(--faction-snide-composer-field)'
const RULE = 'var(--faction-snide-composer-rule)'
const BAR = 'var(--faction-snide-composer-bar)'
/* The alarm the composer passes rather than `--faction-snide-card-alarm`: the
   CARD is photocopier-black in both themes (§6) so that rung is pinned bright
   and reads 1.56:1 on the light stock, while THIS ground flips. */
const ALARM = 'var(--faction-snide-composer-alarm)'
/* Acid that is TEXT rather than a line — the only acid rung measured on FIELD. */
const ACID_INK = 'var(--faction-snide-composer-acid-ink)'

/* THE PRESS — theme-invariant pigments. `ACID` is acid as a DRAWN THING and
   `PRESS_INK` is the near-black that prints on it in either cascade. */
const ACID = 'var(--faction-snide-acid)'
const PRESS_INK = 'var(--faction-snide-ink)'

const TITLE_FACE = 'var(--faction-snide-font-impact)' /* Anton */
const BODY_FACE = 'var(--faction-snide-font-type)' /* Special Elite */

/* ── Ornament geometry (WORLD_ZERO_STYLE §4a: not layout spacing) ── */
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

  /* The #1695 admin-review window in the era's own hours, never a typed-out 48,
     and UNDRAWN rather than assumed until `/game-config` lands — the na kit's
     doctrine, kept. */
  const adminReviewHours = useGameConfig()?.pending_task_admin_review_hours ?? null

  /* Unaffiliated leads: it is the default, and it is a state rather than a
     faction (ADR-0039). Everything after it comes from the API, falling back to
     the static registry before the fetch lands, in the site's one rainbow order
     (#352). */
  const factionOptions: string[] = [
    UNAFFILIATED_FACTION_SLUG,
    ...sortFactionsByRainbowOrder(
      (factions.length > 0 ? factions : getAllFactions()).map((f) => ({ slug: f.slug })),
    ).map((f) => f.slug),
  ]

  /** Section heads sit on the wall, where the prose tier is measured. */
  const sectionLabel = { fontFamily: BODY_FACE, color: MUTED }

  /* Every field is a block cut from the sheet: square corners, a drawn hairline,
     one shade off the stock so it reads inset rather than painted on. */
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

  /* radius 0, borderW 0 — the sheet has no edge but its own stock, and the stock
     is the wall (#2177). */
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
        {/* The one motion — `ep-pulse`, slowed. Its keyframe and its
            reduced-motion gate both live in the stylesheet; nothing here writes
            an inline `animation:` (#1003). */}
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

  /* The one irreversible-looking act on this page is a REQUEST, so the sheet
     closes the same way the create page's does: censor stripe, exits at the
     start, the acid band across the foot. */
  if (success) {
    return (
      <ComposerPage sizes={sizes} style={{ fontFamily: BODY_FACE, color: INK }}>
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead}>
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
      /* The trail, above the sheet (#2102 rule 2) and in the site's own hand
         since #2973 — see this file's header. The slot draws the column the
         hand-rolled wrapper used to. */
      breadcrumb={<Breadcrumb current={t('proposeTask.pageTitle')} />}
    >
      {/* A REAL `<form>`, not a bare button with an onClick: it is what makes
          Enter commit from a text field. `handleSubmit` calls `preventDefault()`
          itself. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        {/* The two reserved heights (#2995): the acid bar is 36px against a
            96px ceiling, so this sheet pads out to it rather than starting its
            column where its own wordmark happened to end. */}
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} reserveHead>
          <h1
            style={{
              fontFamily: TITLE_FACE,
              fontSize: sizes.titleSize,
              letterSpacing: '0.02em',
              lineHeight: 1.1,
              color: INK,
              margin: 0,
              minHeight: sizes.headingHeight,
            }}
          >
            {t('proposeTask.pageTitle')}
          </h1>

          {/* WHO IT IS FOR. The pick this whole page reskins on, so it leads —
              and it is the create page's calling picker at eight rows, wrapped.
              Not `ChipRow`: its shell scrolls horizontally behind a hidden
              scrollbar, which would bury three of the eight options. */}
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
                    /* NOT `punkLabel` — it forces `uppercase` and its own
                       tracking, and both would be inherited by the name. A
                       faction wears its OWN card face at its own case, which is
                       what every other chooser draws. */
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
                      // The offered faction's own hue as a RING, never as ink
                      // (§3) — the row's type stays on this skin's measured
                      // pair. `na` has no single hue to ring with, so its
                      // selection is carried by the acid ground alone.
                      boxShadow:
                        selected && isKnownFaction(slug)
                          ? `0 0 0 2px ${factionCssVar(slug)}`
                          : 'none',
                    }}
                  >
                    {/* Selected, the ground becomes ACID — this kit's own fill,
                        not the offered slug's — so the mark moves to this kit's
                        `onFill` ink the way the label beside it does (#2852). */}
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

          {/* WHAT IT IS. Placeholder-only, and named with it: the visible label
              IS the accessible name here, so both read the one key. */}
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

          {/* HOW IT IS DONE. */}
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

          {/* WHAT IT IS WORTH, AND WHO MAY TAKE IT. One row: the points figure
              and the level nodes are the same sentence (#1824). */}
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
                {/* The chips above, squared off — "level ≥ N", and tapping the
                    active one clears it, which is `FilterLevelNodes`' contract
                    kept exactly. */}
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

          {/* THE METATASK TICK — a `role="checkbox"` button and not an
              `<input>`, for the na kit's own reason: a native box is tinted with
              `accent-color`, which takes ONE colour, and unaffiliated's identity
              is seven of them (ADR-0039). Gated on the capability, so a
              sub-gate proposer never sees a control they cannot use. */}
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

          {/* A WORD FOR THE DESK — hidden for metatasks, which the na kit hides
              it for too (#1823): only the standard branch sends it. */}
          {!isMetatask && (
            <ComposerSection rule={false}>
              {/* maxLength mirrors schemas.task.MAX_TASK_NOTES, which stays the
                  authority and still rejects an over-long body. */}
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

          {/* THE CLIPPING — what is about to be pasted up, once it has a name.
              A caption rather than a heading: the faction name is interpolated
              in, so a long slug turns the line into a run of prose (#1307). */}
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
                        // An empty or unparseable figure draws "?" and takes the
                        // PLURAL — "? points" reads, "? point" does not (#2598).
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

          {/* The censor stripe, this skin's rule: a solid redaction bar rather
              than a hairline, struck ONCE above the footer (#1707). */}
          <ComposerRule style={{ height: CENSOR_HEIGHT, background: BAR }} />

          {/* [Cancel] … [Submit] — the global order from #646, stacked rather
              than ranged because S.N.I.D.E.'s cast is a full-bleed bar. */}
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
                    /* This stock has no border of its own — radius 0, borderW 0
                       — so the band's top rule takes the sheet's own rule ink. */
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

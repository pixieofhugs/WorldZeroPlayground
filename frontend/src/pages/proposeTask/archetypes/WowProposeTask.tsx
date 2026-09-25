/**
 * Warriors of Whimsy — THE PETITION, WOW's propose-task archetype (#2538, the
 * seven-faction fan-out).
 *
 * NO DESIGN WAS DRAWN FOR THIS AND NONE WAS COMMISSIONED. The owner ruled on
 * 2026-08-24 that each propose dress is DERIVED from that faction's
 * `createCharacter` page — same register, same geometry, same field furniture,
 * same ground, same ornament, same type. So this file is `WowCreateCharacter` on
 * this page's fields: the same chassis (`ComposerPage` / `ComposerSheet` /
 * `ComposerSection` / `ComposerFooter`), the same head (barber ribbon, pennant
 * run, ✦, a wavy gold→plum rule, one bunch of googly balloons), the same
 * parchment-plate-in-a-gilt-frame field, the same full-bleed gold cast band.
 *
 * A quest is ISSUED by decree and proof is RECORDED in the chronicle (ADR-0050);
 * a life is CHARTERED. This is the sheet on which a quest is PETITIONED, before
 * it is any of those, so it wears the charter's hand.
 *
 * ## The slug this page wears is the TARGET, not the viewer
 *
 * `ProposeTask.tsx` dispatches on `state.factionSlug` — the faction the task is
 * being proposed FOR, the live chip pick. So this dress appears the instant the
 * WOW chip is chosen and vanishes the instant it is cleared, and the chips below
 * are therefore the control that mounts and unmounts this very file. They stay
 * fully drawn for exactly the reason the charter's calling picker does: picking
 * a banner must not be a one-way door.
 *
 * ## What is drawn here and what is not
 *
 * Every field, every guard and every branch of the na kit survives: the faction
 * radiogroup, the task name, the description, base points, the metatask bonus,
 * the minimum level, the metatask toggle, the notes-to-admin textarea (standard
 * branch only, #1823), the live preview strip, the error line, submit / cancel,
 * the admin-review note in the era's own hours, and both success screens.
 *
 * `FilterLevelNodes` is NOT mounted, and that is the one structural deviation.
 * It hard-codes the na propose form's own chip geometry — its docblock says so
 * in terms, *"matching the faction chips above them"* — and it accepts no style
 * prop, so on parchment it would render a row of site-chrome circles on a
 * cream sheet: the `.btn-outline` problem `WowCreateCharacter` already refused
 * ("a browser control dropped on parchment"). The row is redrawn here in this
 * kit's own chip treatment, with its behaviour copied exactly — `aria-pressed`,
 * the same `common:filters.levelAtLeast` string, and clicking the active node
 * clears back to `''`.
 *
 * ## Copy — none of its own
 *
 * Every string is an existing `forms:proposeTask.*` / `common:breadcrumb.*` /
 * `common:filters.*` key, unchanged and un-reordered. WOW's knightly vocabulary
 * is NOT reintroduced; ADR-0065 §3 deleted `editPraxis.wow.*` outright and the
 * faction carries identity in dress alone. The fields are placeholder-only, as
 * the na kit's are, and each carries an `aria-label` from the same string —
 * there the placeholder IS the only on-screen identification the field has.
 *
 * ## The breadcrumb stays neutral, deliberately
 *
 * It sits OUTSIDE the sheet, on the site's own ground, and *"a breadcrumb is
 * neutral SITE CHROME, not part of the faction surface"* (`components/nav/
 * Breadcrumb`). This file used to restate that component's shape — an `<ol>`,
 * `›` separators, the current page marked by weight and `aria-current` instead
 * of a second colour — because the component was task-scoped (`taskId` /
 * `taskTitle`) and no task exists yet on this page. #2973 took the `ponytail:`
 * upgrade path that note named and gave it a `current` label, so the restatement
 * is gone and the component is mounted. The one difference the swap makes is
 * that the ink is `--color-text-tertiary` outright rather than `--label-ink`,
 * which is unset to that value on this ground.
 *
 * ## Two WOW rules that are load-bearing, not taste (§3)
 *
 * - **The gilt is theme-invariant and is never an ink.** {@link GOLD} measures
 *   2.24:1 on the cream, so it frames, rules and fills and never sets type.
 *   Where gold has to be READ — the cast band's label — the pairing is
 *   {@link ON_GOLD}. There is no `dark ?` below; the flip is the
 *   `[data-theme="dark"]` cascade's.
 * - **`--faction-wow-card-muted` is legible on the CREAM and not on the PLATE**
 *   (4.76 against 4.24 — a pairing, not a property, §3/#1028). So {@link MUTED}
 *   is spent only on the sheet, and every string that lands on a parchment
 *   plate — the preview strip included — takes {@link INK}, measured there.
 *
 * A faction hue appears in exactly one role on this page: the RING around the
 * chosen chip, which is a drawn mark and never an ink. Its row's own type stays
 * on {@link ON_PLUM}, the ink measured against this kit's plum fill.
 *
 * ## No new measurement, and that is the finding rather than a shortcut
 *
 * Every pairing this file draws is one of the charter's eight, on the same
 * grounds and in the same roles:
 *
 *     what                                                  light   dark
 *     heading, preview title / cream                        14.02   14.72
 *     counters, hints, the review note / cream                4.76    6.85
 *     section labels + cancel / cream                         5.32    8.83
 *     the over-limit line and a spent counter / cream          7.57    9.56
 *     field text, chip text, every preview line / plate      12.49   12.77
 *     the picked chip and the ticked box / plum                5.16    5.16
 *     the cast's label and its ✦ / gilt                        7.64    7.64
 *
 * All seven are already rows in `utils/__tests__/factionContrast.test.ts`. This
 * archetype introduces no ground the charter has not already stood on and mounts
 * no shared component that brings its own — which is precisely what
 * `wowEditCharacterContrast.test.ts` had to be written for and this one does
 * not. Restating a measurement under a second name is what that file's own
 * header spends a paragraph warning against.
 *
 * ## Presentation only
 *
 * `useProposeTask` stays the single source of state for every archetype. Nothing
 * here touches the submit path, the endpoint choice or the payload, and the two
 * gates (`isLoggedIn`, `canProposeTask`) stay in `ProposeTask.tsx` above this
 * file — an archetype only ever draws the happy path or its success screen.
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

/** The na kit's own caps, restated because they are this form's caps (#1609). */
const TITLE_MAX = 200
const DESCRIPTION_MAX = 5000
/** Mirrors `schemas.task.MAX_TASK_NOTES`, which stays the authority. */
const NOTES_MAX = 2000
/** The counters turn amber before the cap, exactly where the na kit's do. */
const TITLE_WARN = 180
const DESCRIPTION_WARN = 4500

const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8]

/* ── WOW's two faces (§3) ── */
/**
 * MedievalSharp — the chronicle's display hand.
 *
 * THE FOUR CORE ROLES ARE ASKED FOR BY NAME (#2674). `ComposerPage` puts the
 * style object it is handed straight on its root element, so
 * `factionRoleVars('wow', 'wow-propose')` declares the prefix on the page this
 * file dresses without a prop threaded through a shared block — that would be
 * tree work, and this is paint. No read below carries a fallback arm: since
 * #2690 the map answers for all nine slugs, so a fallback here is unreachable
 * code (ADR-0089).
 */
const MED = 'var(--wow-propose-face)'
/** Lora — body AND label on the writ, per that design's type row. */
const LORA = 'var(--faction-wow-body-font)'

/* ── The chronicle palette. Every one a shipped --faction-wow-* token, and
   every pairing already measured in `factionContrast.test.ts`. ── */
/** The sheet: cream parchment by day, the deep ground by night. */
const SHEET = 'var(--wow-propose-paper)'
/** The inset parchment plate every editable field and the preview sit on. */
const FIELD = 'var(--faction-wow-chronicle-panel)'
/** Body ink. 14:1 on the cream, and measured on the plate too. */
const INK = 'var(--wow-propose-ink)'
/** Quiet ink — CREAM ONLY (4.76:1 there, 4.24:1 on the plate). */
const MUTED = 'var(--wow-propose-quiet)'
/** The label/eyebrow ink, the one measured on BOTH chronicle grounds. */
const LABEL = 'var(--faction-wow-accent-deep)'
/** Plum as a SURFACE. Theme-invariant, with its own AA ink beside it. */
const PLUM_FILL = 'var(--faction-wow-plum-surface)'
const ON_PLUM = 'var(--faction-wow-on-plum)'
/** Frame + rule gold. Theme-invariant, and never an ink. */
const GOLD = 'var(--faction-wow-chronicle-gold)'
/** The QUIET gold — the same gilt at 40%. An edge that only suggests a plate. */
const RULE = 'var(--faction-wow-rule)'
/** The AA ink for anything printed ON the gold. */
const ON_GOLD = 'var(--faction-wow-on-gold)'
/** The band along the head of the sheet: gold 0-11px, plum 11-22px. */
const RIBBON = 'var(--faction-wow-quest-ribbon)'
/** A whole page's lift rather than a card's — the sheet is the page here. */
const SHEET_SHADOW = 'var(--faction-wow-detail-shadow)'
/**
 * The over-limit line's and the spent counter's ink. The neutral
 * `--color-danger` is 4.08:1 on this cream in light and so misses AA; this is
 * #1449's alarm rung, already measured on the parchment.
 */
const ALARM = 'var(--faction-wow-card-alarm)'

/* ── Ornament geometry (WORLD_ZERO_STYLE §4a: illustration, not layout) ── */
/** The bunch keeping the muster, at the two sizes the kit's pages draw it. */
const BUNCH = { desktop: 38, mobile: 30 }
/** The mark each faction wears in the picker — every other chooser's size (#2223). */
const PICKER_SIGIL = 18
/** The charter's corner, the one every WOW plate takes. */
const RADIUS = 6
/** The metatask tick box, at the na kit's own 18px. */
const TICK = 18
/** A level node — the na kit's 40px disc, kept so the row's meaning is unchanged. */
const NODE = 40
/** The points field: wide enough for four digits, narrow enough to read as a number. */
const POINTS_WIDTH = 96

/** A parchment field in a gilt frame — the writ's whole geometry row. */
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

/** Lora label ink on the cream — every section head on this sheet. */
const sectionLabel: CSSProperties = { fontFamily: LORA, color: LABEL }

/** The quiet line under a field: on the cream, so MUTED is the measured tier. */
const hintStyle: CSSProperties = {
  fontFamily: LORA,
  fontStyle: 'italic',
  fontSize: 'var(--text-content)',
  color: MUTED,
  margin: 0,
  lineHeight: 1.55,
}

/**
 * The kit's chip: a gilt-framed parchment plate that fills plum when chosen.
 *
 * One treatment for the faction radiogroup and the level row, because on the na
 * page those two ARE one geometry ("matching the faction chips above them",
 * `FilterLevelNodes`) and losing that would make the level row a stranger to the
 * chips it sits under. Selected takes solid gilt, unselected the quiet gold —
 * the writ's mode-chip rule (#1830), and the charter's calling picker.
 */
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
    // The faction's own hue as a RING, never as ink (§3) — the row's type stays
    // on a measured chronicle pair. `na` and Albescent have no single hue to
    // ring with, and the spectrum is not a device this kit draws, so their
    // selection reads as the plum fill and the solid gilt frame alone.
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

  // The #1695 admin-review window, in the era's own hours — never a typed-out
  // 48. `null` until `/game-config` lands, and unknown means UNDRAWN rather than
  // assumed, the doctrine the na kit sets here.
  const adminReviewHours = useGameConfig()?.pending_task_admin_review_hours ?? null

  // Unaffiliated leads the picker: it is the default, and a state rather than a
  // faction (ADR-0039). Everything after it comes from the API, falling back to
  // the static registry before the fetch lands, in the site's one rainbow order.
  const factionOptions: string[] = [
    UNAFFILIATED_FACTION_SLUG,
    ...sortFactionsByRainbowOrder(
      (factions.length > 0 ? factions : getAllFactions()).map((f) => ({ slug: f.slug })),
    ).map((f) => f.slug),
  ]

  /* The decree's head, in the order the task card strings it: the 7px barber
     ribbon straight off `--faction-wow-quest-ribbon`, then the pennant run
     beneath it (#2032's own swap). Both are shipped devices — no geometry is
     drawn here. The masthead slot is a full-bleed child of the sheet, which
     clips it to the corner radius, so neither needs positioning. */
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
    ...factionRoleVars(SLUG, 'wow-propose'),
    fontFamily: LORA,
    color: INK,
  }

  /* THE BREADCRUMB IS NEUTRAL SITE CHROME, and since #2973 it is the site's own
     component rather than this file's copy of it — the `ponytail:` note that
     stood here named exactly that upgrade. Both stages mount it: the success
     stage is still a page under `Tasks` and still needs a way back. */
  const breadcrumb = <Breadcrumb current={t('proposeTask.pageTitle')} />

  /** The sheet's head: ✦, the page's own words, a wavy rule, one bunch. */
  const head = (heading: string) => (
    /* THIS ROW IS THE CEILING THE HEADING FLOOR IS MEASURED ON, at BOTH widths
       and for two different reasons — see `useComposerSizes`. The floor is on
       the box AROUND it, never on the row itself: this row wraps on a phone (by
       design, so the heading is stacked rather than crushed), and a `min-height`
       on a multi-line flex container distributes its own lines rather than
       reserving space under them. Outside, the row keeps its natural height and
       the floor does its one job. */
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

  /** A counter under a field: quiet on the cream, alarmed on the cap. */
  const counter = (used: number, warn: number, max: number) => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', fontFamily: LORA, fontSize: 'var(--text-lg)' }}>
      <span style={{ color: used >= warn ? ALARM : MUTED }}>
        {used}/{max}
      </span>
    </div>
  )

  /** The at-the-limit line — danger, not the approach the counter already warns of. */
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
      {/* A REAL `<form>`, not a bare button with an onClick — it is what makes
          Enter commit from a text field, and what gives the browser's own
          required-field behaviour something to attach to. `handleSubmit` calls
          `preventDefault()` itself. */}
      <form onSubmit={handleSubmit} data-skin={SLUG}>
        {/* `reserveHead` (#2995): neither the ribbon nor the bunting is touched
            — they keep their own heights inside a slot of a known one. The
            table is in `useComposerSizes`. */}
        <ComposerSheet sizes={sizes} style={sheetStyle} masthead={masthead} reserveHead>
          {head(t('proposeTask.pageTitle'))}

          {/* The banner the quest is petitioned UNDER — and the control that
              mounts this very dress, so it stays fully drawn. A wrapping
              radiogroup, never `ChipRow`: that shell scrolls horizontally with a
              hidden scrollbar and would bury three of the nine options. */}
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
                    {/* The slug, never null: `FactionSigil` already falls through
                        to the spectrum ring for `na`, and passing the slug keeps
                        Albescent's own mark on Albescent's chip. Selected, the
                        ground is this kit's plum, so the mark moves to this
                        kit's `onFill` ink beside its label (#2852). */}
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

          {/* The quest's name, in the chronicle's own display hand. The visible
              label is the placeholder, and `aria-label` carries the same string
              — a placeholder disappears on the first keystroke (§7). */}
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

          {/* What it is worth. The metatask branch swaps the field and adds its
              hint, exactly as the na kit's does. */}
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
                placeholder={t('proposeTask.fields.basePoints.placeholder')}
                style={{ ...fieldBox, width: POINTS_WIDTH, fontFamily: MED, textAlign: 'center' }}
              />
            </ComposerSection>
          )}

          {/* Who may take it up. The na kit's level row in this kit's chip
              treatment: same discs, same meaning ("level ≥ N"), same clear-on-
              re-click, same string. See the header for why `FilterLevelNodes`
              itself is not mounted. */}
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
              {/* A `role="checkbox"` button, not an `<input>`: a native box is
                  tinted with `accent-color`, which takes ONE colour, and the
                  unaffiliated identity this control also has to draw for is
                  seven of them (ADR-0039). The tick is the kit's own ✦. */}
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

          {/* A word for the admin — the standard branch only (#1823). */}
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

          {/* The petition as it will read. A parchment plate, so every line here
              takes INK rather than the cream's quiet tier. */}
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
                {/* A caption, not a heading: the faction name is interpolated
                    in, so a long slug turns this into a run of prose (#1307). */}
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
                          // The raw input string. An empty or unparseable one
                          // draws "?" and takes the PLURAL — "? points" reads,
                          // "? point" does not (#2598).
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

          {/* The zigzag, drawn ONCE above the footer (#1707) rather than at the
              head of every section — the sheet's own gap parts the regions, and
              one per section would make a ladder of the petition. */}
          <Zig id="petition-footer" />

          {/* [Cancel] … [Submit] — the global order from #646, with the cast as a
              full-bleed gilt band flush to the sheet's bottom edge (#1828). */}
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
                    /* The band is the one control WOW letters in its DISPLAY
                       face — the writ's own `band.font: 'title'` row. */
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
                {/* The ✦ following the cast, in the ink measured ON the gilt. */}
                <WowSpark color={ON_GOLD} />
              </button>
            }
          />
        </ComposerSheet>
      </form>
    </ComposerPage>
  )
}

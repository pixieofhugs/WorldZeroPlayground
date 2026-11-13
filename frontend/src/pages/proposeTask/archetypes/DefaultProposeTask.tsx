/**
 * Unaffiliated (`default` ≡ `na`) proposing a task, on the composer chassis
 * (#2993). One file per faction still stands (ADR-0090 §Tree); this mounts the
 * shared blocks rather than re-authoring a sheet. The dress is na's own, the one
 * `DefaultEditPraxis` already wears (ADR-0065).
 *
 * Chips sit inside the sheet as a wrapping `role="radiogroup"` of `Chip`s, not a
 * `ChipRow`: that shell scrolls horizontally and would bury three of eight.
 *
 * No `PageTitle` (see the heading's call site) and no rainbow bar under it: na's
 * spectrum is the sheet's 3px frame (#2520). One hairline, above the footer (#1707).
 *
 * Three wells: `Chip` and `FilterLevelNodes` paint app neutrals and take no style
 * hook; on the aurora-washed sheet they miss AA in dark (3.55 / 4.08), so both
 * rows stand on the opaque `--faction-default-composer-field`. The preview chit
 * shares the plate (its `--color-success` line needs it too). Ratios live in
 * `__tests__/naProposeTaskContrast.test.ts`.
 *
 * Inks are na's family because the ground changed: `--color-danger` and
 * `--color-warning` miss AA here, so the #1609 split is `card-alarm` / `card-notice`.
 * Tokens come from `defaultComposerDress`; FAINT is for the washed sheet, MUTED
 * for the well (#2485).
 *
 * Focus: every field carries `data-composer-field` and none declares `outline`;
 * an inline `outline: none` would beat the shared ring (#2266).
 *
 * Only ever on screen for `na`, Albescent, a cleared pick or an unknown slug, so
 * nothing branches on `isKnownFaction(factionSlug)`; only the chip row reads slugs.
 * `ep-drift` is a class so the reduced-motion guard applies (#1003).
 * Presentation only: state is `useProposeTask`.
 */
import { useTranslation } from "react-i18next";
import Breadcrumb from "../../../components/nav/Breadcrumb";
import FilterLevelNodes from "../../../components/ui/FilterLevelNodes";
import { Chip } from "../../../components/ui/ChipRow";
import FactionSigil from "../../../components/sigil/FactionSigil";
import { useGameConfig } from "../../../hooks/useGameConfig";
import {
  factionCssVar,
  factionFill,
  factionName,
  getAllFactions,
  isKnownFaction,
  sortFactionsByRainbowOrder,
} from "../../../utils/factions";
import {
  ComposerFooter,
  ComposerHeading,
  ComposerPage,
  ComposerRule,
  ComposerSection,
  ComposerSheet,
  ErrorBanner,
  composerLabelStyle,
  useComposerSizes,
} from "../../editPraxis/archetypes/shared";
import {
  ALARM,
  EDGE,
  FAINT,
  FIELD,
  HAIR,
  INK,
  MUTED,
  TITLE_FACE,
  composerGround,
  fieldBox,
  labelStyle,
  primaryStyle,
  sheetStyle,
} from "../../editPraxis/archetypes/defaultComposerDress";
import {
  UNAFFILIATED_FACTION_SLUG,
  type ProposeTaskState,
} from "../useProposeTask";

const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

/* `schemas.task` stays the authority; literals as in every propose kit. */
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 5000;
const NOTES_MAX = 2000;
/* #1609's approach rung: the counter turns NOTICE before it turns ALARM. */
const TITLE_NOTICE = 180;
const DESCRIPTION_NOTICE = 4500;

/* Dress is `defaultComposerDress` (#2993). The approach rung is this surface's
   alone (#1609); `--color-warning` measures 3.51:1 on this sheet. */
const NOTICE = "var(--faction-default-card-notice)";

/* The well under the chip row, level row and preview chit (see header). */
const wellStyle = {
  background: FIELD,
  border: `1px solid ${EDGE}`,
  borderRadius: 10,
  padding: "var(--space-md)",
} as const;

export default function DefaultProposeTask({
  state,
}: {
  state: ProposeTaskState;
}) {
  const { t } = useTranslation("forms");
  const sizes = useComposerSizes();
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
  } = state;

  const fname = factionName(factionSlug);

  // The #1695 review window from the era, never a typed 48. `null` until
  // `/game-config` lands, and unknown means undrawn.
  const adminReviewHours =
    useGameConfig()?.pending_task_admin_review_hours ?? null;

  // Unaffiliated leads: a state, not a faction (ADR-0039). Then rainbow order (#352).
  const factionOptions: string[] = [
    UNAFFILIATED_FACTION_SLUG,
    ...sortFactionsByRainbowOrder(
      (factions.length > 0 ? factions : getAllFactions()).map((f) => ({
        slug: f.slug,
      })),
    ).map((f) => f.slug),
  ];

  /** The counter under a capped field: quiet, then notice, then alarm (#1609). */
  const counter = (used: number, notice: number, max: number) => (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-lg)",
      }}
    >
      <span style={{ color: used >= max ? ALARM : used >= notice ? NOTICE : FAINT }}>
        {used}/{max}
      </span>
    </div>
  );

  /** Only drawn at the cap, so it is the alarm rung (#1609). */
  const tooLong = (message: string) => (
    <span
      style={{
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-content)",
        color: ALARM,
      }}
    >
      {message}
    </span>
  );

  if (success) {
    return (
      <ComposerPage sizes={sizes} style={{ fontFamily: TITLE_FACE, color: INK }}>
        <ComposerSheet sizes={sizes} style={sheetStyle} reserveHead ground={composerGround}>
          <h1
            style={{
              fontFamily: TITLE_FACE,
              fontStyle: "italic",
              fontWeight: 700,
              fontSize: sizes.titleSize,
              lineHeight: 1.1,
              color: INK,
              margin: 0,
            }}
          >
            {isMetatask
              ? t("proposeTask.successMeta.heading")
              : t("proposeTask.successTask.heading")}
          </h1>
          {adminReviewHours !== null && (
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-content)",
                color: FAINT,
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {isMetatask
                ? t("proposeTask.successMeta.body", {
                    faction: fname,
                    hours: adminReviewHours,
                  })
                : t("proposeTask.successTask.body", { hours: adminReviewHours })}
            </p>
          )}
        </ComposerSheet>
      </ComposerPage>
    );
  }

  return (
    <ComposerPage
      sizes={sizes}
      style={{ fontFamily: TITLE_FACE, color: INK }}
      /* The shared trail (#2102), in site chrome ink. */
      breadcrumb={<Breadcrumb current={t("proposeTask.pageTitle")} />}
    >
      {/* A real `<form>` so Enter commits from a text field. */}
      <form onSubmit={handleSubmit} data-skin="default">
        {/* `reserveHead` (#2995): na reserves bare ground so every kit's
            first section lands at the same offset. */}
        <ComposerSheet sizes={sizes} style={sheetStyle} reserveHead ground={composerGround}>
          {/* Not `PageTitle`: its `mb-6` breaks the column's rhythm
              (`ComposerSheet` docblock) and it is app chrome on an unmeasured
              ground. Same copy key as the six chassis kits. */}
          <ComposerHeading sizes={sizes}>
            <h1
              style={{
                fontFamily: TITLE_FACE,
                fontStyle: "italic",
                fontWeight: 700,
                fontSize: sizes.titleSize,
                lineHeight: 1.1,
                color: INK,
                margin: 0,
              }}
            >
              {t("proposeTask.pageTitle")}
            </h1>
          </ComposerHeading>

          {/* The target faction, which the page is dispatched by. */}
          <ComposerSection
            rule={false}
            label={t("proposeTask.factionLabel")}
            labelStyle={labelStyle}
          >
            <div
              role="radiogroup"
              aria-label={t("proposeTask.factionLabel")}
              style={{
                ...wellStyle,
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-sm)",
              }}
            >
              {factionOptions.map((slug) => (
                <Chip
                  key={slug}
                  on={factionSlug === slug}
                  onClick={() => setFactionSlug(slug)}
                  tint={factionCssVar(slug)}
                  // `na`/Albescent have no single hue: spectrum frame (#749).
                  unaffiliated={!isKnownFaction(slug)}
                  sigilText
                >
                  {/* Pass the slug even for `na`, so Albescent keeps its mark. */}
                  <FactionSigil slug={slug} size={18} />
                  <span>{factionName(slug)}</span>
                </Chip>
              ))}
            </div>
          </ComposerSection>

          {/* Placeholder-only: the placeholder IS the visible label, so
              `aria-label` repeats it; do not delete it (#2598). */}
          <ComposerSection rule={false}>
            <input
              data-composer-field
              type="text"
              required
              maxLength={TITLE_MAX}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              aria-label={t("proposeTask.fields.name.label")}
              placeholder={t("proposeTask.fields.name.label")}
              style={{
                ...fieldBox,
                fontFamily: TITLE_FACE,
                fontStyle: "italic",
                fontSize: "var(--text-title)",
              }}
            />
            {counter(title.length, TITLE_NOTICE, TITLE_MAX)}
            {title.length >= TITLE_MAX &&
              tooLong(t("proposeTask.fields.name.tooLong"))}
          </ComposerSection>

          <ComposerSection rule={false}>
            <textarea
              data-composer-field
              rows={6}
              maxLength={DESCRIPTION_MAX}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              aria-label={t("proposeTask.fields.description.label")}
              placeholder={t("proposeTask.fields.description.placeholder")}
              style={{ ...fieldBox, lineHeight: 1.7 }}
            />
            {counter(description.length, DESCRIPTION_NOTICE, DESCRIPTION_MAX)}
            {description.length >= DESCRIPTION_MAX &&
              tooLong(t("proposeTask.fields.description.tooLong"))}
          </ComposerSection>

          <ComposerSection rule={false}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-xl)",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-sm)",
                }}
              >
                <span style={composerLabelStyle(labelStyle)}>
                  {isMetatask
                    ? t("proposeTask.fields.bonusPoints.label")
                    : t("proposeTask.fields.basePoints.label")}
                </span>
                <input
                  data-composer-field
                  type="text"
                  inputMode="numeric"
                  value={isMetatask ? metaBonusValue : pointValue}
                  onChange={(e) =>
                    (isMetatask ? setMetaBonusValue : setPointValue)(
                      e.target.value.replace(/[^0-9]/g, ""),
                    )
                  }
                  disabled={submitting}
                  aria-label={
                    isMetatask
                      ? t("proposeTask.fields.bonusPoints.label")
                      : t("proposeTask.fields.basePoints.label")
                  }
                  placeholder={
                    isMetatask
                      ? t("proposeTask.fields.bonusPoints.placeholder")
                      : t("proposeTask.fields.basePoints.placeholder")
                  }
                  style={{
                    ...fieldBox,
                    width: 96,
                    fontFamily: TITLE_FACE,
                    fontSize: "var(--text-title)",
                    textAlign: "center",
                  }}
                />
                {isMetatask && (
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "var(--text-lg)",
                      color: FAINT,
                    }}
                  >
                    {t("proposeTask.fields.bonusPoints.hint")}
                  </span>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-sm)",
                }}
              >
                <span style={composerLabelStyle(labelStyle)}>
                  {t("proposeTask.fields.minimumLevel.label")}
                </span>
                {/* Mounted, not re-drawn (#2993); on the well for contrast. */}
                <div style={wellStyle}>
                  <FilterLevelNodes
                    levels={LEVEL_OPTIONS}
                    value={levelRequired}
                    onChange={setLevelRequired}
                    factionSlug={factionSlug}
                  />
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
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-sm)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  margin: 0,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 18,
                    height: 18,
                    flex: "none",
                    borderRadius: 4,
                    boxSizing: "border-box",
                    // Border only keeps both states one size.
                    border: `2px solid ${isMetatask ? "transparent" : EDGE}`,
                    ...(isMetatask
                      ? factionFill(UNAFFILIATED_FACTION_SLUG, "bar")
                      : { background: FIELD }),
                  }}
                />
                <span style={composerLabelStyle(labelStyle)}>
                  {t("proposeTask.metaToggle.label")}
                </span>
              </button>
            </ComposerSection>
          )}

          {/* Hidden for metatasks: the planner drops notes there (#1823). */}
          {!isMetatask && (
            <ComposerSection rule={false}>
              <textarea
                data-composer-field
                rows={3}
                maxLength={NOTES_MAX}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                aria-label={t("proposeTask.fields.notes.label")}
                placeholder={t("proposeTask.fields.notes.label")}
                style={{ ...fieldBox, lineHeight: 1.7 }}
              />
            </ComposerSection>
          )}

          {/* Live preview, on the well: the sheet owns the spectrum frame
              (#2520) and `--color-success` needs the opaque field. */}
          {title && (
            <div
              style={{
                ...wellStyle,
                padding: "var(--space-md) var(--space-lg)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-xs)",
              }}
            >
              {/* Caption, not a heading: the faction name makes it prose (#1307). */}
              <span style={composerLabelStyle({ color: MUTED })}>
                {isMetatask
                  ? t("proposeTask.preview.metaHeading", { faction: fname })
                  : t("proposeTask.preview.taskHeading", { faction: fname })}
              </span>
              <p
                style={{
                  fontFamily: TITLE_FACE,
                  fontStyle: "italic",
                  fontSize: "var(--text-title)",
                  color: INK,
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {title}
              </p>
              {description && (
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "var(--text-content)",
                    color: MUTED,
                    margin: 0,
                    lineHeight: 1.5,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {description}
                </p>
              )}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--space-md)",
                  fontFamily: "var(--font-body)",
                  fontSize: "var(--text-lg)",
                }}
              >
                {isMetatask ? (
                  <span style={{ color: "var(--color-success)" }}>
                    {t("proposeTask.preview.bonusPoints", {
                      points: metaBonusValue || "?",
                    })}
                  </span>
                ) : (
                  <span style={{ color: MUTED }}>
                    {t("proposeTask.preview.points", {
                      points: pointValue || "?",
                      // Empty/unparseable draws "?" with the plural (#2598).
                      count: Number(pointValue) || 0,
                    })}
                  </span>
                )}
                <span style={{ color: MUTED }}>
                  {t("proposeTask.preview.level", {
                    level: levelRequired === "" ? 0 : levelRequired,
                  })}
                </span>
                {!isMetatask && (
                  <span style={{ color: MUTED }}>
                    {t("proposeTask.preview.pending")}
                  </span>
                )}
              </div>
            </div>
          )}

          <ErrorBanner message={error ?? ""} style={{ color: ALARM }} />

          {/* The one rule (#1707). */}
          <ComposerRule style={{ background: HAIR }} />

          {/* [Cancel] … [Submit] (#646). Inline commit, not a band (#1828). */}
          <ComposerFooter
            start={
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={composerLabelStyle({
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: FAINT,
                  })}
                >
                  {t("proposeTask.submit.cancel")}
                </button>
                {adminReviewHours !== null && (
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "var(--text-lg)",
                      color: FAINT,
                    }}
                  >
                    {t("proposeTask.submit.note", { hours: adminReviewHours })}
                  </span>
                )}
              </>
            }
            end={
              <button
                type="submit"
                disabled={submitting}
                // `.control-off`, not `opacity` (#2486): opacity fades the
                // label twice. See `disabledControlContrast.test.ts`.
                className="control-off"
                style={{ ...primaryStyle, cursor: submitting ? "wait" : "pointer" }}
              >
                {submitting
                  ? t("proposeTask.submit.busy")
                  : isMetatask
                    ? t("proposeTask.submit.meta")
                    : t("proposeTask.submit.task")}
              </button>
            }
          />
        </ComposerSheet>
      </form>
    </ComposerPage>
  );
}

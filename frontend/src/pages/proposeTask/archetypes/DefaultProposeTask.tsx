import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageTitle from "../../../components/ui/PageTitle";
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
  metaBoxStyle,
  proposeCardStyle,
  submitButtonStyle,
  taskNameInputStyle,
} from "../factionSurfaces";
import {
  UNAFFILIATED_FACTION_SLUG,
  type ProposeTaskState,
} from "../useProposeTask";

const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const breadcrumbStyle: CSSProperties = {
  fontSize: "var(--text-md)",
  letterSpacing: "0.1em",
  color: "var(--color-text-tertiary)",
};

const descriptionTextareaStyle: CSSProperties = {
  width: "100%",
  fontFamily: "'Courier Prime', monospace",
  lineHeight: 1.7,
  color: "var(--color-text-primary)",
  background: "transparent",
  border: "none",
  outline: "none",
  resize: "vertical",
  minHeight: 120,
};

const notesTextareaStyle: CSSProperties = {
  width: "100%",
  fontFamily: "'Courier Prime', monospace",
  color: "var(--color-text-primary)",
  background: "transparent",
  border: "1px solid var(--color-border)",
  borderRadius: 6,
  padding: "var(--space-sm) var(--space-md)",
  outline: "none",
  resize: "vertical",
};

// The AT-the-limit message, not the approach — the counter above it turns
// amber (`.warning-text`) from 180/4500 and this only appears at 200/5000, so
// this one is genuinely danger (#1609).
const tooLongStyle: CSSProperties = {
  color: "var(--color-danger)",
  display: "block",
  marginTop: "var(--space-xs)",
};

const basePointsInputStyle: CSSProperties = {
  width: 80,
  fontFamily: "'Courier Prime', monospace",
  fontWeight: 700,
  color: "var(--color-text-primary)",
  background: "transparent",
  border: "none",
  borderBottom: "2px solid var(--color-border-strong)",
  outline: "none",
  textAlign: "center",
};

const submitNoteStyle: CSSProperties = {
  color: "var(--color-text-tertiary)",
  marginLeft: "auto",
};

/** The one page rule under the title — the site's spectrum, not a faction's. */
const titleRuleStyle: CSSProperties = {
  height: 3,
  width: 240,
  background: "var(--faction-default-rainbow)",
  marginBottom: "var(--space-xl)",
};

/** The metatask control: a real checkbox can't carry seven colours (#1824). */
const metaToggleStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-sm)",
  background: "transparent",
  border: "none",
  padding: 0,
  margin: 0,
  cursor: "pointer",
  textAlign: "left",
};

/**
 * Default propose-task archetype — the original universal form, now consuming
 * the shared {@link ProposeTaskState}. Any faction without a bespoke archetype
 * falls through to this, so it must stay visually identical to the pre-refactor
 * page. Owns both the success screen and the form (both are faction-tinted off
 * the selected faction). The login / eligibility gates live in the dispatcher.
 */
export default function DefaultProposeTask({
  state,
}: {
  state: ProposeTaskState;
}) {
  const { t } = useTranslation("forms");
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

  const color = factionCssVar(factionSlug);
  // The TYPE on this page takes a neutral tier, never the scalar above (#2108).
  // `color` is a FILL — the swatch ring, the preview panel's wash and border —
  // and as an ink on this page's neutral ground the bare hue measured 2.36:1
  // (Ephemerists), 2.67:1 (S.N.I.D.E.) and 3.10:1 in light. The accent stays;
  // only the type moves, which is what the preview caption below already said.
  const ink = "var(--color-text-primary)";
  const fname = factionName(factionSlug);
  // The form opens on unaffiliated, whose accent (`color`) resolves to neutral
  // grey. A real faction paints its solid hue; `na` gets the spectrum as a
  // border `frame` / fill instead of falling back to grey (ADR-0039, #794).
  // Only the scalar ACCENTS switch — `color:` text stays neutral ink (#649).
  const selectedKnown = isKnownFaction(factionSlug);

  // The #1695 admin-review window, in the era's own hours. Every line below that
  // promises it interpolates THIS, never a typed-out 48 — the day an era changes
  // the window, a hardcoded number is the site lying to the person it made the
  // promise to. `null` until `/game-config` lands, and unknown means UNDRAWN
  // rather than assumed: the doctrine `HoldoutPublishNotice` sets for
  // `collab_auto_submit_days`. In practice the Sidebar has already warmed the
  // shared cache by the time a signed-in player reaches this page.
  const adminReviewHours =
    useGameConfig()?.pending_task_admin_review_hours ?? null;

  // Unaffiliated leads the picker: it is the default, and it is a state rather
  // than a faction, so it is an extra option here rather than a registry entry
  // (ADR-0039). Everything after it comes from the API, falling back to the
  // static registry before the fetch lands, in the site's one rainbow order
  // (#352) — the chips are a spectrum now, so their sequence is the spectrum's.
  const factionOptions: string[] = [
    UNAFFILIATED_FACTION_SLUG,
    ...sortFactionsByRainbowOrder(
      (factions.length > 0 ? factions : getAllFactions()).map((f) => ({
        slug: f.slug,
      })),
    ).map((f) => f.slug),
  ];

  if (success) {
    return (
      <div className="py-8" style={{ maxWidth: 720, margin: "0 auto" }}>
        <PageTitle title={t("proposeTask.pageTitle")} />
        <div
          className="sidebar-card"
          style={{ padding: "var(--space-xl)", textAlign: "center" }}
        >
          {isMetatask ? (
            <>
              <p
                className="content-title font-display italic"
                style={{ color: ink, marginBottom: "var(--space-sm)" }}
              >
                {t("proposeTask.successMeta.heading")}
              </p>
              {adminReviewHours !== null && (
                <p
                  className="content-text font-body"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t("proposeTask.successMeta.body", {
                    faction: factionName(factionSlug),
                    hours: adminReviewHours,
                  })}
                </p>
              )}
            </>
          ) : (
            <>
              <p
                className="content-title font-display italic"
                style={{ color: ink, marginBottom: "var(--space-sm)" }}
              >
                {t("proposeTask.successTask.heading")}
              </p>
              {adminReviewHours !== null && (
                <p
                  className="content-text font-body"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {t("proposeTask.successTask.body", { hours: adminReviewHours })}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Breadcrumb */}
      <nav
        className="font-body mb-4"
        style={breadcrumbStyle}
      >
        <Link to="/tasks" style={{ color: "inherit", textDecoration: "none" }}>
          {t("breadcrumb.tasks")}
        </Link>
        {" › "}
        <span style={{ color: "var(--color-text-primary)" }}>
          {t("proposeTask.pageTitle")}
        </span>
      </nav>

      <PageTitle title={t("proposeTask.pageTitle")} />
      <div aria-hidden="true" style={titleRuleStyle} />

      {/* One column (§20.1). The tips rail is gone; the form is the page — and
          a single column is also what the mobile path needs, which the old
          `1fr 280px` inline grid was a standing violation of. */}
      <div style={{ maxWidth: 760 }}>
          {/* Faction chips (§20.2) — the site's chip idiom, one wrapping
              radiogroup. Not `ChipRow`: its shell scrolls horizontally with a
              hidden scrollbar and prints a visible inline label, which would
              bury three of the eight options. */}
          <div style={{ marginBottom: "var(--space-lg)" }}>
            <div
              role="radiogroup"
              aria-label={t("proposeTask.factionLabel")}
              style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}
            >
              {factionOptions.map((slug) => (
                <Chip
                  key={slug}
                  on={factionSlug === slug}
                  onClick={() => setFactionSlug(slug)}
                  tint={factionCssVar(slug)}
                  // `na` (and Albescent) have no single hue for the selected
                  // ring, so they take the spectrum frame instead (#749).
                  unaffiliated={!isKnownFaction(slug)}
                  sigilText
                >
                  {/* The slug, not a null for `na`: FactionSigil already falls
                      through to the spectrum ring for it, and passing the slug
                      is what keeps Albescent's own mark on Albescent's chip. */}
                  <FactionSigil slug={slug} size={18} />
                  <span>{factionName(slug)}</span>
                </Chip>
              ))}
            </div>
          </div>

          {/* Form inside faction-framed card (§20.3) */}
          <form onSubmit={handleSubmit}>
            <div
              className="sidebar-card"
              style={{
                // One frame for every selection — an even 2px gradient edge,
                // the spectrum for `na` and a bevelled ramp of its own hue for
                // a real faction (factionSurfaces.ts).
                ...proposeCardStyle(factionSlug),
                marginBottom: "var(--space-lg)",
              }}
            >
              {/* Task Name (§20.4). The visible label is gone — the field is
                  set in the faction's own display face and identified by its
                  placeholder — so the label key it used to render is now what
                  it ANNOUNCES: a placeholder disappears on the first keystroke
                  (§7). Same for the description and notes below.

                  #2598 asked for `fields.name.placeholder` to be DELETED, on
                  the premise that it merely echoed a visible label. It did not:
                  per the paragraph above the placeholder IS the only on-screen
                  identification this field has, so deleting it would leave a
                  sighted user an unlabelled box. What was actually wrong is
                  that one field's wording lived in two keys that had already
                  drifted apart in case ("Task name" / "Task Name"). The second
                  key is gone and both uses read the label — one concept, one
                  key, and the screen reader stops hearing two spellings.
                  Whether these fields should get a visible label back is a
                  design question, and it is on the issue. */}
              <div style={{ marginBottom: "var(--space-lg)" }}>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={submitting}
                  aria-label={t("proposeTask.fields.name.label")}
                  placeholder={t("proposeTask.fields.name.label")}
                  style={taskNameInputStyle(factionSlug, Boolean(title))}
                />
                <span
                  className={`label-caption self-end ${title.length >= 180 ? "warning-text" : ""}`}
                  style={{ marginTop: "var(--space-xs)" }}
                >
                  {title.length}/200
                </span>
                {title.length >= 200 && (
                  <span
                    className="content-text font-body"
                    style={tooLongStyle}
                  >
                    {t("proposeTask.fields.name.tooLong")}
                  </span>
                )}
              </div>

              {/* Description (§20.4) */}
              <div style={{ marginBottom: "var(--space-lg)" }}>
                <textarea
                  rows={6}
                  maxLength={5000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitting}
                  aria-label={t("proposeTask.fields.description.label")}
                  placeholder={t("proposeTask.fields.description.placeholder")}
                  className="content-text"
                  style={descriptionTextareaStyle}
                />
                <span
                  className={`label-caption self-end ${description.length >= 4500 ? "warning-text" : ""}`}
                  style={{ marginTop: "var(--space-xs)" }}
                >
                  {description.length}/5000
                </span>
                {description.length >= 5000 && (
                  <span
                    className="content-text font-body"
                    style={tooLongStyle}
                  >
                    {t("proposeTask.fields.description.tooLong")}
                  </span>
                )}
              </div>

              {/* Suggested Difficulty (§20.4) */}
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-xl)",
                  alignItems: "flex-start",
                  marginBottom: "var(--space-md)",
                }}
              >
                {!isMetatask && (
                  <div>
                    <span
                      className="label-heading"
                      style={{ display: "block", marginBottom: "var(--space-sm)" }}
                    >
                      {t("proposeTask.fields.basePoints.label")}
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={pointValue}
                      onChange={(e) =>
                        setPointValue(e.target.value.replace(/[^0-9]/g, ""))
                      }
                      disabled={submitting}
                      placeholder={t("proposeTask.fields.basePoints.placeholder")}
                      className="content-title"
                      style={basePointsInputStyle}
                    />
                  </div>
                )}
                {isMetatask && (
                  <div>
                    <span
                      className="label-heading"
                      style={{ display: "block", marginBottom: "var(--space-sm)" }}
                    >
                      {t("proposeTask.fields.bonusPoints.label")}
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={metaBonusValue}
                      onChange={(e) =>
                        setMetaBonusValue(e.target.value.replace(/[^0-9]/g, ""))
                      }
                      disabled={submitting}
                      placeholder={t("proposeTask.fields.bonusPoints.placeholder")}
                      className="content-title"
                      style={{
                        ...basePointsInputStyle,
                        borderBottom: `2px solid ${color}`,
                      }}
                    />
                    <span
                      className="label-caption"
                      style={{ display: "block", marginTop: "var(--space-xs)" }}
                    >
                      {t("proposeTask.fields.bonusPoints.hint")}
                    </span>
                  </div>
                )}
                <div>
                  <span
                    className="label-heading"
                    style={{ display: "block", marginBottom: "var(--space-sm)" }}
                  >
                    {t("proposeTask.fields.minimumLevel.label")}
                  </span>
                  <FilterLevelNodes
                    levels={LEVEL_OPTIONS}
                    value={levelRequired}
                    onChange={setLevelRequired}
                    factionSlug={factionSlug}
                  />
                </div>
              </div>

              {canProposeMetatask && (
                <div
                  style={{
                    borderTop: "1px solid var(--color-border)",
                    paddingTop: "var(--space-lg)",
                  }}
                >
                  {/* A `role="checkbox"` button, not an `<input>`: a native box
                      is tinted with `accent-color`, which takes ONE colour, and
                      unaffiliated's identity is seven of them (ADR-0039). */}
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isMetatask}
                    onClick={() => setIsMetatask(!isMetatask)}
                    disabled={submitting}
                    style={metaToggleStyle}
                  >
                    <span
                      aria-hidden="true"
                      style={metaBoxStyle(factionSlug, isMetatask)}
                    />
                    <span className="label-heading">
                      {t("proposeTask.metaToggle.label")}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Notes to Admin (§20.5) — hidden for metatasks */}
            {!isMetatask && (
              <div style={{ marginBottom: "var(--space-lg)" }}>
                {/* maxLength mirrors schemas.task.MAX_TASK_NOTES, which stays
                    the authority and still rejects an over-long body. Stated
                    as a literal for the same reason the title and description
                    fields above state 200 / 5000. */}
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={submitting}
                  maxLength={2000}
                  aria-label={t("proposeTask.fields.notes.label")}
                  placeholder={t("proposeTask.fields.notes.label")}
                  className="content-text"
                  style={notesTextareaStyle}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = color;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-border)";
                  }}
                />
              </div>
            )}

            {/* Task / Meta Task Preview Strip (§20.6) */}
            {title && (
              <div
                style={{
                  // Known factions tint the strip in their light/border pair;
                  // `na` gets the rainbow as a frame around a neutral interior.
                  ...(selectedKnown
                    ? {
                        background: factionCssVar(factionSlug, "light"),
                        border: `1.5px solid ${factionCssVar(factionSlug, "border")}`,
                      }
                    : factionFill(factionSlug, "frame")),
                  borderRadius: 8,
                  padding: "var(--space-md) var(--space-lg)",
                  marginBottom: "var(--space-lg)",
                }}
              >
                {/* Caption, not a heading: the faction name is interpolated in,
                    so "Task preview — University of Asthmatics — Pending" is a
                    run of prose the moment a long slug is selected (#1307). The
                    faction accent stays — ink is measured separately. */}
                <span
                  className="label-caption"
                  style={{ color: ink, marginBottom: "var(--space-xs)", display: "block" }}
                >
                  {isMetatask
                    ? t("proposeTask.preview.metaHeading", { faction: fname })
                    : t("proposeTask.preview.taskHeading", { faction: fname })}
                </span>
                <p
                  className="content-text font-body"
                  style={{
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    marginBottom: "var(--space-xs)",
                  }}
                >
                  {title}
                </p>
                {description && (
                  <p
                    className="content-text font-body"
                    style={{
                      color: "var(--color-text-secondary)",
                      lineHeight: 1.4,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {description}
                  </p>
                )}
                <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-sm)" }}>
                  {isMetatask ? (
                    <span
                      className="label-caption"
                      style={{ color: "var(--color-success)" }}
                    >
                      {t("proposeTask.preview.bonusPoints", {
                        points: metaBonusValue || "?",
                      })}
                    </span>
                  ) : (
                    <span className="label-caption">
                      {t("proposeTask.preview.points", {
                        points: pointValue || "?",
                      })}
                    </span>
                  )}
                  <span className="label-caption">
                    {t("proposeTask.preview.level", {
                      level: levelRequired === "" ? 0 : levelRequired,
                    })}
                  </span>
                  {!isMetatask && (
                    <span className="label-caption" style={{ color: ink }}>
                      {t("proposeTask.preview.pending")}
                    </span>
                  )}
                </div>
              </div>
            )}

            {error && (
              <p
                className="content-text font-body"
                style={{
                  color: "var(--color-danger)",
                  marginBottom: "var(--space-md)",
                }}
              >
                {error}
              </p>
            )}

            {/* Submit Row (§20.7) */}
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", flexWrap: "wrap" }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  // The selected chip's treatment at CTA size: the faction's
                  // tint, or the spectrum frame for `na` (factionSurfaces.ts).
                  ...submitButtonStyle(factionSlug),
                  cursor: submitting ? "wait" : "pointer",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting
                  ? t("proposeTask.submit.busy")
                  : isMetatask
                    ? t("proposeTask.submit.meta")
                    : t("proposeTask.submit.task")}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="btn-outline"
                style={{ fontSize: "var(--text-base)", padding: "var(--space-sm) var(--space-lg)" }}
              >
                {t("proposeTask.submit.cancel")}
              </button>
              {adminReviewHours !== null && (
                <span
                  className="content-text font-body"
                  style={submitNoteStyle}
                >
                  {t("proposeTask.submit.note", { hours: adminReviewHours })}
                </span>
              )}
            </div>
          </form>
      </div>
    </div>
  );
}

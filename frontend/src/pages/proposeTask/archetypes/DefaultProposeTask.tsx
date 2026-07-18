import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageTitle from "../../../components/ui/PageTitle";
import FilterLevelNodes from "../../../components/ui/FilterLevelNodes";
import { factionCssVar, factionName, getAllFactions } from "../../../utils/factions";
import type { ProposeTaskState } from "../useProposeTask";

const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const breadcrumbStyle: CSSProperties = {
  fontSize: "var(--text-sm)",
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

const tooLongStyle: CSSProperties = {
  color: "#dc2626",
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

const tipsListStyle: CSSProperties = {
  color: "var(--color-text-primary)",
  lineHeight: 1.6,
  paddingLeft: "var(--space-lg)",
  listStyleType: "disc",
};

const tipsBodyStyle: CSSProperties = {
  color: "var(--color-text-secondary)",
  lineHeight: 1.6,
};

const submitNoteStyle: CSSProperties = {
  color: "var(--color-text-tertiary)",
  marginLeft: "auto",
};

const submitDashStyle: CSSProperties = {
  position: "absolute",
  inset: 3,
  border: "1px dashed rgba(255,255,255,0.25)",
  pointerEvents: "none",
};

const FACTION_DESCRIPTOR_KEY = {
  ua: "proposeTask.factionDescriptor.ua",
  wow: "proposeTask.factionDescriptor.wow",
  everymen: "proposeTask.factionDescriptor.everymen",
  snide: "proposeTask.factionDescriptor.snide",
  ephemerists: "proposeTask.factionDescriptor.ephemerists",
  singularity: "proposeTask.factionDescriptor.singularity",
} as const;

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
  const factionDescriptor = (slug: string): string => {
    const key = FACTION_DESCRIPTOR_KEY[slug as keyof typeof FACTION_DESCRIPTOR_KEY];
    return key ? t(key) : "";
  };
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
    isMetaTask,
    setIsMetaTask,
    metaBonusValue,
    setMetaBonusValue,
    submitting,
    error,
    handleSubmit,
    handleCancel,
  } = state;

  const color = factionCssVar(factionSlug);
  const fname = factionName(factionSlug);

  if (success) {
    return (
      <div className="py-8" style={{ maxWidth: 720, margin: "0 auto" }}>
        <PageTitle title={t("proposeTask.pageTitle")} />
        <div
          className="sidebar-card"
          style={{ padding: "var(--space-xl)", textAlign: "center" }}
        >
          {isMetaTask ? (
            <>
              <p
                className="content-title font-display italic"
                style={{ color, marginBottom: "var(--space-sm)" }}
              >
                {t("proposeTask.successMeta.heading")}
              </p>
              <p
                className="content-text font-body"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t("proposeTask.successMeta.body", {
                  faction: factionName(factionSlug),
                })}
              </p>
            </>
          ) : (
            <>
              <p
                className="content-title font-display italic"
                style={{ color, marginBottom: "var(--space-sm)" }}
              >
                {t("proposeTask.successTask.heading")}
              </p>
              <p
                className="content-text font-body"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {t("proposeTask.successTask.body")}
              </p>
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

      {/* Two-column: form left, tips right (§20.1) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: "var(--space-xl)",
          alignItems: "start",
        }}
      >
        {/* ── Left: Form ── */}
        <div>
          {/* Faction Selector (§20.2) */}
          <div style={{ marginBottom: "var(--space-lg)" }}>
            <span
              className="eyebrow"
              style={{ display: "block", marginBottom: "var(--space-sm)" }}
            >
              {t("proposeTask.factionSelectorLabel")}
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-sm)" }}>
              {(factions.length > 0 ? factions : getAllFactions()).map((f) => {
                const slug =
                  "slug" in f ? f.slug : (f as { slug: string }).slug;
                const active = factionSlug === slug;
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => setFactionSlug(slug)}
                    style={{
                      border: `2px solid ${active ? factionCssVar(slug, "border") : "var(--color-border)"}`,
                      background: active
                        ? factionCssVar(slug, "light")
                        : "var(--color-bg-surface)",
                      borderRadius: 6,
                      padding: "var(--space-sm) var(--space-lg)",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 120ms",
                      transform: active ? "translateY(-2px)" : "none",
                    }}
                  >
                    <span
                      className="pennant-shape"
                      style={{
                        display: "block",
                        background: factionCssVar(slug),
                        color: "var(--color-text-on-accent)",
                        fontFamily: "'Courier Prime', monospace",
                        fontSize: "var(--text-xs)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        padding: "var(--space-xs) var(--space-md)",
                        textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                        marginBottom: "var(--space-xs)",
                      }}
                    >
                      {factionName(slug)}
                    </span>
                    <span className="eyebrow">
                      {factionDescriptor(slug)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form inside faction-framed card (§20.3) */}
          <form onSubmit={handleSubmit}>
            <div
              className="sidebar-card"
              style={{
                borderLeft: `4px solid ${color}`,
                padding: "var(--space-lg) var(--space-xl)",
                marginBottom: "var(--space-lg)",
              }}
            >
              {/* Task Name (§20.4) */}
              <div style={{ marginBottom: "var(--space-lg)" }}>
                <span
                  className="eyebrow"
                  style={{ display: "block", marginBottom: "var(--space-sm)" }}
                >
                  {t("proposeTask.fields.name.label")}
                </span>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={submitting}
                  placeholder={t("proposeTask.fields.name.placeholder")}
                  style={{
                    width: "100%",
                    fontFamily: "'Courier Prime', monospace",
                    fontSize: "var(--text-title)",
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    background: "transparent",
                    border: "none",
                    borderBottom: `2px solid ${title ? color : "var(--color-border-strong)"}`,
                    outline: "none",
                    paddingBottom: "var(--space-sm)",
                    transition: "border-color 150ms",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderBottomColor = color;
                  }}
                  onBlur={(e) => {
                    if (!title)
                      e.currentTarget.style.borderBottomColor =
                        "var(--color-border-strong)";
                  }}
                />
                <span
                  className={`eyebrow self-end ${title.length >= 180 ? "text-red-600" : ""}`}
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
                <span
                  className="eyebrow"
                  style={{ display: "block", marginBottom: "var(--space-sm)" }}
                >
                  {t("proposeTask.fields.description.label")}
                </span>
                <textarea
                  rows={6}
                  maxLength={5000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={submitting}
                  placeholder={t("proposeTask.fields.description.placeholder")}
                  className="content-text"
                  style={descriptionTextareaStyle}
                />
                <span
                  className={`eyebrow self-end ${description.length >= 4500 ? "text-red-600" : ""}`}
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
                {!isMetaTask && (
                  <div>
                    <span
                      className="eyebrow"
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
                    <span
                      className="eyebrow"
                      style={{ display: "block", marginTop: "var(--space-xs)" }}
                    >
                      {t("proposeTask.fields.basePoints.hint")}
                    </span>
                  </div>
                )}
                {isMetaTask && (
                  <div>
                    <span
                      className="eyebrow"
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
                      className="eyebrow"
                      style={{ display: "block", marginTop: "var(--space-xs)" }}
                    >
                      {t("proposeTask.fields.bonusPoints.hint")}
                    </span>
                  </div>
                )}
                <div>
                  <span
                    className="eyebrow"
                    style={{ display: "block", marginBottom: "var(--space-sm)" }}
                  >
                    {t("proposeTask.fields.minimumLevel.label")}
                  </span>
                  <FilterLevelNodes
                    levels={LEVEL_OPTIONS}
                    value={levelRequired}
                    onChange={setLevelRequired}
                  />
                  <span
                    className="eyebrow"
                    style={{ display: "block", marginTop: "var(--space-xs)" }}
                  >
                    {t("proposeTask.fields.minimumLevel.hint")}
                  </span>
                </div>
              </div>

              {canProposeMetatask && (
                <div
                  style={{
                    borderTop: "1px dashed var(--color-border)",
                    paddingTop: "var(--space-md)",
                    marginTop: "var(--space-xs)",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-sm)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isMetaTask}
                      onChange={(e) => setIsMetaTask(e.target.checked)}
                      style={{
                        accentColor: color,
                        width: 14,
                        height: 14,
                        cursor: "pointer",
                      }}
                    />
                    <span
                      className="content-text font-body"
                      style={{
                        color: "var(--color-text-primary)",
                        fontWeight: isMetaTask ? 700 : 400,
                      }}
                    >
                      {t("proposeTask.metaToggle.label")}
                    </span>
                    <span
                      className="eyebrow"
                      style={{
                        color: "var(--color-text-tertiary)",
                      }}
                    >
                      {t("proposeTask.metaToggle.hint", {
                        faction:
                          factionSlug !== "na" ? factionName(factionSlug) : "",
                      })}
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Notes to Admin (§20.5) — hidden for meta tasks */}
            {!isMetaTask && (
              <div style={{ marginBottom: "var(--space-lg)" }}>
                <span
                  className="eyebrow"
                  style={{ display: "block", marginBottom: "var(--space-sm)" }}
                >
                  {t("proposeTask.fields.notes.label")}
                </span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={submitting}
                  placeholder={t("proposeTask.fields.notes.placeholder")}
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
                  background: factionCssVar(factionSlug, "light"),
                  border: `1.5px solid ${factionCssVar(factionSlug, "border")}`,
                  borderRadius: 8,
                  padding: "var(--space-md) var(--space-lg)",
                  marginBottom: "var(--space-lg)",
                }}
              >
                <span
                  className="eyebrow"
                  style={{ color, marginBottom: "var(--space-xs)", display: "block" }}
                >
                  {isMetaTask
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
                  {isMetaTask ? (
                    <span
                      className="eyebrow"
                      style={{ color: "var(--color-success)" }}
                    >
                      {t("proposeTask.preview.bonusPoints", {
                        points: metaBonusValue || "?",
                      })}
                    </span>
                  ) : (
                    <span className="eyebrow">
                      {t("proposeTask.preview.points", {
                        points: pointValue || "?",
                      })}
                    </span>
                  )}
                  <span className="eyebrow">
                    {t("proposeTask.preview.level", {
                      level: levelRequired === "" ? 0 : levelRequired,
                    })}
                  </span>
                  {!isMetaTask && (
                    <span className="eyebrow" style={{ color }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: color,
                  color: "var(--color-text-on-accent)",
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: "var(--text-lg)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  padding: "var(--space-md) var(--space-xl)",
                  border: "none",
                  cursor: submitting ? "wait" : "pointer",
                  position: "relative",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                <span
                  style={submitDashStyle}
                />
                {submitting
                  ? t("proposeTask.submit.busy")
                  : isMetaTask
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
              <span
                className="content-text font-body"
                style={submitNoteStyle}
              >
                {t("proposeTask.submit.note")}
              </span>
            </div>
          </form>
        </div>

        {/* ── Right: Tips Column (§20.8) ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          <div className="sidebar-card" style={{ padding: "var(--space-md) var(--space-lg)" }}>
            <p className="eyebrow mb-2">
              {t("proposeTask.tips.goodTaskHeading")}
            </p>
            <ul
              className="content-text font-body"
              style={tipsListStyle}
            >
              {(
                t("proposeTask.tips.goodTaskItems", {
                  returnObjects: true,
                }) as string[]
              ).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="sidebar-card" style={{ padding: "var(--space-md) var(--space-lg)" }}>
            <p className="eyebrow mb-2">{t("proposeTask.tips.nextHeading")}</p>
            <p
              className="content-text font-body"
              style={tipsBodyStyle}
            >
              {t("proposeTask.tips.nextBody")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

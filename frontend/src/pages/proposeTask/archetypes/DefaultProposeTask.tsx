import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageTitle from "../../../components/ui/PageTitle";
import FilterLevelNodes from "../../../components/ui/FilterLevelNodes";
import { factionCssVar, factionName, getAllFactions } from "../../../utils/factions";
import type { ProposeTaskState } from "../useProposeTask";

const LEVEL_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

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
          style={{ padding: 24, textAlign: "center" }}
        >
          {isMetaTask ? (
            <>
              <p
                className="font-display italic"
                style={{ fontSize: 22, color, marginBottom: 6 }}
              >
                {t("proposeTask.successMeta.heading")}
              </p>
              <p
                className="font-body"
                style={{ fontSize: 10, color: "var(--color-text-secondary)" }}
              >
                {t("proposeTask.successMeta.body", {
                  faction: factionName(factionSlug),
                })}
              </p>
            </>
          ) : (
            <>
              <p
                className="font-display italic"
                style={{ fontSize: 22, color, marginBottom: 6 }}
              >
                {t("proposeTask.successTask.heading")}
              </p>
              <p
                className="font-body"
                style={{ fontSize: 10, color: "var(--color-text-secondary)" }}
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
        style={{
          fontSize: 9,
          letterSpacing: "0.1em",
          color: "var(--color-text-tertiary)",
        }}
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
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* ── Left: Form ── */}
        <div>
          {/* Faction Selector (§20.2) */}
          <div style={{ marginBottom: 16 }}>
            <span
              className="eyebrow"
              style={{ display: "block", marginBottom: 8 }}
            >
              {t("proposeTask.factionSelectorLabel")}
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
                      padding: "8px 14px",
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
                        fontSize: 8,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        padding: "2px 10px",
                        textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                        marginBottom: 4,
                      }}
                    >
                      {factionName(slug)}
                    </span>
                    <span className="eyebrow" style={{ fontSize: 7 }}>
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
                padding: "18px 20px",
                marginBottom: 16,
              }}
            >
              {/* Task Name (§20.4) */}
              <div style={{ marginBottom: 16 }}>
                <span
                  className="eyebrow"
                  style={{ display: "block", marginBottom: 6 }}
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
                    fontSize: 22,
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    background: "transparent",
                    border: "none",
                    borderBottom: `2px solid ${title ? color : "var(--color-border-strong)"}`,
                    outline: "none",
                    paddingBottom: 6,
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
                  style={{ fontSize: 7, marginTop: 4 }}
                >
                  {title.length}/200
                </span>
                {title.length >= 200 && (
                  <span
                    className="font-body"
                    style={{
                      fontSize: 10,
                      color: "#dc2626",
                      display: "block",
                      marginTop: 2,
                    }}
                  >
                    {t("proposeTask.fields.name.tooLong")}
                  </span>
                )}
              </div>

              {/* Description (§20.4) */}
              <div style={{ marginBottom: 16 }}>
                <span
                  className="eyebrow"
                  style={{ display: "block", marginBottom: 6 }}
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
                  style={{
                    width: "100%",
                    fontFamily: "'Courier Prime', monospace",
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: "var(--color-text-primary)",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    resize: "vertical",
                    minHeight: 120,
                  }}
                />
                <span
                  className={`eyebrow self-end ${description.length >= 4500 ? "text-red-600" : ""}`}
                  style={{ fontSize: 7, marginTop: 4 }}
                >
                  {description.length}/5000
                </span>
                {description.length >= 5000 && (
                  <span
                    className="font-body"
                    style={{
                      fontSize: 10,
                      color: "#dc2626",
                      display: "block",
                      marginTop: 2,
                    }}
                  >
                    {t("proposeTask.fields.description.tooLong")}
                  </span>
                )}
              </div>

              {/* Suggested Difficulty (§20.4) */}
              <div
                style={{
                  display: "flex",
                  gap: 24,
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                {!isMetaTask && (
                  <div>
                    <span
                      className="eyebrow"
                      style={{ display: "block", marginBottom: 6 }}
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
                      style={{
                        width: 80,
                        fontFamily: "'Courier Prime', monospace",
                        fontSize: 20,
                        fontWeight: 700,
                        color: "var(--color-text-primary)",
                        background: "transparent",
                        border: "none",
                        borderBottom: "2px solid var(--color-border-strong)",
                        outline: "none",
                        textAlign: "center",
                      }}
                    />
                    <span
                      className="eyebrow"
                      style={{ display: "block", marginTop: 4, fontSize: 7 }}
                    >
                      {t("proposeTask.fields.basePoints.hint")}
                    </span>
                  </div>
                )}
                {isMetaTask && (
                  <div>
                    <span
                      className="eyebrow"
                      style={{ display: "block", marginBottom: 6 }}
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
                      style={{
                        width: 80,
                        fontFamily: "'Courier Prime', monospace",
                        fontSize: 20,
                        fontWeight: 700,
                        color: "var(--color-text-primary)",
                        background: "transparent",
                        border: "none",
                        borderBottom: `2px solid ${color}`,
                        outline: "none",
                        textAlign: "center",
                      }}
                    />
                    <span
                      className="eyebrow"
                      style={{ display: "block", marginTop: 4, fontSize: 7 }}
                    >
                      {t("proposeTask.fields.bonusPoints.hint")}
                    </span>
                  </div>
                )}
                <div>
                  <span
                    className="eyebrow"
                    style={{ display: "block", marginBottom: 6 }}
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
                    style={{ display: "block", marginTop: 4, fontSize: 7 }}
                  >
                    {t("proposeTask.fields.minimumLevel.hint")}
                  </span>
                </div>
              </div>

              {canProposeMetatask && (
                <div
                  style={{
                    borderTop: "1px dashed var(--color-border)",
                    paddingTop: 12,
                    marginTop: 4,
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
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
                      className="font-body"
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-primary)",
                        fontWeight: isMetaTask ? 700 : 400,
                      }}
                    >
                      {t("proposeTask.metaToggle.label")}
                    </span>
                    <span
                      className="eyebrow"
                      style={{
                        fontSize: 7,
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
              <div style={{ marginBottom: 16 }}>
                <span
                  className="eyebrow"
                  style={{ display: "block", marginBottom: 6 }}
                >
                  {t("proposeTask.fields.notes.label")}
                </span>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={submitting}
                  placeholder={t("proposeTask.fields.notes.placeholder")}
                  style={{
                    width: "100%",
                    fontFamily: "'Courier Prime', monospace",
                    fontSize: 11,
                    color: "var(--color-text-primary)",
                    background: "transparent",
                    border: "1px solid var(--color-border)",
                    borderRadius: 6,
                    padding: "0.6rem 0.7rem",
                    outline: "none",
                    resize: "vertical",
                  }}
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
                  padding: "10px 14px",
                  marginBottom: 16,
                }}
              >
                <span
                  className="eyebrow"
                  style={{ color, marginBottom: 4, display: "block" }}
                >
                  {isMetaTask
                    ? t("proposeTask.preview.metaHeading", { faction: fname })
                    : t("proposeTask.preview.taskHeading", { faction: fname })}
                </span>
                <p
                  className="font-body"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    marginBottom: 2,
                  }}
                >
                  {title}
                </p>
                {description && (
                  <p
                    className="font-body"
                    style={{
                      fontSize: 9,
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
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
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
                className="font-body"
                style={{
                  fontSize: 10,
                  color: "var(--color-danger)",
                  marginBottom: 12,
                }}
              >
                {error}
              </p>
            )}

            {/* Submit Row (§20.7) */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: color,
                  color: "var(--color-text-on-accent)",
                  fontFamily: "'Courier Prime', monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  padding: "10px 24px",
                  border: "none",
                  cursor: submitting ? "wait" : "pointer",
                  position: "relative",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    inset: 3,
                    border: "1px dashed rgba(255,255,255,0.25)",
                    pointerEvents: "none",
                  }}
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
                style={{ fontSize: 10, padding: "8px 16px" }}
              >
                {t("proposeTask.submit.cancel")}
              </button>
              <span
                className="font-body"
                style={{
                  fontSize: 8,
                  color: "var(--color-text-tertiary)",
                  marginLeft: "auto",
                }}
              >
                {t("proposeTask.submit.note")}
              </span>
            </div>
          </form>
        </div>

        {/* ── Right: Tips Column (§20.8) ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="sidebar-card" style={{ padding: "14px 16px" }}>
            <p className="eyebrow mb-2">
              {t("proposeTask.tips.goodTaskHeading")}
            </p>
            <ul
              className="font-body"
              style={{
                fontSize: 9,
                color: "var(--color-text-primary)",
                lineHeight: 1.6,
                paddingLeft: 14,
                listStyleType: "disc",
              }}
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

          <div className="sidebar-card" style={{ padding: "14px 16px" }}>
            <p className="eyebrow mb-2">{t("proposeTask.tips.nextHeading")}</p>
            <p
              className="font-body"
              style={{
                fontSize: 9,
                color: "var(--color-text-secondary)",
                lineHeight: 1.6,
              }}
            >
              {t("proposeTask.tips.nextBody")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

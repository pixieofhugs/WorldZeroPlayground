/**
 * Tiny presentational helpers shared across the seven archetypes. Kept here
 * so the archetype files stay focused on their own visual treatment.
 */
import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";
import LevelPill from "../../../components/ui/LevelPill";
import { factionCssVar, factionName } from "../../../utils/factions";
import type { TaskOut } from "../../../api/tasks";
import type { PraxisOut } from "../../../api/praxis";

const RAINBOW_VARS = [
  "var(--underline-1)",
  "var(--underline-2)",
  "var(--underline-3)",
  "var(--underline-4)",
  "var(--underline-5)",
  "var(--underline-6)",
];

interface RainbowTitleProps {
  text: string;
  size?: number;
  fontFamily?: string;
  color?: string;
}

/**
 * The page title rendered as the brand's signature six-color underline. Each
 * character gets its own underline tile so the cycle works regardless of
 * justification or wrapping. Callers pass the (localized) text.
 */
export function RainbowTitle({
  text,
  size = 38,
  fontFamily = "'Lora', serif",
  color = "var(--color-text-primary)",
}: RainbowTitleProps) {
  return (
    <span
      style={{
        fontFamily,
        fontStyle: "italic",
        fontWeight: 500,
        fontSize: size,
        lineHeight: 1.05,
        color,
        display: "inline-block",
      }}
    >
      {text.split("").map((character, index) =>
        character === " " ? (
          <span
            key={index}
            style={{ display: "inline-block", width: "0.3em" }}
          />
        ) : (
          <span
            key={index}
            style={{
              borderBottom: `4px solid ${RAINBOW_VARS[index % RAINBOW_VARS.length]}`,
              paddingBottom: 2,
            }}
          >
            {character}
          </span>
        ),
      )}
    </span>
  );
}

interface BreadcrumbProps {
  praxisId: number | string;
  taskId: number;
  taskTitle: string;
  style?: CSSProperties;
  inkColor?: string;
}

export function Breadcrumb({
  praxisId,
  taskId,
  taskTitle,
  style,
  inkColor,
}: BreadcrumbProps) {
  const { t } = useTranslation("forms");
  const tone = inkColor ?? "var(--color-text-tertiary)";
  return (
    <nav
      className="font-body"
      style={{
        fontSize: 9,
        letterSpacing: "0.1em",
        color: tone,
        marginBottom: 12,
        ...style,
      }}
    >
      <Link to="/tasks" style={{ color: "inherit", textDecoration: "none" }}>
        {t("breadcrumb.tasks")}
      </Link>
      <span> &rsaquo; </span>
      <Link
        to={`/tasks/${taskId}`}
        style={{ color: "inherit", textDecoration: "none" }}
      >
        {taskTitle}
      </Link>
      <span> &rsaquo; </span>
      <Link
        to={`/praxes/${praxisId}`}
        style={{ color: "inherit", textDecoration: "none" }}
      >
        {t("breadcrumb.praxis")}
      </Link>
      <span> &rsaquo; </span>
      <span style={{ color: "inherit", fontWeight: 700 }}>
        {t("breadcrumb.edit")}
      </span>
    </nav>
  );
}

interface TaskHeaderInfoProps {
  praxis: PraxisOut;
  task: TaskOut | null;
  showLevelPill?: boolean;
  textColor?: string;
}

/**
 * Re-usable inline meta line for any archetype that wants a compact
 * faction · pts · level summary next to the proven task title.
 */
export function TaskMetaInline({
  praxis,
  task,
  showLevelPill = true,
  textColor,
}: TaskHeaderInfoProps) {
  const { t } = useTranslation("forms");
  const slug = task?.primary_faction_slug ?? null;
  return (
    <span
      style={{
        display: "inline-flex",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap",
        fontFamily: "'Courier Prime', monospace",
        fontSize: 9,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: textColor ?? factionCssVar(slug),
      }}
    >
      <span>{factionName(slug)}</span>
      {task && (
        <span>· {t("taskMeta.points", { points: task.point_value })}</span>
      )}
      {task && showLevelPill && <LevelPill level={task.level_required} />}
      {(praxis.type === "collab" || praxis.duel_id != null) && (
        <span>
          ·{" "}
          {praxis.duel_id != null
            ? t("taskMeta.duel")
            : t("taskMeta.collab")}
        </span>
      )}
    </span>
  );
}

interface TitleCounterProps {
  length: number;
  color?: string;
}

export function TitleCounter({ length, color }: TitleCounterProps) {
  const isDanger = length >= 180;
  return (
    <span
      className="eyebrow"
      style={{
        fontSize: 8,
        color: isDanger
          ? "var(--color-danger)"
          : (color ?? "var(--color-text-tertiary)"),
      }}
    >
      {length}/200
    </span>
  );
}

interface RainbowUnderlineProps {
  height?: number;
  opacity?: number;
}

export function RainbowUnderline({
  height = 3,
  opacity = 0.6,
}: RainbowUnderlineProps) {
  return (
    <div style={{ display: "flex", height, marginTop: 4, opacity }}>
      {RAINBOW_VARS.map((color, index) => (
        <div key={index} style={{ flex: 1, background: color }} />
      ))}
    </div>
  );
}

interface ErrorBannerProps {
  message: string;
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div
      className="font-body"
      style={{
        fontSize: 11,
        color: "var(--color-danger)",
        marginTop: 8,
        padding: "8px 12px",
        background: "rgba(220,38,38,0.08)",
        border: "1px solid rgba(220,38,38,0.25)",
      }}
    >
      {message}
    </div>
  );
}

interface SectionProps {
  children: ReactNode;
  style?: CSSProperties;
}

export function ArchetypeFrame({ children, style }: SectionProps) {
  return (
    <div
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "24px 16px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function formatAutosave(date: Date | null): string {
  if (!date) return "";
  const now = Date.now();
  const ago = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (ago < 5) return i18n.t("forms:autosaveAgo.justNow");
  if (ago < 60) return i18n.t("forms:autosaveAgo.seconds", { seconds: ago });
  const minutes = Math.round(ago / 60);
  return i18n.t("forms:autosaveAgo.minutes", { minutes });
}

export function formatClock(date: Date | null): string {
  if (!date) return "--:--:--";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

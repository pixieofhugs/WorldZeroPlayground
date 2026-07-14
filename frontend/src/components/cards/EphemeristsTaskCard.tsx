import { Link } from "react-router-dom";
import { Trans } from "react-i18next";
import type { TaskOut } from "../../api/tasks";
import i18n from "../../i18n";
import { EphEyebrow, LapisLastWord, toRoman } from "./ephemeristsAtoms";

/**
 * The Ephemerists — THE DISCORDANT MAP (task card, ephemerists slug).
 * One place, three irreconcilable coordinate grids (cartesian, perspective,
 * polar) all claim the same sheet and disagree about where the point is.
 * House-of-Leaves apparatus crawls the margin; one title word is pulled into
 * the lapis-blue; a self-referential footnote points back at itself.
 * Colors via the --eph-* / --faction-ephemerists-* tokens (theme-aware).
 */

interface Props {
  task: TaskOut;
  displayPoints: number;
  onSignup?: (id: number) => void;
}

export default function EphemeristsTaskCard({ task, displayPoints, onSignup }: Props) {
  return (
    <div
      style={{
        width: 214,
        minHeight: 300,
        flex: "0 1 214px",
        position: "relative",
        overflow: "hidden",
        background: "var(--eph-vellum)",
        color: "var(--eph-vellum-text)",
        border: "1.5px solid var(--eph-ink)",
        fontFamily: "var(--eph-serif)",
        display: "flex",
        flexDirection: "column",
        transition: "background 150ms, color 150ms",
      }}
    >
      <div style={{ position: "relative", zIndex: 5, padding: "9px 0 4px" }}>
        <EphEyebrow motto={i18n.t("feed:taskCard.ephemerists.motto")} dark />
      </div>

      {/* The contested field — three grids disagreeing about one point */}
      <div
        style={{
          position: "relative",
          flex: 1,
          minHeight: 188,
          margin: "2px 4px",
          border: "1px solid var(--eph-gold-deep)",
          overflow: "hidden",
        }}
      >
        {/* cartesian — keyed to vellum-text so it stays legible in dark */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.5,
            backgroundImage:
              "repeating-linear-gradient(0deg, color-mix(in srgb, var(--eph-vellum-text) 26%, transparent) 0 1px, transparent 1px 16px), repeating-linear-gradient(90deg, color-mix(in srgb, var(--eph-vellum-text) 26%, transparent) 0 1px, transparent 1px 16px)",
          }}
        />
        {/* perspective grid */}
        <svg
          viewBox="0 0 200 188"
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.7 }}
          aria-hidden="true"
        >
          <g stroke="var(--eph-lapis)" strokeWidth="0.9" fill="none">
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={i} x1={i * 20} y1="188" x2="122" y2="40" />
            ))}
            {[60, 96, 124, 146, 163, 176].map((y, i) => (
              <line key={i} x1="0" y1={y} x2="200" y2={y} />
            ))}
          </g>
        </svg>
        {/* polar */}
        <svg
          viewBox="0 0 200 188"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.72 }}
          aria-hidden="true"
        >
          <g stroke="var(--eph-rubric)" strokeWidth="0.8" fill="none">
            {[16, 34, 54, 76].map((r, i) => (
              <circle key={i} cx="122" cy="88" r={r} />
            ))}
            {Array.from({ length: 12 }).map((_, i) => (
              <line
                key={i}
                x1="122"
                y1="88"
                x2={122 + 80 * Math.cos((i * Math.PI) / 6)}
                y2={88 + 80 * Math.sin((i * Math.PI) / 6)}
              />
            ))}
          </g>
        </svg>
        {/* the disputed point */}
        <div style={{ position: "absolute", left: "61%", top: "47%", transform: "translate(-50%,-50%)", zIndex: 4 }}>
          <div
            className="eph-twinkle"
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: "var(--eph-gold-light)",
              boxShadow: "0 0 10px 3px color-mix(in srgb, var(--eph-gold-light) 70%, transparent)",
            }}
          />
        </div>
        {/* three coordinate labels for one point — and none agree */}
        <div style={{ position: "absolute", top: "8%", left: "6%", fontSize: 7.5, letterSpacing: "0.04em", color: "var(--eph-vellum-text)", background: "color-mix(in srgb, var(--eph-vellum) 82%, transparent)", padding: "1px 4px" }}>
          {i18n.t("feed:taskCard.ephemerists.coordXPrefix")}<span style={{ textDecoration: "line-through", opacity: 0.65 }}>8</span>{" "}
          <span style={{ color: "var(--eph-lapis)", fontStyle: "italic" }}>9</span>
        </div>
        <div style={{ position: "absolute", top: "78%", left: "54%", fontSize: 7.5, letterSpacing: "0.04em", color: "var(--eph-rubric)", background: "color-mix(in srgb, var(--eph-vellum) 82%, transparent)", padding: "1px 4px" }}>
          {i18n.t("feed:taskCard.ephemerists.coordPolar")}
        </div>
        <div style={{ position: "absolute", top: "6%", left: "68%", fontSize: 7.5, letterSpacing: "0.04em", color: "var(--eph-lapis)", background: "color-mix(in srgb, var(--eph-vellum) 82%, transparent)", padding: "1px 4px" }}>
          {i18n.t("feed:taskCard.ephemerists.vanishingLabel")}
        </div>
        {/* marginal apparatus climbing the gutter */}
        <div style={{ position: "absolute", left: 2, bottom: 7, transformOrigin: "left bottom", transform: "rotate(-90deg)", whiteSpace: "nowrap", fontSize: 6, letterSpacing: "0.05em", color: "var(--eph-muted)", opacity: 0.85 }}>
          {i18n.t("feed:taskCard.ephemerists.marginalia")}
        </div>
      </div>

      {/* Legend / title */}
      <div style={{ position: "relative", zIndex: 5, padding: "8px 14px 10px", textAlign: "center" }}>
        <Link to={`/tasks/${task.id}`} style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ fontFamily: "var(--eph-display)", fontWeight: 700, fontSize: 22, lineHeight: 0.94 }}>
            <LapisLastWord text={task.title} footnote />
          </div>
        </Link>
        {task.description && (
          <div
            style={{
              fontSize: 8.5,
              lineHeight: 1.45,
              fontStyle: "italic",
              color: "var(--eph-muted)",
              margin: "4px 0 6px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {task.description}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontSize: 7.5 }}>
          <span style={{ color: "var(--eph-vellum-text)" }}>
            ▦ {i18n.t("feed:taskCard.ephemerists.grade", { grade: toRoman(task.level_required) })}
          </span>
          <span style={{ color: "var(--eph-gold-deep)" }}>·</span>
          <span style={{ fontFamily: "var(--eph-display)", fontWeight: 700, fontSize: 13, color: "var(--eph-rubric)" }}>
            {i18n.t("feed:taskCard.ephemerists.points", { points: displayPoints })}
          </span>
        </div>
        <div style={{ fontSize: 6.5, fontStyle: "italic", color: "var(--eph-muted)", marginTop: 6, lineHeight: 1.35 }}>
          {/* The self-referential footnote is one <Trans> unit; "see †" is tag <1>. */}
          <Trans
            ns="feed"
            i18nKey="taskCard.ephemerists.footnote"
            components={{ 1: <span style={{ color: "var(--eph-lapis)" }} /> }}
          />
        </div>
      </div>

      {onSignup && (
        <button
          onClick={() => onSignup(task.id)}
          style={{
            fontFamily: "var(--eph-serif)",
            fontSize: 9,
            letterSpacing: "0.12em",
            fontStyle: "italic",
            padding: "7px 10px",
            border: "none",
            cursor: "pointer",
            width: "100%",
            background: "var(--eph-ink)",
            color: "var(--eph-parchment)",
            position: "relative",
            zIndex: 6,
          }}
        >
          {i18n.t("feed:taskCard.ephemerists.signup")}
        </button>
      )}
    </div>
  );
}

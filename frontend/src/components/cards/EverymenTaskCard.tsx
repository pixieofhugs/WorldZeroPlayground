import { Link } from "react-router-dom";
import type { TaskOut } from "../../api/tasks";
import i18n from "../../i18n";
import LevelPill from "../ui/LevelPill";

/**
 * Everymen — "The Rally Bill".
 * Union / WW2 victory-poster: red masthead with cog sigils, cream poster body,
 * faint sunburst + halftone wash, rubber-stamped points seal, "Report for duty"
 * call to action wired to onSignup.
 */

interface Props {
  task: TaskOut;
  displayPoints: number;
  onSignup?: (id: number) => void;
}

/* ── poster atoms (self-contained) ─────────────────────────────── */

// worker cog / gear sigil — the faction mark.
function CogMark({
  size = 22,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: "block" }}
    >
      <g fill={color}>
        {Array.from({ length: 8 }).map((_, index) => (
          <rect
            key={index}
            x="11"
            y="0.5"
            width="2"
            height="5"
            rx="0.5"
            transform={`rotate(${index * 45} 12 12)`}
          />
        ))}
      </g>
      <circle cx="12" cy="12" r="6.5" fill="none" stroke={color} strokeWidth="2.4" />
      <circle cx="12" cy="12" r="2" fill={color} />
    </svg>
  );
}

// faint screen-print halftone wash.
function Halftone({
  color = "var(--everymen-ink)",
  opacity = 0.07,
  size = 4,
}: {
  color?: string;
  opacity?: number;
  size?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity,
        backgroundImage: `radial-gradient(${color} 0.6px, transparent 0.7px)`,
        backgroundSize: `${size}px ${size}px`,
        zIndex: 1,
      }}
    />
  );
}

// radiating poster rays from an origin point.
function Sunburst({
  color = "var(--everymen-red)",
  from = "50% 0%",
  opacity = 0.1,
  step = 7,
}: {
  color?: string;
  from?: string;
  opacity?: number;
  step?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity,
        zIndex: 0,
        background: `repeating-conic-gradient(from 0deg at ${from}, ${color} 0deg ${step}deg, transparent ${step}deg ${step * 2}deg)`,
      }}
    />
  );
}

// little center ornament rule.
function RuleDiamond({ color = "var(--everymen-red)" }: { color?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        justifyContent: "center",
        margin: "7px 0",
      }}
    >
      <div style={{ height: 1.5, flex: 1, background: color }} />
      <div style={{ width: 5, height: 5, background: color, transform: "rotate(45deg)" }} />
      <div style={{ height: 1.5, flex: 1, background: color }} />
    </div>
  );
}

// rubber-stamped circular points seal.
function PointsSeal({
  points,
  color = "var(--everymen-red)",
  rotate = -9,
  size = 52,
}: {
  points: number;
  color?: string;
  rotate?: number;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${color}`,
        boxShadow: `inset 0 0 0 2px ${color}`,
        color,
        transform: `rotate(${rotate}deg)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
        opacity: 0.92,
        mixBlendMode: "multiply",
      }}
    >
      <span style={{ fontFamily: "var(--faction-everymen-card-font)", fontSize: size * 0.42 }}>
        {points}
      </span>
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 6,
          letterSpacing: "0.18em",
          marginTop: 1,
        }}
      >
        {i18n.t("feed:taskCard.everymen.sealUnit")}
      </span>
    </div>
  );
}

/* ── card ───────────────────────────────────────────────────────── */

export default function EverymenTaskCard({ task, displayPoints, onSignup }: Props) {
  return (
    <div
      style={{
        maxWidth: 206,
        flex: "0 1 206px",
        background: "var(--everymen-paper)",
        color: "var(--everymen-ink)",
        border: "1.5px solid var(--everymen-ink)",
        boxShadow:
          "0 0 0 3px var(--everymen-paper), 0 0 0 4px var(--everymen-ink)",
        position: "relative",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* masthead */}
      <div
        style={{
          background: "var(--everymen-red)",
          borderBottom: "2px solid var(--everymen-gold)",
          padding: "7px 8px 6px",
          textAlign: "center",
        }}
      >
        <div
          className="card-meta"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            color: "var(--everymen-cream)",
            whiteSpace: "nowrap",
            fontFamily: "var(--font-body)",
          }}
        >
          <CogMark size={11} color="var(--everymen-cream)" />
          <span
            style={{
              fontFamily: "var(--faction-everymen-card-font)",
              fontSize: 14,
              letterSpacing: "0.07em",
            }}
          >
            {i18n.t("feed:taskCard.everymen.masthead")}
          </span>
          <CogMark size={11} color="var(--everymen-cream)" />
        </div>
      </div>

      {/* body */}
      <div style={{ position: "relative", padding: "13px 14px 12px", overflow: "hidden" }}>
        <Sunburst opacity={0.08} step={6} />
        <Halftone />
        <div style={{ position: "relative", zIndex: 2 }}>
          <Link to={`/tasks/${task.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div
              style={{
                fontFamily: "var(--faction-everymen-card-font)",
                fontSize: 32,
                lineHeight: 0.98,
                textAlign: "center",
                letterSpacing: "0.01em",
                overflowWrap: "anywhere",
              }}
            >
              {task.title}
            </div>
          </Link>
          <RuleDiamond />
          {task.description && (
            <div
              className="card-description"
              style={{
                fontSize: 8,
                lineHeight: 1.55,
                textAlign: "center",
                color: "var(--everymen-muted)",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {task.description}
            </div>
          )}
        </div>
      </div>

      {/* dispatch strip */}
      <div
        className="card-footer"
        style={{
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "0 14px 12px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <LevelPill level={task.level_required} factionSlug="everymen" />
          <span
            style={{
              fontFamily: "var(--faction-everymen-card-font)",
              fontSize: 13,
              color: "var(--everymen-red)",
            }}
          >
            {i18n.t("feed:taskCard.everymen.points", { points: displayPoints })}
          </span>
        </div>
        <PointsSeal points={displayPoints} />
      </div>

      {onSignup && (
        <button
          onClick={() => onSignup(task.id)}
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 8,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            padding: "6px 10px",
            border: "none",
            cursor: "pointer",
            background: "var(--everymen-ink)",
            color: "var(--everymen-paper)",
            width: "100%",
          }}
        >
          {i18n.t("feed:taskCard.everymen.signup")}
        </button>
      )}
    </div>
  );
}

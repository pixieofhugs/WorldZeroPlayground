import { Link } from "react-router-dom";
import type { TaskOut } from "../../api/tasks";
import i18n from "../../i18n";
import LevelPill from "../ui/LevelPill";
import SnideMasthead from "./SnideMasthead";

/**
 * S.N.I.D.E. — Ransom Dispatch.
 * Photocopier-black demand note taped to the wall: acid masthead, cut-out
 * ransom-letter title, pink scrawl, halftone screen. Loudest card in the grid.
 * Visuals only — same prop contract as the other faction cards.
 */

interface Props {
  task: TaskOut;
  displayPoints: number;
  onSignup?: (id: number) => void;
}

/** Mismatched cut-out letters — bg/colour/face/tilt picked deterministically per char. */
const RANSOM_STYLES = [
  {
    bg: "var(--faction-snide-paper)",
    col: "var(--faction-snide-ink)",
    font: "var(--faction-snide-font-impact)",
    rot: -5,
  },
  {
    bg: "var(--faction-snide-ink)",
    col: "var(--faction-snide-acid)",
    font: "var(--faction-snide-font-cond)",
    rot: 4,
  },
  {
    bg: "var(--faction-snide-pink)",
    col: "#fff",
    font: "var(--faction-snide-font-black)",
    rot: -3,
  },
  {
    bg: "var(--faction-snide-acid)",
    col: "var(--faction-snide-ink)",
    font: "var(--faction-snide-font-impact)",
    rot: 6,
  },
  {
    bg: "var(--faction-snide-paper)",
    col: "var(--faction-snide-ink)",
    font: "var(--font-display)",
    rot: 2,
    italic: true,
  },
  {
    bg: "var(--faction-snide-ink)",
    col: "#fff",
    font: "var(--faction-snide-font-cond)",
    rot: -6,
  },
];

function Ransom({ text, size = 22 }: { text: string; size?: number }) {
  return (
    <span
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        gap: "4px 3px",
        alignItems: "center",
      }}
    >
      {[...text].map((char, index) => {
        if (char === " ")
          return <span key={index} style={{ width: size * 0.22 }} />;
        const style =
          RANSOM_STYLES[(char.charCodeAt(0) + index * 3) % RANSOM_STYLES.length];
        return (
          <span
            key={index}
            style={{
              display: "inline-block",
              background: style.bg,
              color: style.col,
              fontFamily: style.font,
              fontStyle: style.italic ? "italic" : "normal",
              fontSize: size,
              lineHeight: 0.92,
              padding: "2px 5px 0",
              transform: `rotate(${style.rot}deg)`,
              boxShadow: "1.5px 2.5px 0 rgba(0,0,0,0.4)",
              textTransform: "uppercase",
            }}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}

export default function SNIDETaskCard({
  task,
  displayPoints,
  onSignup,
}: Props) {
  return (
    <div
      style={{
        minWidth: 212,
        maxWidth: 272,
        flex: "0 1 248px",
        position: "relative",
        background: "var(--faction-snide-card-bg)",
        color: "var(--faction-snide-card-text)",
        padding: "26px 18px 18px",
        fontFamily: "var(--font-body)",
        overflow: "hidden",
        boxShadow: "6px 8px 0 rgba(0,0,0,0.28)",
        transform: "rotate(-1deg)",
        transition: "background 150ms, color 150ms",
      }}
    >
      {/* halftone dot screen (acid tint) */}
      <div
        className="ht-dots"
        style={{
          position: "absolute",
          inset: 0,
          color: "rgba(182,255,46,0.09)",
          pointerEvents: "none",
        }}
      />

      {/* masthead */}
      <SnideMasthead
        subtitle={i18n.t("feed:taskCard.snide.dispatchNumber", {
          number: String(task.id).padStart(4, "0"),
        })}
        size={14}
      />

      {/* pink scrawl */}
      <div
        style={{
          position: "relative",
          fontFamily: "var(--faction-snide-font-marker)",
          fontSize: 11,
          color: "var(--faction-snide-pink)",
          transform: "rotate(-1.5deg)",
          marginBottom: 8,
        }}
      >
        {i18n.t("feed:taskCard.snide.scrawl")}
      </div>

      {/* ransom-letter title */}
      <Link
        to={`/tasks/${task.id}`}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <div style={{ position: "relative", margin: "4px 0 12px" }}>
          <Ransom text={task.title} size={22} />
        </div>
      </Link>

      {task.description && (
        <p
          style={{
            position: "relative",
            fontSize: 10,
            lineHeight: 1.5,
            color: "var(--faction-snide-card-muted)",
            margin: "0 0 14px",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          }}
        >
          {task.description}
        </p>
      )}

      {onSignup && (
        <button
          onClick={() => onSignup(task.id)}
          style={{
            position: "relative",
            background: "var(--faction-snide-pink)",
            color: "#fff",
            fontFamily: "var(--faction-snide-font-black)",
            fontSize: 11,
            padding: "6px 12px",
            border: "none",
            cursor: "pointer",
            transform: "rotate(-2deg)",
            boxShadow: "2px 3px 0 rgba(0,0,0,0.4)",
            marginBottom: 12,
          }}
        >
          {i18n.t("feed:taskCard.snide.signup")}
        </button>
      )}

      {/* footer: points + level */}
      <div className="card-footer" style={{ position: "relative" }}>
        <span
          style={{
            fontFamily: "var(--faction-snide-font-impact)",
            fontSize: 18,
            letterSpacing: "0.04em",
            color: "var(--faction-snide-acid)",
          }}
        >
          {displayPoints}
          <span style={{ fontSize: 9, marginLeft: 3 }}>
            {i18n.t("feed:taskCard.snide.pointsUnit")}
          </span>
        </span>
        <LevelPill level={task.level_required} factionSlug="snide" />
      </div>

      {/* scotch tape */}
      <div
        className="snide-tape"
        style={{ top: -11, left: 28, transform: "rotate(-8deg)" }}
      />
      <div
        className="snide-tape"
        style={{ top: -9, right: 22, transform: "rotate(7deg)" }}
      />
    </div>
  );
}
